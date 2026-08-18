import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/attendance - List attendance records with filters & summary KPIs
export async function getAttendance(req, res) {
  try {
    const {
      date = '',
      date_from = '',
      date_to = '',
      employee_id = '',
      position_id = '',
      shift_id = '',
      attendance_status = 'All',
      entry_type = 'All', // 'All', 'Employee', 'Position'
      search = ''
    } = req.query;

    let baseWhere = `WHERE a.deleted_at IS NULL`;
    const params = [];

    if (date && date.trim() !== '') {
      params.push(date.trim());
      baseWhere += ` AND a.attendance_date = $${params.length}`;
    }

    if (date_from && date_from.trim() !== '') {
      params.push(date_from.trim());
      baseWhere += ` AND a.attendance_date >= $${params.length}`;
    }

    if (date_to && date_to.trim() !== '') {
      params.push(date_to.trim());
      baseWhere += ` AND a.attendance_date <= $${params.length}`;
    }

    if (employee_id && employee_id.trim() !== '') {
      params.push(employee_id.trim());
      baseWhere += ` AND a.employee_id = $${params.length}`;
    }

    if (position_id && position_id.trim() !== '') {
      params.push(position_id.trim());
      baseWhere += ` AND a.position_id = $${params.length}`;
    }

    if (shift_id && shift_id.trim() !== '') {
      params.push(shift_id.trim());
      baseWhere += ` AND a.shift_id = $${params.length}`;
    }

    if (attendance_status && attendance_status !== 'All') {
      params.push(attendance_status);
      baseWhere += ` AND LOWER(a.attendance_status) = LOWER($${params.length})`;
    }

    if (entry_type === 'Employee') {
      baseWhere += ` AND a.employee_id IS NOT NULL`;
    } else if (entry_type === 'Position') {
      baseWhere += ` AND (a.employee_id IS NULL OR a.employee_id = '')`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      baseWhere += ` AND (e.full_name LIKE $${idx} OR e.employee_code LIKE $${idx} OR p.name LIKE $${idx} OR sh.name LIKE $${idx})`;
    }

    // Records Query
    const recordsQuery = `
      SELECT 
        a.*,
        e.employee_code,
        COALESCE(e.full_name, 'Position Log (' || p.name || ')') as employee_name,
        e.phone as employee_phone,
        p.name as position_name,
        sh.name as shift_name,
        sh.start_time as shift_start_time,
        sh.end_time as shift_end_time,
        CASE WHEN a.employee_id IS NOT NULL THEN 'Employee' ELSE 'Position' END as entry_type
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN positions p ON a.position_id = p.id
      LEFT JOIN shifts sh ON a.shift_id = sh.id
      ${baseWhere}
      ORDER BY a.attendance_date DESC, a.created_at DESC
    `;

    const records = await dbQuery(recordsQuery, params);

    // Summary calculation
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_records,
        COALESCE(SUM(CASE WHEN LOWER(a.attendance_status) = 'present' THEN 1 ELSE 0 END), 0) as present_count,
        COALESCE(SUM(CASE WHEN LOWER(a.attendance_status) = 'absent' THEN 1 ELSE 0 END), 0) as absent_count,
        COALESCE(SUM(CASE WHEN LOWER(a.attendance_status) = 'half day' THEN 1 ELSE 0 END), 0) as half_day_count,
        COALESCE(SUM(CASE WHEN LOWER(a.attendance_status) = 'leave' THEN 1 ELSE 0 END), 0) as leave_count,
        COALESCE(SUM(a.count), 0) as total_attendance_count
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN positions p ON a.position_id = p.id
      LEFT JOIN shifts sh ON a.shift_id = sh.id
      ${baseWhere}
    `;

    const summaryRows = await dbQuery(summaryQuery, params);
    const sumRow = summaryRows[0] || {};

    res.json({
      success: true,
      summary: {
        totalRecords: parseInt(sumRow.total_records || 0, 10),
        presentCount: parseInt(sumRow.present_count || 0, 10),
        absentCount: parseInt(sumRow.absent_count || 0, 10),
        halfDayCount: parseInt(sumRow.half_day_count || 0, 10),
        leaveCount: parseInt(sumRow.leave_count || 0, 10),
        totalAttendanceCount: parseFloat(sumRow.total_attendance_count || 0)
      },
      records
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/attendance/:id
export async function getAttendanceById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(
      `SELECT 
        a.*,
        e.employee_code,
        COALESCE(e.full_name, 'Position Log (' || p.name || ')') as employee_name,
        p.name as position_name,
        sh.name as shift_name
       FROM attendance a
       LEFT JOIN employees e ON a.employee_id = e.id
       LEFT JOIN positions p ON a.position_id = p.id
       LEFT JOIN shifts sh ON a.shift_id = sh.id
       WHERE a.id = $1 AND a.deleted_at IS NULL`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching attendance by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/attendance - Single Entry (Supports both Employee-Based and Position-Based)
export async function createAttendance(req, res) {
  try {
    const {
      attendance_date = new Date().toISOString().split('T')[0],
      entry_type = 'Employee', // 'Employee' or 'Position'
      employee_id,
      position_id,
      shift_id,
      attendance_status = 'Present',
      count = 1,
      notes
    } = req.body;

    if (!attendance_date) {
      return res.status(400).json({ error: 'Attendance date is required.' });
    }

    let finalEmployeeId = null;
    let finalPositionId = position_id;
    let finalShiftId = shift_id;

    if (entry_type === 'Employee' || employee_id) {
      if (!employee_id) {
        return res.status(400).json({ error: 'Employee is required for Employee-based attendance.' });
      }
      const empRows = await dbQuery(`SELECT * FROM employees WHERE id = $1 AND deleted_at IS NULL`, [employee_id]);
      if (!empRows || empRows.length === 0) {
        return res.status(400).json({ error: 'Selected employee does not exist or is deleted.' });
      }
      const emp = empRows[0];
      finalEmployeeId = emp.id;
      finalPositionId = position_id || emp.position_id;
      finalShiftId = shift_id || emp.default_shift_id;
    } else {
      // Position-based attendance
      if (!position_id) {
        return res.status(400).json({ error: 'Position is required for Position-based attendance.' });
      }
      if (!shift_id) {
        return res.status(400).json({ error: 'Shift is required for Position-based attendance.' });
      }
    }

    if (!['Present', 'Absent', 'Half Day', 'Leave'].includes(attendance_status)) {
      return res.status(400).json({ error: 'Invalid attendance status.' });
    }

    let defaultCount = parseFloat(count);
    if (isNaN(defaultCount) || defaultCount < 0) {
      if (attendance_status === 'Present') defaultCount = 1.0;
      else if (attendance_status === 'Half Day') defaultCount = 0.5;
      else defaultCount = 0.0;
    }

    // Check duplicate attendance record
    if (finalEmployeeId) {
      const existing = await dbQuery(
        `SELECT id FROM attendance 
         WHERE attendance_date = $1 AND employee_id = $2 AND shift_id = $3 AND deleted_at IS NULL`,
        [attendance_date, finalEmployeeId, finalShiftId]
      );
      if (existing && existing.length > 0) {
        return res.status(400).json({
          error: `Attendance record already exists for this employee on ${attendance_date}. Please update the existing record.`
        });
      }
    } else {
      const existing = await dbQuery(
        `SELECT id FROM attendance 
         WHERE attendance_date = $1 AND position_id = $2 AND shift_id = $3 AND (employee_id IS NULL OR employee_id = '') AND deleted_at IS NULL`,
        [attendance_date, finalPositionId, finalShiftId]
      );
      if (existing && existing.length > 0) {
        // Upsert position-based log count
        const now = new Date().toISOString();
        await dbQuery(
          `UPDATE attendance SET count = $1, attendance_status = $2, notes = $3, updated_at = $4 WHERE id = $5`,
          [defaultCount, attendance_status, notes ? notes.trim() : null, now, existing[0].id]
        );

        const updated = await dbQuery(
          `SELECT a.*, p.name as position_name, sh.name as shift_name
           FROM attendance a
           LEFT JOIN positions p ON a.position_id = p.id
           LEFT JOIN shifts sh ON a.shift_id = sh.id
           WHERE a.id = $1`,
          [existing[0].id]
        );

        return res.json({ message: 'Position attendance log updated successfully.', record: updated[0] });
      }
    }

    const id = generateUuid();
    const now = new Date().toISOString();

    await dbQuery(
      `INSERT INTO attendance (
        id, attendance_date, employee_id, position_id, shift_id,
        attendance_status, count, notes, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        attendance_date,
        finalEmployeeId,
        finalPositionId,
        finalShiftId,
        attendance_status,
        defaultCount,
        notes ? notes.trim() : null,
        'user',
        now,
        now
      ]
    );

    const created = await dbQuery(
      `SELECT a.*, e.employee_code, COALESCE(e.full_name, 'Position Log (' || p.name || ')') as employee_name, p.name as position_name, sh.name as shift_name
       FROM attendance a
       LEFT JOIN employees e ON a.employee_id = e.id
       LEFT JOIN positions p ON a.position_id = p.id
       LEFT JOIN shifts sh ON a.shift_id = sh.id
       WHERE a.id = $1`,
      [id]
    );

    res.status(201).json({ message: 'Attendance recorded successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/attendance/bulk - Fast Bulk Attendance Entry
export async function bulkAttendance(req, res) {
  try {
    const { attendance_date, shift_id, entries = [] } = req.body;

    if (!attendance_date) {
      return res.status(400).json({ error: 'Attendance date is required.' });
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'No attendance entries provided.' });
    }

    const now = new Date().toISOString();
    let savedCount = 0;

    for (const entry of entries) {
      const {
        employee_id,
        position_id,
        shift_id: entryShiftId,
        attendance_status = 'Present',
        count,
        notes
      } = entry;

      const finalShift = entryShiftId || shift_id;
      if (!position_id && !employee_id) continue;

      let cnt = parseFloat(count);
      if (isNaN(cnt)) {
        if (attendance_status === 'Present') cnt = 1.0;
        else if (attendance_status === 'Half Day') cnt = 0.5;
        else cnt = 0.0;
      }

      if (employee_id) {
        // Employee-based batch row
        const existing = await dbQuery(
          `SELECT id FROM attendance 
           WHERE attendance_date = $1 AND employee_id = $2 AND shift_id = $3 AND deleted_at IS NULL`,
          [attendance_date, employee_id, finalShift]
        );

        if (existing && existing.length > 0) {
          await dbQuery(
            `UPDATE attendance SET
              position_id = $1,
              attendance_status = $2,
              count = $3,
              notes = $4,
              updated_at = $5
             WHERE id = $6`,
            [position_id, attendance_status, cnt, notes || null, now, existing[0].id]
          );
        } else {
          const id = generateUuid();
          await dbQuery(
            `INSERT INTO attendance (
              id, attendance_date, employee_id, position_id, shift_id,
              attendance_status, count, notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              id,
              attendance_date,
              employee_id,
              position_id,
              finalShift,
              attendance_status,
              cnt,
              notes || null,
              'user',
              now,
              now
            ]
          );
        }
      } else {
        // Position-based batch row
        const existing = await dbQuery(
          `SELECT id FROM attendance 
           WHERE attendance_date = $1 AND position_id = $2 AND shift_id = $3 AND (employee_id IS NULL OR employee_id = '') AND deleted_at IS NULL`,
          [attendance_date, position_id, finalShift]
        );

        if (existing && existing.length > 0) {
          await dbQuery(
            `UPDATE attendance SET
              attendance_status = $1,
              count = $2,
              notes = $3,
              updated_at = $4
             WHERE id = $5`,
            [attendance_status, cnt, notes || null, now, existing[0].id]
          );
        } else {
          const id = generateUuid();
          await dbQuery(
            `INSERT INTO attendance (
              id, attendance_date, employee_id, position_id, shift_id,
              attendance_status, count, notes, created_by, created_at, updated_at
            ) VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              id,
              attendance_date,
              position_id,
              finalShift,
              attendance_status,
              cnt,
              notes || null,
              'user',
              now,
              now
            ]
          );
        }
      }
      savedCount++;
    }

    res.json({
      success: true,
      message: `Successfully recorded attendance logs for ${savedCount} item(s) on ${attendance_date}.`
    });
  } catch (error) {
    console.error('Error saving bulk attendance:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/attendance/:id
export async function updateAttendance(req, res) {
  try {
    const { id } = req.params;
    const existing = await dbQuery(`SELECT * FROM attendance WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    const {
      attendance_date,
      position_id,
      shift_id,
      attendance_status,
      count,
      notes
    } = req.body;

    const now = new Date().toISOString();

    let cnt = parseFloat(count);
    if (isNaN(cnt)) {
      if (attendance_status === 'Present') cnt = 1.0;
      else if (attendance_status === 'Half Day') cnt = 0.5;
      else cnt = 0.0;
    }

    await dbQuery(
      `UPDATE attendance SET
        attendance_date = $1,
        position_id = $2,
        shift_id = $3,
        attendance_status = $4,
        count = $5,
        notes = $6,
        updated_at = $7
       WHERE id = $8`,
      [
        attendance_date || existing[0].attendance_date,
        position_id || existing[0].position_id,
        shift_id || existing[0].shift_id,
        attendance_status || existing[0].attendance_status,
        cnt,
        notes !== undefined ? notes : existing[0].notes,
        now,
        id
      ]
    );

    const updated = await dbQuery(
      `SELECT a.*, e.employee_code, COALESCE(e.full_name, 'Position Log (' || p.name || ')') as employee_name, p.name as position_name, sh.name as shift_name
       FROM attendance a
       LEFT JOIN employees e ON a.employee_id = e.id
       LEFT JOIN positions p ON a.position_id = p.id
       LEFT JOIN shifts sh ON a.shift_id = sh.id
       WHERE a.id = $1`,
      [id]
    );

    res.json({ message: 'Attendance record updated successfully.', record: updated[0] });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/attendance/:id - Soft Delete
export async function deleteAttendance(req, res) {
  try {
    const { id } = req.params;

    const existing = await dbQuery(`SELECT * FROM attendance WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    const now = new Date().toISOString();
    await dbQuery(`UPDATE attendance SET deleted_at = $1 WHERE id = $2`, [now, id]);

    res.json({ success: true, message: `Attendance record deleted successfully.` });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/attendance/reports - Aggregated reports datasets
export async function getAttendanceReports(req, res) {
  try {
    const { date_from = '', date_to = '', position_id = '', shift_id = '' } = req.query;

    let baseWhere = `WHERE a.deleted_at IS NULL`;
    const params = [];

    if (date_from) {
      params.push(date_from);
      baseWhere += ` AND a.attendance_date >= $${params.length}`;
    }

    if (date_to) {
      params.push(date_to);
      baseWhere += ` AND a.attendance_date <= $${params.length}`;
    }

    if (position_id) {
      params.push(position_id);
      baseWhere += ` AND a.position_id = $${params.length}`;
    }

    if (shift_id) {
      params.push(shift_id);
      baseWhere += ` AND a.shift_id = $${params.length}`;
    }

    // 1. Position Breakdown Report
    const positionReport = await dbQuery(`
      SELECT 
        p.name as position_name,
        COUNT(a.id) as total_entries,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'half day' THEN 1 ELSE 0 END) as half_day_count,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'leave' THEN 1 ELSE 0 END) as leave_count,
        SUM(a.count) as total_headcount
      FROM attendance a
      LEFT JOIN positions p ON a.position_id = p.id
      ${baseWhere}
      GROUP BY p.name
      ORDER BY present_count DESC
    `, params);

    // 2. Shift Breakdown Report
    const shiftReport = await dbQuery(`
      SELECT 
        sh.name as shift_name,
        COUNT(a.id) as total_entries,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'half day' THEN 1 ELSE 0 END) as half_day_count,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'leave' THEN 1 ELSE 0 END) as leave_count,
        SUM(a.count) as total_headcount
      FROM attendance a
      LEFT JOIN shifts sh ON a.shift_id = sh.id
      ${baseWhere}
      GROUP BY sh.name
      ORDER BY present_count DESC
    `, params);

    // 3. Employee Summary Report
    const employeeReport = await dbQuery(`
      SELECT 
        e.id as employee_id,
        e.employee_code,
        COALESCE(e.full_name, 'Position Log (' || p.name || ')') as employee_name,
        p.name as position_name,
        sh.name as shift_name,
        COUNT(a.id) as total_days_logged,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'half day' THEN 1 ELSE 0 END) as half_days,
        SUM(CASE WHEN LOWER(a.attendance_status) = 'leave' THEN 1 ELSE 0 END) as leave_days,
        SUM(a.count) as effective_attendance_count
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN positions p ON a.position_id = p.id
      LEFT JOIN shifts sh ON a.shift_id = sh.id
      ${baseWhere}
      GROUP BY e.id, e.employee_code, e.full_name, p.name, sh.name
      ORDER BY employee_name ASC
    `, params);

    res.json({
      success: true,
      positionReport,
      shiftReport,
      employeeReport
    });
  } catch (error) {
    console.error('Error generating attendance reports:', error);
    res.status(500).json({ error: error.message });
  }
}
