import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/shifts
export async function getShifts(req, res) {
  try {
    const { search = '', status = 'All' } = req.query;

    let sql = `SELECT * FROM shifts WHERE deleted_at IS NULL`;
    const params = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      sql += ` AND (name LIKE $${params.length} OR description LIKE $${params.length})`;
    }

    if (status && status !== 'All') {
      const isStatusActive = status.toLowerCase() === 'active' || status === '1' || status === 'true';
      params.push(isStatusActive ? 1 : 0);
      sql += ` AND (status = $${params.length} OR status = ${isStatusActive ? 'TRUE' : 'FALSE'})`;
    }

    sql += ` ORDER BY name ASC`;

    const records = await dbQuery(sql, params);

    res.json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/shifts/:id
export async function getShiftById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM shifts WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching shift by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/shifts
export async function createShift(req, res) {
  try {
    const { name, start_time, end_time, break_duration = 0, description, status = true } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Shift name is required.' });
    }

    if (!start_time || start_time.trim() === '') {
      return res.status(400).json({ error: 'Start time is required.' });
    }

    if (!end_time || end_time.trim() === '') {
      return res.status(400).json({ error: 'End time is required.' });
    }

    const breakMinutes = parseInt(break_duration, 10) || 0;
    if (breakMinutes < 0) {
      return res.status(400).json({ error: 'Break duration cannot be negative.' });
    }

    const existing = await dbQuery(
      `SELECT id FROM shifts WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
      [name.trim()]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: `Shift '${name.trim()}' already exists.` });
    }

    const id = generateUuid();
    const now = new Date().toISOString();
    const isStatusActive = status === true || status === 1 || status === '1' || status === 'true';

    await dbQuery(
      `INSERT INTO shifts (id, name, start_time, end_time, break_duration, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, name.trim(), start_time.trim(), end_time.trim(), breakMinutes, description ? description.trim() : null, isStatusActive ? 1 : 0, now, now]
    );

    const created = await dbQuery(`SELECT * FROM shifts WHERE id = $1`, [id]);
    res.status(201).json({ message: 'Shift created successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/shifts/:id
export async function updateShift(req, res) {
  try {
    const { id } = req.params;
    const { name, start_time, end_time, break_duration, description, status } = req.body;

    const existing = await dbQuery(`SELECT * FROM shifts WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Shift name is required.' });
    }

    if (!start_time || start_time.trim() === '') {
      return res.status(400).json({ error: 'Start time is required.' });
    }

    if (!end_time || end_time.trim() === '') {
      return res.status(400).json({ error: 'End time is required.' });
    }

    const breakMinutes = parseInt(break_duration, 10) || 0;
    if (breakMinutes < 0) {
      return res.status(400).json({ error: 'Break duration cannot be negative.' });
    }

    const duplicate = await dbQuery(
      `SELECT id FROM shifts WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL`,
      [name.trim(), id]
    );

    if (duplicate && duplicate.length > 0) {
      return res.status(400).json({ error: `Shift '${name.trim()}' already exists.` });
    }

    const now = new Date().toISOString();
    const isStatusActive = status === undefined ? (existing[0].status == 1) : (status === true || status === 1 || status === '1' || status === 'true');

    await dbQuery(
      `UPDATE shifts SET
        name = $1,
        start_time = $2,
        end_time = $3,
        break_duration = $4,
        description = $5,
        status = $6,
        updated_at = $7
       WHERE id = $8`,
      [name.trim(), start_time.trim(), end_time.trim(), breakMinutes, description ? description.trim() : null, isStatusActive ? 1 : 0, now, id]
    );

    const updated = await dbQuery(`SELECT * FROM shifts WHERE id = $1`, [id]);
    res.json({ message: 'Shift updated successfully.', record: updated[0] });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/shifts/:id
export async function deleteShift(req, res) {
  try {
    const { id } = req.params;

    const existing = await dbQuery(`SELECT * FROM shifts WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found.' });
    }

    const empRef = await dbQuery(
      `SELECT COUNT(*) as count FROM employees WHERE default_shift_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const refCount = parseInt(empRef[0]?.count || empRef[0]?.['COUNT(*)'] || 0, 10);

    if (refCount > 0) {
      return res.status(400).json({
        error: `Cannot delete shift '${existing[0].name}' because it is assigned as default shift to ${refCount} employee(s). Please reassign those employees or deactivate the shift instead.`
      });
    }

    const now = new Date().toISOString();
    await dbQuery(`UPDATE shifts SET deleted_at = $1 WHERE id = $2`, [now, id]);

    res.json({ success: true, message: `Shift '${existing[0].name}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: error.message });
  }
}
