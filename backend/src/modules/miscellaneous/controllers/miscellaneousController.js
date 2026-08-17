import { dbQuery, generateUuid } from '../../../config/db.js';

// Helper to get company_id from request context or header
function getCompanyId(req) {
  return req.user?.company_id || req.headers['x-company-id'] || '00000000-0000-0000-0000-000000000001';
}

// Helper to get user_id from request context or header
function getUserId(req) {
  return req.user?.id || req.headers['x-user-id'] || '11111111-1111-1111-1111-111111111111';
}

// GET /api/miscellaneous - List records with pagination, search, filters, and summary KPIs
export async function getMiscellaneousEntries(req, res) {
  try {
    const companyId = getCompanyId(req);
    const {
      page = 1,
      limit = 20,
      search = '',
      date_from = '',
      date_to = '',
      payment_mode = 'All',
      status = 'All',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseWhere = `WHERE deleted_at IS NULL AND company_id = $1`;
    const params = [companyId];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      baseWhere += ` AND (description LIKE $${idx} OR transaction_reference LIKE $${idx} OR payment_reference LIKE $${idx} OR bank_name LIKE $${idx})`;
    }

    if (date_from) {
      params.push(date_from);
      baseWhere += ` AND expense_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      baseWhere += ` AND expense_date <= $${params.length}`;
    }

    if (payment_mode && payment_mode !== 'All') {
      const modeNormalized = payment_mode.toUpperCase();
      params.push(modeNormalized);
      baseWhere += ` AND UPPER(payment_mode) = $${params.length}`;
    }

    if (status && status !== 'All') {
      const statusNormalized = status.toUpperCase();
      params.push(statusNormalized);
      baseWhere += ` AND UPPER(status) = $${params.length}`;
    }

    // 1. Compute summary KPI stats across all filtered records
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_records,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN UPPER(payment_mode) = 'ONLINE' THEN amount ELSE 0 END), 0) as online_amount,
        COALESCE(SUM(CASE WHEN UPPER(payment_mode) = 'OFFLINE' THEN amount ELSE 0 END), 0) as offline_amount
      FROM miscellaneous_entries
      ${baseWhere}
    `;

    const summaryRows = await dbQuery(summaryQuery, params);
    const summaryRow = summaryRows[0] || {};
    const totalRecords = parseInt(summaryRow.total_records || 0, 10);
    const totalAmount = parseFloat(summaryRow.total_amount || 0);
    const onlineAmount = parseFloat(summaryRow.online_amount || 0);
    const offlineAmount = parseFloat(summaryRow.offline_amount || 0);

    // 2. Fetch paginated data table records
    const allowedSortFields = ['expense_date', 'created_at', 'amount', 'description', 'status'];
    const validSortBy = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
    const validSortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataQuery = `
      SELECT *
      FROM miscellaneous_entries
      ${baseWhere}
      ORDER BY ${validSortBy} ${validSortOrder}, id DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const records = await dbQuery(dataQuery, params);

    const totalPages = Math.ceil(totalRecords / limitNum) || 1;

    res.json({
      records,
      summary: {
        totalRecords,
        totalAmount,
        onlineAmount,
        offlineAmount
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching miscellaneous entries:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/miscellaneous/:id - Fetch single record by ID
export async function getMiscellaneousEntryById(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const rows = await dbQuery(
      `SELECT * FROM miscellaneous_entries WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Miscellaneous record not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching miscellaneous record by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/miscellaneous - Create a new entry
export async function createMiscellaneousEntry(req, res) {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const {
      description,
      expense_date,
      amount,
      payment_mode,
      account_number,
      bank_name,
      transaction_reference,
      payment_reference,
      notes,
      status = 'PAID'
    } = req.body;

    // Flexible Validation with fallbacks
    const finalDescription = (description && description.trim()) ? description.trim() : 'Miscellaneous Expense';
    const finalDate = expense_date || new Date().toISOString().split('T')[0];
    const parsedAmount = parseFloat(amount) || 0;
    const mode = (payment_mode && ['ONLINE', 'OFFLINE'].includes(payment_mode.toUpperCase())) ? payment_mode.toUpperCase() : 'ONLINE';

    const id = generateUuid();
    const now = new Date().toISOString();
    const validStatus = ['PAID', 'PENDING', 'CANCELLED'].includes(status?.toUpperCase()) ? status.toUpperCase() : 'PAID';

    await dbQuery(
      `INSERT INTO miscellaneous_entries (
        id, company_id, description, expense_date, amount, payment_mode,
        account_number, bank_name, transaction_reference, payment_reference,
        notes, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        companyId,
        finalDescription,
        finalDate,
        parsedAmount,
        mode,
        account_number ? account_number.trim() : null,
        bank_name ? bank_name.trim() : null,
        transaction_reference ? transaction_reference.trim() : null,
        payment_reference ? payment_reference.trim() : null,
        notes ? notes.trim() : null,
        validStatus,
        userId,
        now,
        now
      ]
    );

    const created = await dbQuery(`SELECT * FROM miscellaneous_entries WHERE id = $1`, [id]);
    res.status(201).json({ message: 'Miscellaneous record created successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating miscellaneous entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/miscellaneous/:id - Update existing entry
export async function updateMiscellaneousEntry(req, res) {
  try {
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const { id } = req.params;

    const existing = await dbQuery(
      `SELECT * FROM miscellaneous_entries WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Miscellaneous record not found.' });
    }

    const {
      description,
      expense_date,
      amount,
      payment_mode,
      account_number,
      bank_name,
      transaction_reference,
      payment_reference,
      notes,
      status
    } = req.body;

    const finalDescription = (description && description.trim()) ? description.trim() : (existing[0].description || 'Miscellaneous Expense');
    const finalDate = expense_date || existing[0].expense_date || new Date().toISOString().split('T')[0];
    const parsedAmount = amount !== undefined ? (parseFloat(amount) || 0) : (existing[0].amount || 0);
    const mode = (payment_mode && ['ONLINE', 'OFFLINE'].includes(payment_mode.toUpperCase())) ? payment_mode.toUpperCase() : (existing[0].payment_mode || 'ONLINE');

    const now = new Date().toISOString();
    const validStatus = ['PAID', 'PENDING', 'CANCELLED'].includes(status?.toUpperCase()) ? status.toUpperCase() : (existing[0].status || 'PAID');

    await dbQuery(
      `UPDATE miscellaneous_entries SET
        description = $1,
        expense_date = $2,
        amount = $3,
        payment_mode = $4,
        account_number = $5,
        bank_name = $6,
        transaction_reference = $7,
        payment_reference = $8,
        notes = $9,
        status = $10,
        updated_by = $11,
        updated_at = $12
       WHERE id = $13 AND company_id = $14 AND deleted_at IS NULL`,
      [
        finalDescription,
        finalDate,
        parsedAmount,
        mode,
        account_number ? account_number.trim() : null,
        bank_name ? bank_name.trim() : null,
        transaction_reference ? transaction_reference.trim() : null,
        payment_reference ? payment_reference.trim() : null,
        notes ? notes.trim() : null,
        validStatus,
        userId,
        now,
        id,
        companyId
      ]
    );

    const updated = await dbQuery(`SELECT * FROM miscellaneous_entries WHERE id = $1`, [id]);
    res.json({ message: 'Miscellaneous record updated successfully.', record: updated[0] });
  } catch (error) {
    console.error('Error updating miscellaneous entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/miscellaneous/:id - Soft-delete entry
export async function deleteMiscellaneousEntry(req, res) {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const existing = await dbQuery(
      `SELECT * FROM miscellaneous_entries WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Miscellaneous record not found.' });
    }

    const now = new Date().toISOString();

    await dbQuery(
      `UPDATE miscellaneous_entries SET deleted_at = $1 WHERE id = $2 AND company_id = $3`,
      [now, id, companyId]
    );

    res.json({ success: true, message: `Miscellaneous record ${id} soft-deleted successfully.` });
  } catch (error) {
    console.error('Error soft-deleting miscellaneous entry:', error);
    res.status(500).json({ error: error.message });
  }
}
