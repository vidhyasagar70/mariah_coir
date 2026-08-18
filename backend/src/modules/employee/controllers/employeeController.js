import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/employees - List employees with filters & summary KPIs
export async function getEmployees(req, res) {
  try {
    const {
      search = '',
      position_id = '',
      gender_id = '',
      shift_id = '',
      employment_status = 'All'
    } = req.query;

    let baseWhere = `WHERE e.deleted_at IS NULL`;
    const params = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      baseWhere += ` AND (e.employee_code LIKE $${idx} OR e.full_name LIKE $${idx} OR e.phone LIKE $${idx} OR e.address LIKE $${idx})`;
    }

    if (position_id && position_id.trim() !== '') {
      params.push(position_id.trim());
      baseWhere += ` AND e.position_id = $${params.length}`;
    }

    if (gender_id && gender_id.trim() !== '') {
      params.push(gender_id.trim());
      baseWhere += ` AND e.gender_id = $${params.length}`;
    }

    if (shift_id && shift_id.trim() !== '') {
      params.push(shift_id.trim());
      baseWhere += ` AND e.default_shift_id = $${params.length}`;
    }

    if (employment_status && employment_status !== 'All') {
      params.push(employment_status);
      baseWhere += ` AND LOWER(e.employment_status) = LOWER($${params.length})`;
    }

    // Summary KPIs query
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_employees,
        COALESCE(SUM(CASE WHEN LOWER(e.employment_status) = 'active' THEN 1 ELSE 0 END), 0) as active_employees,
        COALESCE(SUM(CASE WHEN LOWER(e.employment_status) = 'inactive' THEN 1 ELSE 0 END), 0) as inactive_employees
      FROM employees e
      ${baseWhere}
    `;

    const summaryRows = await dbQuery(summaryQuery, params);
    const summary = summaryRows[0] || { total_employees: 0, active_employees: 0, inactive_employees: 0 };

    // Fetch records joined with master data
    const recordsQuery = `
      SELECT 
        e.*,
        p.name as position_name,
        g.name as gender_name,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time
      FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN genders g ON e.gender_id = g.id
      LEFT JOIN shifts s ON e.default_shift_id = s.id
      ${baseWhere}
      ORDER BY e.created_at DESC, e.full_name ASC
    `;

    const records = await dbQuery(recordsQuery, params);

    res.json({
      success: true,
      summary: {
        totalEmployees: parseInt(summary.total_employees || 0, 10),
        activeEmployees: parseInt(summary.active_employees || 0, 10),
        inactiveEmployees: parseInt(summary.inactive_employees || 0, 10)
      },
      records
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/employees/:id
export async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;

    const rows = await dbQuery(
      `SELECT 
        e.*,
        p.name as position_name,
        g.name as gender_name,
        s.name as shift_name
       FROM employees e
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN genders g ON e.gender_id = g.id
       LEFT JOIN shifts s ON e.default_shift_id = s.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching employee by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/employees
export async function createEmployee(req, res) {
  try {
    const {
      employee_code,
      full_name,
      gender_id,
      position_id,
      default_shift_id,
      date_of_birth,
      joining_date,
      phone,
      address,
      employment_status = 'Active'
    } = req.body;

    if (!employee_code || employee_code.trim() === '') {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    if (!full_name || full_name.trim() === '') {
      return res.status(400).json({ error: 'Employee Name is required.' });
    }

    if (!gender_id) {
      return res.status(400).json({ error: 'Gender is required.' });
    }

    if (!position_id) {
      return res.status(400).json({ error: 'Position is required.' });
    }

    if (!default_shift_id) {
      return res.status(400).json({ error: 'Default Shift is required.' });
    }

    if (!joining_date) {
      return res.status(400).json({ error: 'Joining Date is required.' });
    }

    // Unique Employee ID validation
    const existingCode = await dbQuery(
      `SELECT id FROM employees WHERE LOWER(employee_code) = LOWER($1) AND deleted_at IS NULL`,
      [employee_code.trim()]
    );

    if (existingCode && existingCode.length > 0) {
      return res.status(400).json({ error: `Employee ID '${employee_code.trim()}' is already in use.` });
    }

    const id = generateUuid();
    const now = new Date().toISOString();
    const statusVal = ['Active', 'Inactive'].includes(employment_status) ? employment_status : 'Active';

    await dbQuery(
      `INSERT INTO employees (
        id, employee_code, full_name, gender_id, position_id, default_shift_id,
        date_of_birth, joining_date, phone, address, employment_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        employee_code.trim(),
        full_name.trim(),
        gender_id,
        position_id,
        default_shift_id,
        date_of_birth || null,
        joining_date,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        statusVal,
        now,
        now
      ]
    );

    const created = await dbQuery(
      `SELECT e.*, p.name as position_name, g.name as gender_name, s.name as shift_name
       FROM employees e
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN genders g ON e.gender_id = g.id
       LEFT JOIN shifts s ON e.default_shift_id = s.id
       WHERE e.id = $1`,
      [id]
    );

    res.status(201).json({ message: 'Employee created successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/employees/:id
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const {
      employee_code,
      full_name,
      gender_id,
      position_id,
      default_shift_id,
      date_of_birth,
      joining_date,
      phone,
      address,
      employment_status
    } = req.body;

    if (!employee_code || employee_code.trim() === '') {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }

    if (!full_name || full_name.trim() === '') {
      return res.status(400).json({ error: 'Employee Name is required.' });
    }

    if (!gender_id) {
      return res.status(400).json({ error: 'Gender is required.' });
    }

    if (!position_id) {
      return res.status(400).json({ error: 'Position is required.' });
    }

    if (!default_shift_id) {
      return res.status(400).json({ error: 'Default Shift is required.' });
    }

    if (!joining_date) {
      return res.status(400).json({ error: 'Joining Date is required.' });
    }

    // Code duplicate check
    const duplicateCode = await dbQuery(
      `SELECT id FROM employees WHERE LOWER(employee_code) = LOWER($1) AND id != $2 AND deleted_at IS NULL`,
      [employee_code.trim(), id]
    );

    if (duplicateCode && duplicateCode.length > 0) {
      return res.status(400).json({ error: `Employee ID '${employee_code.trim()}' is already in use.` });
    }

    const now = new Date().toISOString();
    const statusVal = ['Active', 'Inactive'].includes(employment_status) ? employment_status : (existing[0].employment_status || 'Active');

    await dbQuery(
      `UPDATE employees SET
        employee_code = $1,
        full_name = $2,
        gender_id = $3,
        position_id = $4,
        default_shift_id = $5,
        date_of_birth = $6,
        joining_date = $7,
        phone = $8,
        address = $9,
        employment_status = $10,
        updated_at = $11
       WHERE id = $12`,
      [
        employee_code.trim(),
        full_name.trim(),
        gender_id,
        position_id,
        default_shift_id,
        date_of_birth || null,
        joining_date,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        statusVal,
        now,
        id
      ]
    );

    const updated = await dbQuery(
      `SELECT e.*, p.name as position_name, g.name as gender_name, s.name as shift_name
       FROM employees e
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN genders g ON e.gender_id = g.id
       LEFT JOIN shifts s ON e.default_shift_id = s.id
       WHERE e.id = $1`,
      [id]
    );

    res.json({ message: 'Employee updated successfully.', record: updated[0] });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/employees/:id - Soft Delete
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    const existing = await dbQuery(`SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const now = new Date().toISOString();
    await dbQuery(`UPDATE employees SET deleted_at = $1 WHERE id = $2`, [now, id]);

    res.json({ success: true, message: `Employee '${existing[0].full_name}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: error.message });
  }
}
