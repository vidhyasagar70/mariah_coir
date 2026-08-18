import { dbQuery, getNextId } from '../../../config/db.js';

// GET /api/maintenance - Fetch all maintenance register records with filters & summary
export async function getMaintenanceLogs(req, res) {
  try {
    const { pay_mode, status, search, from_date, to_date, date_from, date_to } = req.query;
    let query = `SELECT * FROM maintenance_register WHERE 1=1`;
    const params = [];

    const startDate = from_date || date_from;
    const endDate = to_date || date_to;

    if (pay_mode && pay_mode !== 'All') {
      params.push(pay_mode);
      query += ` AND pay_mode = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status.toUpperCase());
      query += ` AND UPPER(status) = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      query += ` AND maintenance_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      query += ` AND maintenance_date <= $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      query += ` AND (id LIKE $${idx} OR maintenance_name LIKE $${idx} OR maintenance_reason LIKE $${idx} OR receiver_name LIKE $${idx} OR account_number LIKE $${idx})`;
    }

    query += ` ORDER BY created_at DESC, maintenance_date DESC`;

    const logs = await dbQuery(query, params);

    // Calculate Summary Statistics based on filtered records
    const summary = logs.reduce(
      (acc, item) => {
        const cost = parseFloat(item.amount_spent || 0);
        acc.totalExpenditure += cost;
        acc.totalEntries += 1;
        if (item.pay_mode === 'Cash') {
          acc.cashExpenditure += cost;
        } else {
          acc.onlineExpenditure += cost;
        }
        return acc;
      },
      { totalExpenditure: 0, totalEntries: 0, cashExpenditure: 0, onlineExpenditure: 0 }
    );

    res.json({ logs, summary });
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/maintenance - Record a new maintenance entry
export async function createMaintenanceLog(req, res) {
  try {
    const {
      maintenance_date,
      payment_date,
      maintenance_name,
      maintenance_reason,
      amount_spent,
      days_taken,
      pay_mode,
      receiver_name,
      account_number,
      status
    } = req.body;

    if (!maintenance_date || !maintenance_name || !receiver_name || amount_spent === undefined || !pay_mode) {
      return res.status(400).json({ error: 'Date, Maintenance Name, Receiver Name, Amount Spent, and Payment Mode are required.' });
    }

    if (pay_mode !== 'Cash' && !account_number) {
      return res.status(400).json({ error: 'Account Number / UPI ID is required for non-cash payment modes.' });
    }

    const id = await getNextId('MN');
    const payDate = payment_date || maintenance_date;

    const validStatus = ['PAID', 'PENDING', 'CANCELLED'].includes(status?.toUpperCase()) ? status.toUpperCase() : 'PAID';

    await dbQuery(
      `INSERT INTO maintenance_register (
        id, maintenance_date, payment_date, maintenance_name, maintenance_reason, amount_spent, days_taken, pay_mode, receiver_name, account_number, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        maintenance_date,
        payDate,
        maintenance_name.trim(),
        maintenance_reason ? maintenance_reason.trim() : '',
        parseFloat(amount_spent),
        parseInt(days_taken || 1, 10),
        pay_mode,
        receiver_name.trim(),
        pay_mode !== 'Cash' ? (account_number ? account_number.trim() : '') : null,
        validStatus
      ]
    );

    const created = await dbQuery('SELECT * FROM maintenance_register WHERE id = $1', [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating maintenance entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/maintenance/:id - Remove a maintenance entry
export async function deleteMaintenanceLog(req, res) {
  try {
    const { id } = req.params;
    await dbQuery('DELETE FROM maintenance_register WHERE id = $1', [id]);
    res.json({ success: true, message: `Maintenance entry ${id} deleted.` });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    res.status(500).json({ error: error.message });
  }
}
