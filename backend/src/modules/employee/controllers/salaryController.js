import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/salaries - List salary structures with filters & KPI summary
export async function getSalaries(req, res) {
  try {
    const {
      employee_id = '',
      position_id = '',
      gender_id = '',
      shift_id = '',
      salary_frequency = 'All',
      status = 'All',
      search = ''
    } = req.query;

    let baseWhere = `WHERE s.deleted_at IS NULL`;
    const params = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      baseWhere += ` AND (e.full_name LIKE $${idx} OR e.employee_code LIKE $${idx} OR p.name LIKE $${idx} OR sh.name LIKE $${idx})`;
    }

    if (employee_id && employee_id.trim() !== '') {
      params.push(employee_id.trim());
      baseWhere += ` AND s.employee_id = $${params.length}`;
    }

    if (position_id && position_id.trim() !== '') {
      params.push(position_id.trim());
      baseWhere += ` AND s.position_id = $${params.length}`;
    }

    if (gender_id && gender_id.trim() !== '') {
      params.push(gender_id.trim());
      baseWhere += ` AND s.gender_id = $${params.length}`;
    }

    if (shift_id && shift_id.trim() !== '') {
      params.push(shift_id.trim());
      baseWhere += ` AND s.shift_id = $${params.length}`;
    }

    if (salary_frequency && salary_frequency !== 'All') {
      params.push(salary_frequency);
      baseWhere += ` AND LOWER(s.salary_frequency) = LOWER($${params.length})`;
    }

    if (status && status !== 'All') {
      params.push(status);
      baseWhere += ` AND LOWER(s.status) = LOWER($${params.length})`;
    }

    // Records Query
    const recordsQuery = `
      SELECT 
        s.*,
        e.employee_code,
        e.full_name as employee_name,
        p.name as position_name,
        g.name as gender_name,
        sh.name as shift_name
      FROM salary_structures s
      LEFT JOIN employees e ON s.employee_id = e.id
      LEFT JOIN positions p ON s.position_id = p.id
      LEFT JOIN genders g ON s.gender_id = g.id
      LEFT JOIN shifts sh ON s.shift_id = sh.id
      ${baseWhere}
      ORDER BY s.effective_from DESC, s.created_at DESC
    `;

    const records = await dbQuery(recordsQuery, params);

    // Summary calculation
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_salaries,
        COALESCE(SUM(CASE WHEN LOWER(s.salary_frequency) = 'daily' THEN 1 ELSE 0 END), 0) as daily_count,
        COALESCE(SUM(CASE WHEN LOWER(s.salary_frequency) = 'weekly' THEN 1 ELSE 0 END), 0) as weekly_count,
        COALESCE(SUM(CASE WHEN LOWER(s.salary_frequency) = 'monthly' THEN 1 ELSE 0 END), 0) as monthly_count,
        COALESCE(SUM(CASE WHEN LOWER(s.salary_frequency) = 'daily' THEN s.salary_amount ELSE 0 END), 0) as total_daily_amount,
        COALESCE(SUM(CASE WHEN LOWER(s.salary_frequency) = 'weekly' THEN s.salary_amount ELSE 0 END), 0) as total_weekly_amount,
        COALESCE(SUM(CASE WHEN LOWER(s.salary_frequency) = 'monthly' THEN s.salary_amount ELSE 0 END), 0) as total_monthly_amount
      FROM salary_structures s
      LEFT JOIN employees e ON s.employee_id = e.id
      LEFT JOIN positions p ON s.position_id = p.id
      LEFT JOIN genders g ON s.gender_id = g.id
      LEFT JOIN shifts sh ON s.shift_id = sh.id
      ${baseWhere}
    `;

    const summaryRows = await dbQuery(summaryQuery, params);
    const sumRow = summaryRows[0] || {};

    res.json({
      success: true,
      summary: {
        totalSalaries: parseInt(sumRow.total_salaries || 0, 10),
        dailyCount: parseInt(sumRow.daily_count || 0, 10),
        weeklyCount: parseInt(sumRow.weekly_count || 0, 10),
        monthlyCount: parseInt(sumRow.monthly_count || 0, 10),
        totalDailyAmount: parseFloat(sumRow.total_daily_amount || 0),
        totalWeeklyAmount: parseFloat(sumRow.total_weekly_amount || 0),
        totalMonthlyAmount: parseFloat(sumRow.total_monthly_amount || 0)
      },
      records
    });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/salaries/:id
export async function getSalaryById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(
      `SELECT 
        s.*,
        e.employee_code,
        e.full_name as employee_name,
        p.name as position_name,
        g.name as gender_name,
        sh.name as shift_name
       FROM salary_structures s
       LEFT JOIN employees e ON s.employee_id = e.id
       LEFT JOIN positions p ON s.position_id = p.id
       LEFT JOIN genders g ON s.gender_id = g.id
       LEFT JOIN shifts sh ON s.shift_id = sh.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Salary structure not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching salary by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/salaries - Create salary structure
export async function createSalary(req, res) {
  try {
    const {
      employee_id,
      position_id,
      gender_id,
      shift_id,
      salary_frequency,
      salary_amount,
      effective_from,
      effective_to,
      status = 'Active'
    } = req.body;

    if (!salary_frequency || !['Daily', 'Weekly', 'Monthly'].includes(salary_frequency)) {
      return res.status(400).json({ error: 'Salary frequency must be Daily, Weekly, or Monthly.' });
    }

    const amount = parseFloat(salary_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Salary amount must be a positive number.' });
    }

    if (!effective_from) {
      return res.status(400).json({ error: 'Effective From date is required.' });
    }

    if (effective_to && effective_to < effective_from) {
      return res.status(400).json({ error: 'Effective To date cannot be earlier than Effective From date.' });
    }

    if (!employee_id && !position_id && !gender_id && !shift_id) {
      return res.status(400).json({
        error: 'At least one salary applicability target (Employee, Position, Gender, or Shift) must be configured.'
      });
    }

    const id = generateUuid();
    const now = new Date().toISOString();
    const statusVal = ['Active', 'Inactive'].includes(status) ? status : 'Active';

    await dbQuery(
      `INSERT INTO salary_structures (
        id, employee_id, position_id, gender_id, shift_id,
        salary_frequency, salary_amount, effective_from, effective_to, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        employee_id || null,
        position_id || null,
        gender_id || null,
        shift_id || null,
        salary_frequency,
        amount,
        effective_from,
        effective_to || null,
        statusVal,
        now,
        now
      ]
    );

    const created = await dbQuery(
      `SELECT 
        s.*,
        e.employee_code,
        e.full_name as employee_name,
        p.name as position_name,
        g.name as gender_name,
        sh.name as shift_name
       FROM salary_structures s
       LEFT JOIN employees e ON s.employee_id = e.id
       LEFT JOIN positions p ON s.position_id = p.id
       LEFT JOIN genders g ON s.gender_id = g.id
       LEFT JOIN shifts sh ON s.shift_id = sh.id
       WHERE s.id = $1`,
      [id]
    );

    res.status(201).json({ message: 'Salary structure created successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating salary structure:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/salaries/:id - Update salary while preserving historical record
export async function updateSalary(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM salary_structures WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Salary structure not found.' });
    }

    const {
      employee_id,
      position_id,
      gender_id,
      shift_id,
      salary_frequency,
      salary_amount,
      effective_from,
      effective_to,
      status,
      preserve_history = true
    } = req.body;

    if (!salary_frequency || !['Daily', 'Weekly', 'Monthly'].includes(salary_frequency)) {
      return res.status(400).json({ error: 'Salary frequency must be Daily, Weekly, or Monthly.' });
    }

    const amount = parseFloat(salary_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Salary amount must be a positive number.' });
    }

    if (!effective_from) {
      return res.status(400).json({ error: 'Effective From date is required.' });
    }

    const now = new Date().toISOString();
    const statusVal = ['Active', 'Inactive'].includes(status) ? status : 'Active';

    if (preserve_history && existing[0].effective_from < effective_from) {
      // Close existing salary structure with effective_to set to day before new effective_from
      const prevEffectiveTo = new Date(new Date(effective_from).getTime() - 86400000).toISOString().split('T')[0];
      
      await dbQuery(
        `UPDATE salary_structures SET effective_to = $1, status = 'Inactive', updated_at = $2 WHERE id = $3`,
        [prevEffectiveTo, now, id]
      );

      // Create new active salary structure
      const newId = generateUuid();
      await dbQuery(
        `INSERT INTO salary_structures (
          id, employee_id, position_id, gender_id, shift_id,
          salary_frequency, salary_amount, effective_from, effective_to, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newId,
          employee_id || null,
          position_id || null,
          gender_id || null,
          shift_id || null,
          salary_frequency,
          amount,
          effective_from,
          effective_to || null,
          statusVal,
          now,
          now
        ]
      );

      const created = await dbQuery(
        `SELECT s.*, e.full_name as employee_name, p.name as position_name
         FROM salary_structures s
         LEFT JOIN employees e ON s.employee_id = e.id
         LEFT JOIN positions p ON s.position_id = p.id
         WHERE s.id = $1`,
        [newId]
      );

      return res.json({
        message: 'Salary structure updated and new historical record created.',
        record: created[0]
      });
    } else {
      // Direct update if effective date is unchanged or history override requested
      await dbQuery(
        `UPDATE salary_structures SET
          employee_id = $1,
          position_id = $2,
          gender_id = $3,
          shift_id = $4,
          salary_frequency = $5,
          salary_amount = $6,
          effective_from = $7,
          effective_to = $8,
          status = $9,
          updated_at = $10
         WHERE id = $11`,
        [
          employee_id || null,
          position_id || null,
          gender_id || null,
          shift_id || null,
          salary_frequency,
          amount,
          effective_from,
          effective_to || null,
          statusVal,
          now,
          id
        ]
      );

      const updated = await dbQuery(
        `SELECT s.*, e.full_name as employee_name, p.name as position_name
         FROM salary_structures s
         LEFT JOIN employees e ON s.employee_id = e.id
         LEFT JOIN positions p ON s.position_id = p.id
         WHERE s.id = $1`,
        [id]
      );

      return res.json({ message: 'Salary structure updated successfully.', record: updated[0] });
    }
  } catch (error) {
    console.error('Error updating salary structure:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/salaries/:id - Soft delete
export async function deleteSalary(req, res) {
  try {
    const { id } = req.params;

    const existing = await dbQuery(`SELECT * FROM salary_structures WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Salary structure not found.' });
    }

    const now = new Date().toISOString();
    await dbQuery(`UPDATE salary_structures SET deleted_at = $1 WHERE id = $2`, [now, id]);

    res.json({ success: true, message: `Salary structure record soft-deleted successfully.` });
  } catch (error) {
    console.error('Error deleting salary structure:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/salaries/calculate/:employee_id - Evaluate applicable salary using priority resolution
export async function calculateEmployeeSalary(req, res) {
  try {
    const { employee_id } = req.params;
    const { target_date = new Date().toISOString().split('T')[0] } = req.query;

    const empRows = await dbQuery(`SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL`, [employee_id]);
    if (!empRows || empRows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const emp = empRows[0];

    // Priority 1: Employee-specific
    let sal = await dbQuery(
      `SELECT * FROM salary_structures
       WHERE employee_id = $1 AND status = 'Active' AND deleted_at IS NULL
         AND effective_from <= $2 AND (effective_to IS NULL OR effective_to >= $2)
       ORDER BY effective_from DESC LIMIT 1`,
      [emp.id, target_date]
    );

    if (sal && sal.length > 0) {
      return res.json({
        matched_by: 'Employee-Specific Direct Structure',
        priority: 1,
        salary: sal[0]
      });
    }

    // Priority 2: Position + Shift + Gender
    sal = await dbQuery(
      `SELECT * FROM salary_structures
       WHERE position_id = $1 AND shift_id = $2 AND gender_id = $3 AND status = 'Active' AND deleted_at IS NULL
         AND effective_from <= $4 AND (effective_to IS NULL OR effective_to >= $4)
       ORDER BY effective_from DESC LIMIT 1`,
      [emp.position_id, emp.default_shift_id, emp.gender_id, target_date]
    );

    if (sal && sal.length > 0) {
      return res.json({
        matched_by: 'Position + Shift + Gender Matrix Structure',
        priority: 2,
        salary: sal[0]
      });
    }

    // Priority 3: Position + Shift
    sal = await dbQuery(
      `SELECT * FROM salary_structures
       WHERE position_id = $1 AND shift_id = $2 AND (gender_id IS NULL OR gender_id = '') AND status = 'Active' AND deleted_at IS NULL
         AND effective_from <= $3 AND (effective_to IS NULL OR effective_to >= $3)
       ORDER BY effective_from DESC LIMIT 1`,
      [emp.position_id, emp.default_shift_id, target_date]
    );

    if (sal && sal.length > 0) {
      return res.json({
        matched_by: 'Position + Shift Matrix Structure',
        priority: 3,
        salary: sal[0]
      });
    }

    // Priority 4: Position + Gender
    sal = await dbQuery(
      `SELECT * FROM salary_structures
       WHERE position_id = $1 AND (shift_id IS NULL OR shift_id = '') AND gender_id = $2 AND status = 'Active' AND deleted_at IS NULL
         AND effective_from <= $3 AND (effective_to IS NULL OR effective_to >= $3)
       ORDER BY effective_from DESC LIMIT 1`,
      [emp.position_id, emp.gender_id, target_date]
    );

    if (sal && sal.length > 0) {
      return res.json({
        matched_by: 'Position + Gender Matrix Structure',
        priority: 4,
        salary: sal[0]
      });
    }

    // Priority 5: Position Default
    sal = await dbQuery(
      `SELECT * FROM salary_structures
       WHERE position_id = $1 AND (shift_id IS NULL OR shift_id = '') AND (gender_id IS NULL OR gender_id = '') AND status = 'Active' AND deleted_at IS NULL
         AND effective_from <= $2 AND (effective_to IS NULL OR effective_to >= $2)
       ORDER BY effective_from DESC LIMIT 1`,
      [emp.position_id, target_date]
    );

    if (sal && sal.length > 0) {
      return res.json({
        matched_by: 'Position Default Structure',
        priority: 5,
        salary: sal[0]
      });
    }

    return res.json({
      matched_by: 'None',
      priority: null,
      salary: null,
      message: 'No applicable salary structure found for this employee configuration.'
    });
  } catch (error) {
    console.error('Error calculating employee salary:', error);
    res.status(500).json({ error: error.message });
  }
}
