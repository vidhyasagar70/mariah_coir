import { dbQuery, generateUuid, getNextId } from '../../../config/db.js';

// GET /api/supply/entries - List supply entries with joins
export async function getEntries(req, res) {
  try {
    const { supplier_id, raw_material_id, vehicle_type_id, status, from_date, to_date, search } = req.query;
    let query = `
      SELECT se.*,
             COALESCE(ss.name, ss.company_name, 'Supplier') as supplier_name, 
             ss.id as supplier_code,
             rm.name as raw_material_name,
             svt.name as vehicle_type_name,
             sv.vehicle_number
      FROM supply_entries se
      LEFT JOIN suppliers ss ON se.supplier_id = ss.id
      LEFT JOIN raw_materials rm ON se.raw_material_id = rm.id
      LEFT JOIN supply_vehicle_types svt ON se.vehicle_type_id = svt.id
      LEFT JOIN supply_vehicles sv ON se.vehicle_id = sv.id
      WHERE se.deleted_at IS NULL`;
    const params = [];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND se.supplier_id = $${params.length}`;
    }
    if (raw_material_id) {
      params.push(raw_material_id);
      query += ` AND se.raw_material_id = $${params.length}`;
    }
    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND se.vehicle_type_id = $${params.length}`;
    }
    if (status && status !== 'All') {
      params.push(status);
      query += ` AND se.status = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND se.entry_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND se.entry_date <= $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (se.entry_code LIKE $${params.length} OR ss.name LIKE $${params.length} OR rm.name LIKE $${params.length})`;
    }

    query += ` ORDER BY se.entry_date DESC, se.created_at DESC`;
    const rows = await dbQuery(query, params);

    // Summary KPIs
    const summary = rows.reduce((acc, item) => {
      acc.totalEntries += 1;
      acc.totalAmount += parseFloat(item.total_amount || 0);
      acc.totalQuantity += parseFloat(item.quantity || 0);
      return acc;
    }, { totalEntries: 0, totalAmount: 0, totalQuantity: 0 });

    res.json({ data: rows, summary, total: rows.length });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/entries - Create a supply entry with auto-price and ledger update
export async function createEntry(req, res) {
  try {
    const {
      supplier_id, raw_material_id, vehicle_type_id, vehicle_id,
      entry_date, quantity, rate_per_unit, payment_mode, notes,
      custom_vehicle_name, custom_vehicle_rate
    } = req.body;

    if (!supplier_id || !raw_material_id || !vehicle_type_id || !entry_date) {
      return res.status(400).json({ error: 'Supplier, raw material, vehicle type, and entry date are required.' });
    }

    let finalVehicleTypeId = vehicle_type_id;
    if (vehicle_type_id === 'CUSTOM' || custom_vehicle_name) {
      const customName = (custom_vehicle_name || 'Custom Vehicle').trim();
      const existing = await dbQuery(
        `SELECT id FROM supply_vehicle_types WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
        [customName]
      );
      if (existing.length > 0) {
        finalVehicleTypeId = existing[0].id;
      } else {
        finalVehicleTypeId = generateUuid();
        await dbQuery(
          `INSERT INTO supply_vehicle_types (id, name, capacity, description, custom_alias, status) VALUES ($1, $2, $3, $4, $5, $6)`,
          [finalVehicleTypeId, customName, 'Custom Capacity', 'Auto-registered via Supply Entry', customName, 1]
        );
      }
    }

    // Resolve rate: use provided rate, custom rate, or auto-resolve from pricing table
    let resolvedRate = rate_per_unit || custom_vehicle_rate ? parseFloat(rate_per_unit || custom_vehicle_rate) : null;

    if (!resolvedRate) {
      const priceRows = await dbQuery(`
        SELECT rate_per_unit FROM supply_pricing
        WHERE raw_material_id = $1
          AND vehicle_type_id = $2
          AND status = 'Active'
          AND deleted_at IS NULL
          AND effective_from <= $3
          AND (effective_to IS NULL OR effective_to >= $3)
        ORDER BY effective_from DESC
        LIMIT 1
      `, [raw_material_id, finalVehicleTypeId, entry_date]);

      if (priceRows.length > 0) {
        resolvedRate = parseFloat(priceRows[0].rate_per_unit);
      } else {
        return res.status(400).json({ error: 'No active pricing rule found for this material + vehicle type combination. Please set pricing first or provide a manual rate.' });
      }
    }

    const qty = parseFloat(quantity || 1);
    const totalAmount = resolvedRate * qty;
    const entryCode = await getNextId('SE');
    const mode = payment_mode || 'Credit';

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO supply_entries (id, entry_code, supply_number, supplier_id, raw_material_id, unit_id, vehicle_type_id, vehicle_id, entry_date, date, quantity, rate_per_unit, price, total_amount, payment_mode, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [id, entryCode, entryCode, supplier_id, raw_material_id, '00000000-0000-0000-0000-000000000001', finalVehicleTypeId, vehicle_id || '00000000-0000-0000-0000-000000000001', entry_date, entry_date, qty, resolvedRate, resolvedRate, totalAmount, mode, notes || '', 'Confirmed']
    );

    // If payment mode is Credit, update supplier account
    if (mode === 'Credit') {
      // Ensure supplier has an account
      let accountRows = await dbQuery(`SELECT * FROM supply_accounts WHERE supplier_id = $1 AND deleted_at IS NULL`, [supplier_id]);
      let accountId;

      if (accountRows.length === 0) {
        // Auto-create account for supplier
        accountId = generateUuid();
        await dbQuery(
          `INSERT INTO supply_accounts (id, supplier_id, account_type, opening_balance, current_balance, status) VALUES ($1, $2, $3, $4, $5, $6)`,
          [accountId, supplier_id, 'Payable', 0, totalAmount, 'Active']
        );
      } else {
        accountId = accountRows[0].id;
        const newBalance = parseFloat(accountRows[0].current_balance || 0) + totalAmount;
        await dbQuery(`UPDATE supply_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newBalance, accountId]);
      }

      // Create ledger entry
      const updatedAccount = await dbQuery(`SELECT current_balance FROM supply_accounts WHERE id = $1`, [accountId]);
      const ledgerId = generateUuid();
      const currentBal = parseFloat(updatedAccount[0]?.current_balance || totalAmount);
      await dbQuery(
        `INSERT INTO supply_account_ledger (id, account_id, supplier_id, transaction_date, entry_date, transaction_type, entry_type, description, debit, credit, running_balance, amount, balance_after, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          ledgerId, accountId, supplier_id,
          entry_date, entry_date,
          'Supply Receipt', 'Supply Receipt',
          `Supply Entry ${entryCode} - ${qty} unit(s)`,
          totalAmount, 0,
          currentBal, totalAmount, currentBal,
          id, 'SUPPLY_ENTRY'
        ]
      );
    }

    // Return created entry with join data
    const created = await dbQuery(`
      SELECT se.*, 
             COALESCE(ss.name, ss.company_name, 'Supplier') as supplier_name, 
             ss.id as supplier_code,
             rm.name as raw_material_name, svt.name as vehicle_type_name, sv.vehicle_number
      FROM supply_entries se
      LEFT JOIN suppliers ss ON se.supplier_id = ss.id
      LEFT JOIN raw_materials rm ON se.raw_material_id = rm.id
      LEFT JOIN supply_vehicle_types svt ON se.vehicle_type_id = svt.id
      LEFT JOIN supply_vehicles sv ON se.vehicle_id = sv.id
      WHERE se.id = $1
    `, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating supply entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/entries/:id
export async function deleteEntry(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE supply_entries SET deleted_at = CURRENT_TIMESTAMP, status = 'Cancelled' WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Supply entry deleted.' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supply/entries/reports - Summary reports
export async function getEntryReports(req, res) {
  try {
    const { from_date, to_date } = req.query;
    let dateFilter = '';
    const params = [];

    if (from_date) {
      params.push(from_date);
      dateFilter += ` AND se.entry_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      dateFilter += ` AND se.entry_date <= $${params.length}`;
    }

    // Summary by raw material
    const byMaterial = await dbQuery(`
      SELECT rm.name as raw_material_name,
             COUNT(se.id) as total_entries,
             SUM(se.quantity) as total_quantity,
             SUM(se.total_amount) as total_amount
      FROM supply_entries se
      LEFT JOIN raw_materials rm ON se.raw_material_id = rm.id
      WHERE se.deleted_at IS NULL AND se.status = 'Confirmed' ${dateFilter}
      GROUP BY rm.name
      ORDER BY total_amount DESC
    `, params);

    // Summary by supplier
    const bySupplier = await dbQuery(`
      SELECT COALESCE(ss.name, ss.company_name, 'Supplier') as supplier_name, 
             ss.id as supplier_code,
             COUNT(se.id) as total_entries,
             SUM(se.quantity) as total_quantity,
             SUM(se.total_amount) as total_amount
      FROM supply_entries se
      LEFT JOIN suppliers ss ON se.supplier_id = ss.id
      WHERE se.deleted_at IS NULL AND (se.status = 'Confirmed' OR se.status = 'Pending') ${dateFilter}
      GROUP BY COALESCE(ss.name, ss.company_name, 'Supplier'), ss.id
      ORDER BY total_amount DESC
    `, params);

    // Grand totals
    const grandTotal = await dbQuery(`
      SELECT COUNT(id) as total_entries,
             SUM(quantity) as total_quantity,
             SUM(total_amount) as total_amount
      FROM supply_entries
      WHERE deleted_at IS NULL AND status = 'Confirmed' ${dateFilter}
    `, params);

    res.json({
      byMaterial,
      bySupplier,
      grandTotal: grandTotal[0] || { total_entries: 0, total_quantity: 0, total_amount: 0 }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
}
