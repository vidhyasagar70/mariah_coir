import { dbQuery, generateUuid } from '../../../config/db.js';

export async function getMasterVehicles(req, res) {
  try {
    const vehicles = await dbQuery('SELECT * FROM master_vehicles ORDER BY vehicle_type ASC');
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function createMasterVehicle(req, res) {
  try {
    const { vehicle_type, default_rate } = req.body;
    if (!vehicle_type) {
      return res.status(400).json({ error: 'Vehicle type is required.' });
    }

    const uuid = generateUuid();
    const rate = default_rate !== undefined ? parseFloat(default_rate) : 0.00;

    await dbQuery(
      `INSERT INTO master_vehicles (id, vehicle_type, default_rate) VALUES ($1, $2, $3)`,
      [uuid, vehicle_type, rate]
    );

    res.status(201).json({ id: uuid, message: 'Master vehicle type created successfully.' });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Vehicle type already exists in Truck Master.' });
    }
    res.status(500).json({ error: error.message });
  }
}

export async function deleteMasterVehicle(req, res) {
  try {
    const { id } = req.params;
    await dbQuery('DELETE FROM master_vehicles WHERE id = $1', [id]);
    res.json({ message: 'Master vehicle type deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
