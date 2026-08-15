import { dbQuery, generateUuid } from '../../../config/db.js';

// GET /api/supply/raw-materials
export async function getRawMaterials(req, res) {
  try {
    const { search, status } = req.query;
    let query = `SELECT * FROM raw_materials WHERE deleted_at IS NULL`;
    const params = [];

    if (status === 'active') {
      params.push(1);
      query += ` AND status = $${params.length}`;
    } else if (status === 'inactive') {
      params.push(0);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name LIKE $${params.length} OR unit LIKE $${params.length})`;
    }

    query += ` ORDER BY name ASC`;
    const rows = await dbQuery(query, params);
    res.json({ data: rows, total: rows.length });
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supply/raw-materials
export async function createRawMaterial(req, res) {
  try {
    const { name, unit, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Material name is required.' });
    }

    const existing = await dbQuery(`SELECT id FROM raw_materials WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL`, [name.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Raw material "${name.trim()}" already exists.` });
    }

    const id = generateUuid();
    await dbQuery(
      `INSERT INTO raw_materials (id, name, unit, description, status) VALUES ($1, $2, $3, $4, $5)`,
      [id, name.trim(), unit || 'Load', description || '', 1]
    );

    const created = await dbQuery(`SELECT * FROM raw_materials WHERE id = $1`, [id]);
    res.status(201).json(created[0]);
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(500).json({ error: error.message });
  }
}

// PUT /api/supply/raw-materials/:id
export async function updateRawMaterial(req, res) {
  try {
    const { id } = req.params;
    const { name, unit, description, status } = req.body;

    await dbQuery(
      `UPDATE raw_materials SET name = $1, unit = $2, description = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [name?.trim(), unit || 'Load', description || '', status !== undefined ? (status ? 1 : 0) : 1, id]
    );

    const updated = await dbQuery(`SELECT * FROM raw_materials WHERE id = $1`, [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({ error: error.message });
  }
}

// DELETE /api/supply/raw-materials/:id
export async function deleteRawMaterial(req, res) {
  try {
    const { id } = req.params;
    await dbQuery(`UPDATE raw_materials SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Raw material deleted.' });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    res.status(500).json({ error: error.message });
  }
}
