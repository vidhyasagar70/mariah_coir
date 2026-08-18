import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/genders
export async function getGenders(req, res) {
  try {
    const { search = '', status = 'All' } = req.query;

    let sql = `SELECT * FROM genders WHERE deleted_at IS NULL`;
    const params = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      sql += ` AND name LIKE $${params.length}`;
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
    console.error('Error fetching genders:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/genders/:id
export async function getGenderById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`SELECT * FROM genders WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Gender not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching gender by ID:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/genders
export async function createGender(req, res) {
  try {
    const { name, status = true } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Gender name is required.' });
    }

    const existing = await dbQuery(
      `SELECT id FROM genders WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`,
      [name.trim()]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: `Gender '${name.trim()}' already exists.` });
    }

    const id = generateUuid();
    const now = new Date().toISOString();
    const isStatusActive = status === true || status === 1 || status === '1' || status === 'true';

    await dbQuery(
      `INSERT INTO genders (id, name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
      [id, name.trim(), isStatusActive ? 1 : 0, now, now]
    );

    const created = await dbQuery(`SELECT * FROM genders WHERE id = $1`, [id]);
    res.status(201).json({ message: 'Gender created successfully.', record: created[0] });
  } catch (error) {
    console.error('Error creating gender:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/genders/:id
export async function updateGender(req, res) {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const existing = await dbQuery(`SELECT * FROM genders WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Gender not found.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Gender name is required.' });
    }

    const duplicate = await dbQuery(
      `SELECT id FROM genders WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL`,
      [name.trim(), id]
    );

    if (duplicate && duplicate.length > 0) {
      return res.status(400).json({ error: `Gender '${name.trim()}' already exists.` });
    }

    const now = new Date().toISOString();
    const isStatusActive = status === undefined ? (existing[0].status == 1) : (status === true || status === 1 || status === '1' || status === 'true');

    await dbQuery(
      `UPDATE genders SET name = $1, status = $2, updated_at = $3 WHERE id = $4`,
      [name.trim(), isStatusActive ? 1 : 0, now, id]
    );

    const updated = await dbQuery(`SELECT * FROM genders WHERE id = $1`, [id]);
    res.json({ message: 'Gender updated successfully.', record: updated[0] });
  } catch (error) {
    console.error('Error updating gender:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/genders/:id
export async function deleteGender(req, res) {
  try {
    const { id } = req.params;

    const existing = await dbQuery(`SELECT * FROM genders WHERE id = $1 AND deleted_at IS NULL`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Gender not found.' });
    }

    const empRef = await dbQuery(
      `SELECT COUNT(*) as count FROM employees WHERE gender_id = $1 AND deleted_at IS NULL`,
      [id]
    );
    const refCount = parseInt(empRef[0]?.count || empRef[0]?.['COUNT(*)'] || 0, 10);

    if (refCount > 0) {
      return res.status(400).json({
        error: `Cannot delete gender '${existing[0].name}' because it is assigned to ${refCount} employee(s). Please reassign those employees or deactivate the gender instead.`
      });
    }

    const now = new Date().toISOString();
    await dbQuery(`UPDATE genders SET deleted_at = $1 WHERE id = $2`, [now, id]);

    res.json({ success: true, message: `Gender '${existing[0].name}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting gender:', error);
    res.status(500).json({ error: error.message });
  }
}
