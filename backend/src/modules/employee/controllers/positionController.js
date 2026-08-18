import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/positions - List positions with search & status filter
export async function getPositions(req, res) {
  try {
    const { search = '', status = 'All' } = req.query;

    let sql = `SELECT * FROM positions WHERE deleted_at IS NULL`;
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
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/positions/:id
export async function getPositionById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM positions WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Position not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching position by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/positions
export async function createPosition(req, res) {
  try {
    const { name, description, status = true } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Position name is required.' });
    }

    // Check unique position name
    const existing = await dbQuery(
      `SELECT id FROM positions WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
      [name.trim()]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: `Position '${name.trim()}' already exists.` });
    }

    const id = generateUuid();
    const now = new Date().toISOString();
    const isStatusActive = status === true || status === 1 || status === '1' || status === 'true';

    await dbQuery(
      `INSERT INTO positions (id, name, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name.trim(), description ? description.trim() : null, isStatusActive ? 1 : 0, now, now]
    );

    const created = await dbQuery(`SELECT * FROM positions WHERE id = $1`, [id]);
    res.status(201).json({ message: 'Position created successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/positions/:id
export async function updatePosition(req, res) {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const existing = await dbQuery(`SELECT * FROM positions WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Position not found.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Position name is required.' });
    }

    // Duplicate check
    const duplicate = await dbQuery(
      `SELECT id FROM positions WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL`,
      [name.trim(), id]
    );

    if (duplicate && duplicate.length > 0) {
      return res.status(400).json({ error: `Position '${name.trim()}' already exists.` });
    }

    const now = new Date().toISOString();
    const isStatusActive = status === undefined ? (existing[0].status == 1) : (status === true || status === 1 || status === '1' || status === 'true');

    await dbQuery(
      `UPDATE positions SET
        name = $1,
        description = $2,
        status = $3,
        updated_at = $4
       WHERE id = $5`,
      [name.trim(), description ? description.trim() : null, isStatusActive ? 1 : 0, now, id]
    );

    const updated = await dbQuery(`SELECT * FROM positions WHERE id = $1`, [id]);
    res.json({ message: 'Position updated successfully.', record: updated[0] });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/positions/:id - Soft Delete with reference check
export async function deletePosition(req, res) {
  try {
    const { id } = req.params;

    const existing = await dbQuery(`SELECT * FROM positions WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Position not found.' });
    }

    // Check if referenced by active employees
    const empRef = await dbQuery(
      `SELECT COUNT(*) as count FROM employees WHERE position_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const refCount = parseInt(empRef[0]?.count || empRef[0]?.['COUNT(*)'] || 0, 10);

    if (refCount > 0) {
      return res.status(400).json({
        error: `Cannot delete position '${existing[0].name}' because it is assigned to ${refCount} employee(s). Please reassign those employees or deactivate the position instead.`
      });
    }

    const now = new Date().toISOString();
    await dbQuery(`UPDATE positions SET deleted_at = $1 WHERE id = $2`, [now, id]);

    res.json({ success: true, message: `Position '${existing[0].name}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ error: error.message });
  }
}
