import { dbQuery, getNextId } from '../../../config/db.js';

const VALID_EXPENSE_CATEGORIES = ['Driver Salary', 'Employee Salary', 'Diesel Expense', 'Miscellaneous', 'Utility & Maintenance'];
const VALID_PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'];

// GET /api/dashboard/analytics
export async function getDashboardAnalytics(req, res) {
  try {
    let { date_from, date_to, year, month } = req.query;

    // Convert year & month to date range if provided
    if (year && year !== 'ALL' && year !== 'All') {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        if (month && month !== 'ALL' && month !== 'All') {
          const m = parseInt(month, 10);
          if (!isNaN(m) && m >= 1 && m <= 12) {
            const mStr = String(m).padStart(2, '0');
            date_from = `${y}-${mStr}-01`;
            const lastDay = new Date(y, m, 0).getDate();
            date_to = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;
          } else {
            date_from = `${y}-01-01`;
            date_to = `${y}-12-31`;
          }
        } else {
          date_from = `${y}-01-01`;
          date_to = `${y}-12-31`;
        }
      }
    }

    // Build date clauses for each module's table
    let salesDateClause = '';
    let dustDateClause = '';
    let receiptDateClause = '';
    let supplyDateClause = '';
    let expenseDateClause = '';
    let maintenanceDateClause = '';
    let miscDateClause = '';
    const dateParams = [];

    if (date_from) {
      dateParams.push(date_from);
      const pIdx = dateParams.length;
      salesDateClause += ` AND order_date >= $${pIdx}`;
      dustDateClause += ` AND dispatch_date >= $${pIdx}`;
      receiptDateClause += ` AND receipt_date >= $${pIdx}`;
      supplyDateClause += ` AND (entry_date >= $${pIdx} OR date >= $${pIdx})`;
      expenseDateClause += ` AND expense_date >= $${pIdx}`;
      maintenanceDateClause += ` AND (maintenance_date >= $${pIdx} OR payment_date >= $${pIdx})`;
      miscDateClause += ` AND expense_date >= $${pIdx}`;
    }

    if (date_to) {
      dateParams.push(date_to);
      const pIdx = dateParams.length;
      salesDateClause += ` AND order_date <= $${pIdx}`;
      dustDateClause += ` AND dispatch_date <= $${pIdx}`;
      receiptDateClause += ` AND receipt_date <= $${pIdx}`;
      supplyDateClause += ` AND (entry_date <= $${pIdx} OR date <= $${pIdx})`;
      expenseDateClause += ` AND expense_date <= $${pIdx}`;
      maintenanceDateClause += ` AND (maintenance_date <= $${pIdx} OR payment_date <= $${pIdx})`;
      miscDateClause += ` AND expense_date <= $${pIdx}`;
    }

    // 1. REVENUE STREAMS
    const productSalesRows = await dbQuery(
      `SELECT COALESCE(SUM(total_sales_amount), 0) as total FROM sales_dispatches WHERE 1=1 ${salesDateClause}`,
      dateParams
    );
    const productSalesRevenue = parseFloat(productSalesRows[0]?.total || 0);

    const dustSalesRows = await dbQuery(
      `SELECT COALESCE(SUM(total_sale_amount), 0) as total FROM dust_sales WHERE 1=1 ${dustDateClause}`,
      dateParams
    );
    const dustSalesRevenue = parseFloat(dustSalesRows[0]?.total || 0);

    const totalGrossRevenue = productSalesRevenue + dustSalesRevenue;

    // 2. OPERATIONAL COST OUTFLOWS
    // Raw Material Husks Procurement Cost (from supply_entries and receipts)
    let rawMaterialCost = 0;
    try {
      const supplyRows = await dbQuery(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM supply_entries WHERE deleted_at IS NULL ${supplyDateClause}`,
        dateParams
      );
      rawMaterialCost += parseFloat(supplyRows[0]?.total || 0);
    } catch (e) {}

    try {
      const receiptRows = await dbQuery(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM receipts WHERE 1=1 ${receiptDateClause}`,
        dateParams
      );
      rawMaterialCost += parseFloat(receiptRows[0]?.total || 0);
    } catch (e) {}

    // Expenses categorized in expenses table
    const expenseCategoryRows = await dbQuery(
      `SELECT category, COALESCE(SUM(amount), 0) as total 
       FROM expenses 
       WHERE 1=1 ${expenseDateClause} 
       GROUP BY category`,
      dateParams
    );

    let dieselExpense = 0;
    let driverSalary = 0;
    let employeeSalary = 0;
    let miscExpense = 0;

    expenseCategoryRows.forEach(r => {
      const amt = parseFloat(r.total) || 0;
      if (r.category === 'Diesel Expense') dieselExpense += amt;
      else if (r.category === 'Driver Salary') driverSalary += amt;
      else if (r.category === 'Employee Salary') employeeSalary += amt;
      else miscExpense += amt;
    });

    // Add Maintenance Register logs
    try {
      const maintRows = await dbQuery(
        `SELECT COALESCE(SUM(amount_spent), 0) as total FROM maintenance_register WHERE 1=1 ${maintenanceDateClause}`,
        dateParams
      );
      miscExpense += parseFloat(maintRows[0]?.total || 0);
    } catch (e) {}

    // Add Miscellaneous Entries logs
    try {
      const miscEntriesRows = await dbQuery(
        `SELECT COALESCE(SUM(amount), 0) as total FROM miscellaneous_entries WHERE deleted_at IS NULL ${miscDateClause}`,
        dateParams
      );
      miscExpense += parseFloat(miscEntriesRows[0]?.total || 0);
    } catch (e) {}

    // Add legacy miscellaneous_records if present
    try {
      const miscRecRows = await dbQuery(
        `SELECT COALESCE(SUM(amount), 0) as total FROM miscellaneous_records WHERE 1=1 ${miscDateClause}`,
        dateParams
      );
      miscExpense += parseFloat(miscRecRows[0]?.total || 0);
    } catch (e) {}

    const totalExpenses = rawMaterialCost + dieselExpense + driverSalary + employeeSalary + miscExpense;

    // 3. NET PROFITABILITY ENGINE
    const netProfit = totalGrossRevenue - totalExpenses;
    const profitMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;
    const verdictStatus = netProfit >= 0 ? 'PROFIT' : 'DEFICIT';

    // 4. EXPENSE CATEGORY DISTRIBUTION
    const expenseBreakdown = [
      { category: 'Raw Material (Husks)', amount: rawMaterialCost, percentage: totalExpenses > 0 ? (rawMaterialCost / totalExpenses) * 100 : 0 },
      { category: 'Diesel & Fuel', amount: dieselExpense, percentage: totalExpenses > 0 ? (dieselExpense / totalExpenses) * 100 : 0 },
      { category: 'Factory Staff Labor', amount: employeeSalary, percentage: totalExpenses > 0 ? (employeeSalary / totalExpenses) * 100 : 0 },
      { category: 'Driver Wages / Trips', amount: driverSalary, percentage: totalExpenses > 0 ? (driverSalary / totalExpenses) * 100 : 0 },
      { category: 'Misc Utilities & Maintenance', amount: miscExpense, percentage: totalExpenses > 0 ? (miscExpense / totalExpenses) * 100 : 0 }
    ];

    // 5. REVENUE STREAMS BREAKDOWN
    const revenueBreakdown = [
      { stream: 'Finished Coir Product Sales', amount: productSalesRevenue, percentage: totalGrossRevenue > 0 ? (productSalesRevenue / totalGrossRevenue) * 100 : 0 },
      { stream: 'Coir Pith (Dust) Sales', amount: dustSalesRevenue, percentage: totalGrossRevenue > 0 ? (dustSalesRevenue / totalGrossRevenue) * 100 : 0 }
    ];

    res.json({
      financials: {
        totalGrossRevenue,
        productSalesRevenue,
        dustSalesRevenue,
        totalExpenses,
        rawMaterialCost,
        dieselExpense,
        driverSalary,
        employeeSalary,
        miscExpense,
        netProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        verdictStatus
      },
      expenseBreakdown,
      revenueBreakdown
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/dashboard/expenses
export async function getExpenses(req, res) {
  try {
    let { search, category, date_from, date_to, year, month } = req.query;

    if (year && year !== 'ALL' && year !== 'All') {
      const y = parseInt(year, 10);
      if (!isNaN(y)) {
        if (month && month !== 'ALL' && month !== 'All') {
          const m = parseInt(month, 10);
          if (!isNaN(m) && m >= 1 && m <= 12) {
            const mStr = String(m).padStart(2, '0');
            date_from = `${y}-${mStr}-01`;
            const lastDay = new Date(y, m, 0).getDate();
            date_to = `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`;
          } else {
            date_from = `${y}-01-01`;
            date_to = `${y}-12-31`;
          }
        } else {
          date_from = `${y}-01-01`;
          date_to = `${y}-12-31`;
        }
      }
    }

    let query = `SELECT * FROM expenses WHERE 1=1`;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (beneficiary_name LIKE $${pIdx} OR notes LIKE $${pIdx} OR id LIKE $${pIdx} OR category LIKE $${pIdx})`;
    }

    if (category && category !== 'ALL' && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (date_from) {
      params.push(date_from);
      query += ` AND expense_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      query += ` AND expense_date <= $${params.length}`;
    }

    query += ` ORDER BY expense_date DESC, created_at DESC, id DESC`;

    const items = await dbQuery(query, params);
    const totalAmount = items.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);

    res.json({ items, totalAmount });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/dashboard/expenses
export async function createExpense(req, res) {
  try {
    const { category, amount, payment_mode, beneficiary_name, notes, expense_date } = req.body;

    if (!category || !VALID_EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${VALID_EXPENSE_CATEGORIES.join(', ')}` });
    }

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return res.status(400).json({ error: 'Expense amount must be a positive number.' });
    }

    const modeVal = VALID_PAYMENT_MODES.includes(payment_mode) ? payment_mode : 'Cash';
    const newId = await getNextId('EXP');
    const expDate = expense_date || new Date().toISOString().split('T')[0];

    await dbQuery(
      `INSERT INTO expenses (id, expense_date, category, amount, payment_mode, beneficiary_name, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newId,
        expDate,
        category,
        amtNum,
        modeVal,
        beneficiary_name ? beneficiary_name.trim() : null,
        notes ? notes.trim() : null
      ]
    );

    const created = await dbQuery(`SELECT * FROM expenses WHERE id = $1`, [newId]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating expense record:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/dashboard/expenses/:id
export async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM expenses WHERE id = $1`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: `Expense record ${id} not found.` });
    }

    await dbQuery(`DELETE FROM expenses WHERE id = $1`, [id]);
    res.json({ success: true, message: `Expense record ${id} deleted successfully.` });
  } catch (error) {
    console.error('Error deleting expense record:', error);
    res.status(500).json({ error: error.message });
  }
}
