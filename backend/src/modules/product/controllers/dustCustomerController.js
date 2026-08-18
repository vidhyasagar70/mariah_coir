import { dbQuery, getNextId } from '../../../config/db.js';

const VALID_QUEUE_STATUSES = ['In Queue', 'Partial Delivered', 'Completed', 'Cancelled'];

// GET /api/dust/customers
export async function getDustCustomers(req, res) {
  try {
    const { search, queue_status } = req.query;
    let query = `SELECT * FROM dust_customers WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (customer_name LIKE $${pIdx} OR phone_number LIKE $${pIdx} OR company_name LIKE $${pIdx} OR id LIKE $${pIdx})`;
    }

    if (queue_status && queue_status !== 'All') {
      params.push(queue_status);
      query += ` AND queue_status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC, id DESC`;

    const customers = await dbQuery(query, params);
    const allCustomers = await dbQuery(`SELECT advance_amount_paid, current_advance_balance, queue_status FROM dust_customers`);

    const summary = {
      totalCustomers: allCustomers.length,
      totalAdvancePaid: allCustomers.reduce((acc, c) => acc + (parseFloat(c.advance_amount_paid) || 0), 0),
      totalAdvanceBalance: allCustomers.reduce((acc, c) => acc + (parseFloat(c.current_advance_balance) || 0), 0),
      inQueueCount: allCustomers.filter(c => c.queue_status === 'In Queue' || c.queue_status === 'Partial Delivered').length,
      completedCount: allCustomers.filter(c => c.queue_status === 'Completed').length
    };

    res.json({ customers, summary });
  } catch (error) {
    console.error('Error fetching dust customers:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/dust/customers/:id
export async function getDustCustomerById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: `Dust Customer ${id} not found.` });
    }

    // Also fetch historical sales for this customer
    const sales = await dbQuery(`SELECT * FROM dust_sales WHERE customer_id = $1 ORDER BY dispatch_date DESC, id DESC`, [id]);

    res.json({ customer: rows[0], sales });
  } catch (error) {
    console.error('Error fetching dust customer by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/dust/customers
export async function createDustCustomer(req, res) {
  try {
    const {
      customer_name,
      phone_number,
      company_name,
      preferred_vehicle_type,
      advance_amount_paid,
      advance_date,
      delivery_due_date,
      notes
    } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    if (!preferred_vehicle_type || !preferred_vehicle_type.trim()) {
      return res.status(400).json({ error: 'Preferred vehicle type is required.' });
    }

    if (!delivery_due_date) {
      return res.status(400).json({ error: 'Delivery due date is required.' });
    }

    const advanceNum = parseFloat(advance_amount_paid || 0);
    if (isNaN(advanceNum) || advanceNum < 0) {
      return res.status(400).json({ error: 'Advance amount paid must be a non-negative number.' });
    }

    const newId = await getNextId('DCUS');
    const advDate = advance_date || new Date().toISOString().split('T')[0];

    await dbQuery(
      `INSERT INTO dust_customers 
       (id, customer_name, phone_number, company_name, preferred_vehicle_type, advance_amount_paid, current_advance_balance, advance_date, delivery_due_date, queue_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        newId,
        customer_name.trim(),
        phone_number.trim(),
        company_name ? company_name.trim() : null,
        preferred_vehicle_type.trim(),
        advanceNum,
        advanceNum, // current_advance_balance starts equal to initial advance
        advDate,
        delivery_due_date,
        'In Queue',
        notes ? notes.trim() : null
      ]
    );

    const created = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [newId]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating dust customer:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/dust/customers/:id
export async function updateDustCustomer(req, res) {
  try {
    const { id } = req.params;
    const {
      customer_name,
      phone_number,
      company_name,
      preferred_vehicle_type,
      advance_amount_paid,
      current_advance_balance,
      advance_date,
      delivery_due_date,
      queue_status,
      notes
    } = req.body;

    const existing = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Dust Customer ${id} not found.` });
    }

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!phone_number || !phone_number.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    if (!preferred_vehicle_type || !preferred_vehicle_type.trim()) {
      return res.status(400).json({ error: 'Preferred vehicle type is required.' });
    }

    if (!delivery_due_date) {
      return res.status(400).json({ error: 'Delivery due date is required.' });
    }

    const advanceNum = parseFloat(advance_amount_paid !== undefined ? advance_amount_paid : existing[0].advance_amount_paid);
    const balanceNum = parseFloat(current_advance_balance !== undefined ? current_advance_balance : existing[0].current_advance_balance);

    const statusVal = VALID_QUEUE_STATUSES.includes(queue_status) ? queue_status : existing[0].queue_status;

    await dbQuery(
      `UPDATE dust_customers
       SET customer_name = $1, phone_number = $2, company_name = $3, preferred_vehicle_type = $4,
           advance_amount_paid = $5, current_advance_balance = $6, advance_date = $7, delivery_due_date = $8,
           queue_status = $9, notes = $10
       WHERE id = $11`,
      [
        customer_name.trim(),
        phone_number.trim(),
        company_name ? company_name.trim() : null,
        preferred_vehicle_type.trim(),
        advanceNum,
        balanceNum,
        advance_date || existing[0].advance_date,
        delivery_due_date,
        statusVal,
        notes ? notes.trim() : null,
        id
      ]
    );

    const updated = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating dust customer:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/dust/customers/:id
export async function deleteDustCustomer(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM dust_customers WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Dust Customer ${id} not found.` });
    }

    // Check if sales exist
    const refSales = await dbQuery(`SELECT id FROM dust_sales WHERE customer_id = $1 LIMIT 1`, [id]);
    if (refSales.length > 0) {
      return res.status(400).json({ error: 'Cannot delete Dust Customer with recorded sales dispatches.' });
    }

    await dbQuery(`DELETE FROM dust_customers WHERE id = $1`, [id]);
    res.json({ success: true, message: `Dust Customer ${id} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting dust customer:', error);
    res.status(500).json({ error: error.message });
  }
}
