import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/accounts - List supplier accounts with balances
export async function getAccounts(req, res) {
  try {
    const { supplier_id, status } = req.query;
    let query = `
      SELECT sa.*,
             ss.name as supplier_name, ss.supplier_code
      FROM supply_accounts sa
      LEFT JOIN supply_suppliers ss ON sa.supplier_id = ss.id
      WHERE sa.deleted_at IS NULL`;
    const params = [];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND sa.supplier_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND sa.status = $${params.length}`;
    }

    query += ` ORDER BY ss.name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supply/accounts/:id/ledger - Get ledger transactions for an account
export async function getAccountLedger(req, res) {
  try {
    const { id } = req.params;
    const { from_date, to_date } = req.query;
    let query = `
      SELECT sal.*,
             ss.name as supplier_name
      FROM supply_account_ledger sal
      LEFT JOIN supply_suppliers ss ON sal.supplier_id = ss.id
      WHERE sal.account_id = $1`;
    const params = [id];

    if (from_date) {
      params.push(from_date);
      query += ` AND sal.transaction_date >= $${params.length}`;
    }

    if (to_date) {
      params.push(to_date);
      query += ` AND sal.transaction_date <= $${params.length}`;
    }

    query += ` ORDER BY sal.transaction_date DESC, sal.created_at DESC`;
    const rows = await dbQuery(query, params);

    // Also fetch account summary
    const account = await dbQuery(`
      SELECT sa.*, ss.name as supplier_name, ss.supplier_code
      FROM supply_accounts sa
      LEFT JOIN supply_suppliers ss ON sa.supplier_id = ss.id
      WHERE sa.id = $1
    `, [id]);

    res.json({ account: account[0], ledger: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/accounts - Create supplier account (or ensure one exists)
export async function createAccount(req, res) {
  try {
    const { supplier_id, account_type, opening_balance } = req.body;
    if (!supplier_id) {
      return res.status(400).json({ error: 'Supplier is required.' });
    }

    // Check if account already exists for supplier
    const existing = await dbQuery(`SELECT id FROM supply_accounts WHERE supplier_id = $1 AND deleted_at IS NULL`, [supplier_id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account already exists for this supplier.', account_id: existing[0].id });
    }

    const id = generateUuid();
    const openBal = parseFloat(opening_balance || 0);
    await dbQuery(
      `INSERT INTO supply_accounts (id, supplier_id, account_type, opening_balance, current_balance, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, supplier_id, account_type || 'Payable', openBal, openBal, 'Active']
    );

    // If opening balance > 0, create opening balance ledger entry
    if (openBal !== 0) {
      const ledgerId = generateUuid();
      const isDebit = openBal > 0;
      const txDate = new Date().toISOString().split('T')[0];
      await dbQuery(
        `INSERT INTO supply_account_ledger (id, account_id, supplier_id, transaction_date, entry_date, transaction_type, entry_type, description, debit, credit, running_balance, amount, balance_after)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          ledgerId, id, supplier_id,
          txDate, txDate,
          'Opening Balance', 'Opening Balance',
          'Initial opening balance',
          isDebit ? Math.abs(openBal) : 0,
          isDebit ? 0 : Math.abs(openBal),
          openBal, Math.abs(openBal), openBal
        ]
      );
    }

    const created = await dbQuery(`
      SELECT sa.*, ss.name as supplier_name, ss.supplier_code
      FROM supply_accounts sa
      LEFT JOIN supply_suppliers ss ON sa.supplier_id = ss.id
      WHERE sa.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/accounts/:id/advance - Record an advance payment to supplier
export async function recordAdvance(req, res) {
  try {
    const { id } = req.params;
    const { amount, transaction_date, description } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Advance amount must be positive.' });
    }

    const account = await dbQuery(`SELECT * FROM supply_accounts WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (account.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const advAmount = parseFloat(amount);
    const newBalance = parseFloat(account[0].current_balance) - advAmount; // Advance reduces payable
    const txDate = transaction_date || new Date().toISOString().split('T')[0];

    // Update account balance
    await dbQuery(`UPDATE supply_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newBalance, id]);

    // Create ledger entry
    const ledgerId = generateUuid();
    await dbQuery(
      `INSERT INTO supply_account_ledger (id, account_id, supplier_id, transaction_date, entry_date, transaction_type, entry_type, description, debit, credit, running_balance, amount, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ledgerId, id, account[0].supplier_id,
        txDate, txDate,
        'Advance Payment', 'Advance Payment',
        description || 'Advance payment to supplier',
        0, advAmount, newBalance, advAmount, newBalance
      ]
    );

    const updated = await dbQuery(`
      SELECT sa.*, ss.name as supplier_name, ss.supplier_code
      FROM supply_accounts sa
      LEFT JOIN supply_suppliers ss ON sa.supplier_id = ss.id
      WHERE sa.id = $1
    `, [id]);
    res.json({ account: updated[0], ledger_entry_id: ledgerId });
  } catch (error) {
    console.error('Error recording advance:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/accounts/:id/payment - Record a payment to supplier
export async function recordPayment(req, res) {
  try {
    const { id } = req.params;
    const { amount, transaction_date, description } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be positive.' });
    }

    const account = await dbQuery(`SELECT * FROM supply_accounts WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (account.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const payAmount = parseFloat(amount);
    const newBalance = parseFloat(account[0].current_balance) - payAmount;
    const txDate = transaction_date || new Date().toISOString().split('T')[0];

    await dbQuery(`UPDATE supply_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newBalance, id]);

    const ledgerId = generateUuid();
    await dbQuery(
      `INSERT INTO supply_account_ledger (id, account_id, supplier_id, transaction_date, entry_date, transaction_type, entry_type, description, debit, credit, running_balance, amount, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ledgerId, id, account[0].supplier_id,
        txDate, txDate,
        'Payment', 'Payment',
        description || 'Payment to supplier',
        0, payAmount, newBalance, payAmount, newBalance
      ]
    );

    const updated = await dbQuery(`
      SELECT sa.*, ss.name as supplier_name, ss.supplier_code
      FROM supply_accounts sa
      LEFT JOIN supply_suppliers ss ON sa.supplier_id = ss.id
      WHERE sa.id = $1
    `, [id]);
    res.json({ account: updated[0], ledger_entry_id: ledgerId });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
}
