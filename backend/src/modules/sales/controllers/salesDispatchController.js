import { dbQuery, getNextId } from '../../../config/db.js';

const VALID_PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];

// GET /api/sales/dispatches
export async function getSalesDispatches(req, res) {
  try {
    const { search, payment_status, date_from, date_to, product_id } = req.query;

    let query = `
      SELECT sd.*, p.product_name, p.category as product_category, p.unit as product_unit
      FROM sales_dispatches sd
      LEFT JOIN products p ON sd.product_id = p.id
      WHERE 1=1`;

    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (sd.customer_name LIKE $${pIdx} OR sd.customer_phone LIKE $${pIdx} OR sd.vehicle_number LIKE $${pIdx} OR sd.id LIKE $${pIdx} OR p.product_name LIKE $${pIdx})`;
    }

    if (payment_status && payment_status !== 'ALL' && payment_status !== 'All') {
      params.push(payment_status);
      query += ` AND sd.payment_status = $${params.length}`;
    }

    if (product_id && product_id !== 'ALL' && product_id !== 'All') {
      params.push(product_id);
      query += ` AND sd.product_id = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND sd.order_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND sd.order_date <= $${params.length}`;
    }

    query += ` ORDER BY sd.order_date DESC, sd.created_at DESC, sd.id DESC`;

    const dispatches = await dbQuery(query, params);

    // Compute KPI Summary Stats across all matching records
    const summary = {
      totalDispatches: dispatches.length,
      totalQuantityUnits: dispatches.reduce((acc, d) => acc + (parseInt(d.quantity_units, 10) || 0), 0),
      totalActualWeight: dispatches.reduce((acc, d) => acc + (parseFloat(d.actual_scale_weight) || 0), 0),
      totalApproxWeight: dispatches.reduce((acc, d) => acc + (parseFloat(d.total_approx_weight) || 0), 0),
      netWeightDifference: dispatches.reduce((acc, d) => acc + (parseFloat(d.weight_difference) || 0), 0),
      totalSalesAmount: dispatches.reduce((acc, d) => acc + (parseFloat(d.total_sales_amount) || 0), 0),
      pendingPaymentsCount: dispatches.filter(d => d.payment_status !== 'Paid').length,
      pendingPaymentsAmount: dispatches.filter(d => d.payment_status !== 'Paid').reduce((acc, d) => acc + (parseFloat(d.total_sales_amount) || 0), 0)
    };

    res.json({ dispatches, summary });
  } catch (error) {
    console.error('Error fetching sales dispatches:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/sales/dispatches/:id
export async function getSalesDispatchById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(
      `SELECT sd.*, p.product_name, p.category as product_category, p.unit as product_unit
       FROM sales_dispatches sd
       LEFT JOIN products p ON sd.product_id = p.id
       WHERE sd.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Sales dispatch ${id} not found.` });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching sales dispatch by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/sales/dispatches
export async function createSalesDispatch(req, res) {
  try {
    const {
      customer_name,
      customer_phone,
      order_date,
      warehouse,
      vehicle_type,
      vehicle_number,
      product_id,
      quantity_units,
      actual_scale_weight,
      notes,
      payment_status
    } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!vehicle_type || !vehicle_type.trim()) {
      return res.status(400).json({ error: 'Vehicle type is required.' });
    }

    if (!vehicle_number || !vehicle_number.trim()) {
      return res.status(400).json({ error: 'Vehicle number is required.' });
    }

    if (!product_id) {
      return res.status(400).json({ error: 'Product selection is required.' });
    }

    const qtyNum = parseInt(quantity_units, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ error: 'Quantity units must be a positive integer.' });
    }

    const actualWeightNum = parseFloat(actual_scale_weight);
    if (isNaN(actualWeightNum) || actualWeightNum <= 0) {
      return res.status(400).json({ error: 'Actual scale weight (kg) must be a positive number.' });
    }

    // Fetch product details for approx bundle weight and sell rate per kg
    const productRows = await dbQuery(`SELECT * FROM products WHERE id = $1`, [product_id]);
    if (productRows.length === 0) {
      return res.status(404).json({ error: `Selected product ${product_id} does not exist.` });
    }

    const product = productRows[0];
    const approxUnitWeight = parseFloat(product.approx_bundle_weight) || 0;
    const ratePerKg = parseFloat(product.sell_price_per_kg) || 0;

    // MOISTURE ENGINE CALCULATIONS
    const totalApproxWeight = qtyNum * approxUnitWeight;
    const weightDifference = actualWeightNum - totalApproxWeight;
    const totalSalesAmount = actualWeightNum * ratePerKg;

    const statusVal = VALID_PAYMENT_STATUSES.includes(payment_status) ? payment_status : 'Pending';
    const newId = await getNextId('DISP');
    const dispatchDate = order_date || new Date().toISOString().split('T')[0];

    await dbQuery(
      `INSERT INTO sales_dispatches 
       (id, customer_name, customer_phone, order_date, warehouse, vehicle_type, vehicle_number, product_id, quantity_units, approx_unit_weight, total_approx_weight, actual_scale_weight, weight_difference, rate_per_kg, total_sales_amount, notes, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        newId,
        customer_name.trim(),
        customer_phone ? customer_phone.trim() : null,
        dispatchDate,
        warehouse ? warehouse.trim() : 'Main Factory Warehouse',
        vehicle_type.trim(),
        vehicle_number.trim().toUpperCase(),
        product_id,
        qtyNum,
        approxUnitWeight,
        totalApproxWeight,
        actualWeightNum,
        weightDifference,
        ratePerKg,
        totalSalesAmount,
        notes ? notes.trim() : null,
        statusVal
      ]
    );

    const created = await dbQuery(
      `SELECT sd.*, p.product_name, p.category as product_category, p.unit as product_unit
       FROM sales_dispatches sd
       LEFT JOIN products p ON sd.product_id = p.id
       WHERE sd.id = $1`,
      [newId]
    );

    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating sales dispatch:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/sales/dispatches/:id
export async function updateSalesDispatch(req, res) {
  try {
    const { id } = req.params;
    const {
      customer_name,
      customer_phone,
      order_date,
      warehouse,
      vehicle_type,
      vehicle_number,
      product_id,
      quantity_units,
      actual_scale_weight,
      notes,
      payment_status
    } = req.body;

    const existing = await dbQuery(`SELECT * FROM sales_dispatches WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Sales dispatch ${id} not found.` });
    }

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!vehicle_type || !vehicle_type.trim()) {
      return res.status(400).json({ error: 'Vehicle type is required.' });
    }

    if (!vehicle_number || !vehicle_number.trim()) {
      return res.status(400).json({ error: 'Vehicle number is required.' });
    }

    if (!product_id) {
      return res.status(400).json({ error: 'Product selection is required.' });
    }

    const qtyNum = parseInt(quantity_units, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ error: 'Quantity units must be a positive integer.' });
    }

    const actualWeightNum = parseFloat(actual_scale_weight);
    if (isNaN(actualWeightNum) || actualWeightNum <= 0) {
      return res.status(400).json({ error: 'Actual scale weight (kg) must be a positive number.' });
    }

    const productRows = await dbQuery(`SELECT * FROM products WHERE id = $1`, [product_id]);
    if (productRows.length === 0) {
      return res.status(404).json({ error: `Selected product ${product_id} does not exist.` });
    }

    const product = productRows[0];
    const approxUnitWeight = parseFloat(product.approx_bundle_weight) || 0;
    const ratePerKg = parseFloat(product.sell_price_per_kg) || 0;

    const totalApproxWeight = qtyNum * approxUnitWeight;
    const weightDifference = actualWeightNum - totalApproxWeight;
    const totalSalesAmount = actualWeightNum * ratePerKg;

    const statusVal = VALID_PAYMENT_STATUSES.includes(payment_status) ? payment_status : existing[0].payment_status;

    await dbQuery(
      `UPDATE sales_dispatches
       SET customer_name = $1, customer_phone = $2, order_date = $3, warehouse = $4, vehicle_type = $5,
           vehicle_number = $6, product_id = $7, quantity_units = $8, approx_unit_weight = $9,
           total_approx_weight = $10, actual_scale_weight = $11, weight_difference = $12, rate_per_kg = $13,
           total_sales_amount = $14, notes = $15, payment_status = $16
       WHERE id = $17`,
      [
        customer_name.trim(),
        customer_phone ? customer_phone.trim() : null,
        order_date || existing[0].order_date,
        warehouse ? warehouse.trim() : existing[0].warehouse,
        vehicle_type.trim(),
        vehicle_number.trim().toUpperCase(),
        product_id,
        qtyNum,
        approxUnitWeight,
        totalApproxWeight,
        actualWeightNum,
        weightDifference,
        ratePerKg,
        totalSalesAmount,
        notes ? notes.trim() : null,
        statusVal,
        id
      ]
    );

    const updated = await dbQuery(
      `SELECT sd.*, p.product_name, p.category as product_category, p.unit as product_unit
       FROM sales_dispatches sd
       LEFT JOIN products p ON sd.product_id = p.id
       WHERE sd.id = $1`,
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating sales dispatch:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/sales/dispatches/:id
export async function deleteSalesDispatch(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM sales_dispatches WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Sales dispatch ${id} not found.` });
    }

    await dbQuery(`DELETE FROM sales_dispatches WHERE id = $1`, [id]);
    res.json({ success: true, message: `Sales dispatch ${id} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting sales dispatch:', error);
    res.status(500).json({ error: error.message });
  }
}
