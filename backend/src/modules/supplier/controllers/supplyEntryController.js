import { dbQuery, generateUuid, getNextId } from '../../../config/db.js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

// GET /api/supplier-management/supply-entries
export async function getSupplyEntries(req, res) {
  try {
    const {
      supplier_id, raw_material_id, vehicle_type_id, vehicle_id,
      status, from_date, to_date, search
    } = req.query;

    let query = `
      SELECT se.*,
             s.supplier_name, s.supplier_number, s.company_name as supplier_company,
             rm.name as raw_material_name,
             u.name as unit_name, u.short_code as unit_code,
             vt.name as vehicle_type_name,
             v.vehicle_number
      FROM supply_entries se
      LEFT JOIN suppliers s ON se.supplier_id = s.id
      LEFT JOIN raw_materials rm ON se.raw_material_id = rm.id
      LEFT JOIN units u ON se.unit_id = u.id
      LEFT JOIN vehicle_types vt ON se.vehicle_type_id = vt.id
      LEFT JOIN vehicles v ON se.vehicle_id = v.id
      WHERE se.deleted_at IS NULL AND se.company_id = $1`;
    const params = [COMPANY_ID];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND se.supplier_id = $${params.length}`;
    }
    if (raw_material_id) {
      params.push(raw_material_id);
      query += ` AND se.raw_material_id = $${params.length}`;
    }
    if (vehicle_type_id) {
      params.push(vehicle_type_id);
      query += ` AND se.vehicle_type_id = $${params.length}`;
    }
    if (vehicle_id) {
      params.push(vehicle_id);
      query += ` AND se.vehicle_id = $${params.length}`;
    }
    if (status && status !== 'All') {
      params.push(status);
      query += ` AND se.status = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND se.date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND se.date <= $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (se.supply_number LIKE $${params.length} OR s.supplier_name LIKE $${params.length} OR rm.name LIKE $${params.length} OR v.vehicle_number LIKE $${params.length})`;
    }

    query += ` ORDER BY se.date DESC, se.created_at DESC`;
    const rows = await dbQuery(query, params);

    // Compute summary KPI values
    const todayStr = new Date().toISOString().split('T')[0];
    let todayAmount = 0;
    let todayQuantity = 0;
    let totalSupplyAmount = 0;
    let totalAdvanceAdjusted = 0;
    let totalPayable = 0;

    rows.forEach(item => {
      if (item.status === 'Confirmed') {
        const amt = parseFloat(item.total_amount || 0);
        const qty = parseFloat(item.quantity || 0);
        const adj = parseFloat(item.amount_adjusted || 0);
        const due = parseFloat(item.remaining_due || 0);

        totalSupplyAmount += amt;
        totalAdvanceAdjusted += adj;
        totalPayable += due;

        if (item.date === todayStr) {
          todayAmount += amt;
          todayQuantity += qty;
        }
      }
    });

    const summaryCards = {
      today_supply_amount: todayAmount,
      today_quantity: todayQuantity,
      total_supply_amount: totalSupplyAmount,
      total_advance_adjusted: totalAdvanceAdjusted,
      total_payable: totalPayable
    };

    res.json({ data: rows, summary: summaryCards, total: rows.length });
  } catch (error) {
    console.error('Error fetching supply entries:', error);
    res.status(500).json({ error: error.message });
  }
}

// GET /api/supplier-management/supply-entries/:id
export async function getSupplyEntryById(req, res) {
  try {
    const { id } = req.params;
    const rows = await dbQuery(`
      SELECT se.*,
             s.supplier_name, s.supplier_number, s.company_name as supplier_company, s.phone_number as supplier_phone,
             rm.name as raw_material_name,
             u.name as unit_name, u.short_code as unit_code,
             vt.name as vehicle_type_name,
             v.vehicle_number
      FROM supply_entries se
      LEFT JOIN suppliers s ON se.supplier_id = s.id
      LEFT JOIN raw_materials rm ON se.raw_material_id = rm.id
      LEFT JOIN units u ON se.unit_id = u.id
      LEFT JOIN vehicle_types vt ON se.vehicle_type_id = vt.id
      LEFT JOIN vehicles v ON se.vehicle_id = v.id
      WHERE se.id = $1 AND se.deleted_at IS NULL AND se.company_id = $2
    `, [id, COMPANY_ID]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supply entry not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching supply entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/supply-entries
export async function createSupplyEntry(req, res) {
  try {
    const {
      date, supplier_id, vehicle_type_id, vehicle_id, raw_material_id, quantity, notes
    } = req.body;

    // Strict Validations
    if (!date) return res.status(400).json({ error: 'Supply date is required.' });
    if (!supplier_id) return res.status(400).json({ error: 'Supplier is required.' });
    if (!vehicle_type_id) return res.status(400).json({ error: 'Vehicle type is required.' });
    if (!vehicle_id) return res.status(400).json({ error: 'Vehicle number is required.' });
    if (!raw_material_id) return res.status(400).json({ error: 'Raw material is required.' });

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero.' });
    }

    // 1. Verify Raw Material belongs to Supplier
    const rmAssigned = await dbQuery(
      `SELECT id FROM supplier_raw_materials WHERE supplier_id = $1 AND raw_material_id = $2`,
      [supplier_id, raw_material_id]
    );
    if (rmAssigned.length === 0) {
      return res.status(400).json({ error: 'Selected raw material is not associated with this supplier.' });
    }

    // 2. Verify Vehicle belongs to Supplier
    const vAssigned = await dbQuery(
      `SELECT id FROM supplier_vehicles WHERE supplier_id = $1 AND vehicle_id = $2`,
      [supplier_id, vehicle_id]
    );
    if (vAssigned.length === 0) {
      return res.status(400).json({ error: 'Selected vehicle does not belong to this supplier.' });
    }

    // 3. Verify Vehicle belongs to Vehicle Type
    const vehicleCheck = await dbQuery(
      `SELECT vehicle_type_id FROM vehicles WHERE id = $1 AND deleted_at IS NULL`,
      [vehicle_id]
    );
    if (vehicleCheck.length === 0 || vehicleCheck[0].vehicle_type_id !== vehicle_type_id) {
      return res.status(400).json({ error: 'Selected vehicle does not match the selected vehicle type.' });
    }

    // 4. Fetch Raw Material Details & Unit ID
    const rmDetails = await dbQuery(
      `SELECT unit_id FROM raw_materials WHERE id = $1 AND deleted_at IS NULL`,
      [raw_material_id]
    );
    if (rmDetails.length === 0) {
      return res.status(400).json({ error: 'Raw material record not found.' });
    }
    const unit_id = rmDetails[0].unit_id;

    // 5. Server Price Resolution from Product Pricing Matrix
    const priceRows = await dbQuery(`
      SELECT price FROM raw_material_prices
      WHERE raw_material_id = $1
        AND vehicle_type_id = $2
        AND status = 'Active'
        AND deleted_at IS NULL
        AND company_id = $3
        AND effective_from <= $4
        AND (effective_to IS NULL OR effective_to >= $4)
      ORDER BY effective_from DESC
      LIMIT 1
    `, [raw_material_id, vehicle_type_id, COMPANY_ID, date]);

    if (priceRows.length === 0) {
      return res.status(400).json({
        error: 'Pricing is not configured for the selected Raw Material + Vehicle Type on this date. Please create pricing first.'
      });
    }

    const price = parseFloat(priceRows[0].price);
    const total_amount = price * qty;

    // 6. Calculate Supplier Account Advance Adjustment
    const ledgerStats = await dbQuery(`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'ADVANCE_GIVEN' THEN amount ELSE 0 END), 0) as total_advance_given,
        COALESCE(SUM(CASE WHEN transaction_type = 'ADVANCE_ADJUSTMENT' THEN amount ELSE 0 END), 0) as total_advance_used
      FROM supplier_account_transactions
      WHERE supplier_id = $1 AND company_id = $2
    `, [supplier_id, COMPANY_ID]);

    const totalAdvGiven = parseFloat(ledgerStats[0]?.total_advance_given || 0);
    const totalAdvUsed = parseFloat(ledgerStats[0]?.total_advance_used || 0);
    const available_advance = Math.max(0, totalAdvGiven - totalAdvUsed);

    const amount_adjusted = Math.min(total_amount, available_advance);
    const remaining_advance = Math.max(0, available_advance - amount_adjusted);
    const remaining_due = Math.max(0, total_amount - amount_adjusted);

    // 7. Auto-generate Supply Number
    const supply_number = await getNextId('SE');
    const id = generateUuid();

    // 8. Insert Supply Entry Record
    await dbQuery(
      `INSERT INTO supply_entries (
        id, company_id, supply_number, date, supplier_id, vehicle_type_id, vehicle_id,
        raw_material_id, unit_id, quantity, price, total_amount,
        previous_advance, amount_adjusted, remaining_advance, remaining_due,
        notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        id, COMPANY_ID, supply_number, date, supplier_id, vehicle_type_id, vehicle_id,
        raw_material_id, unit_id, qty, price, total_amount,
        available_advance, amount_adjusted, remaining_advance, remaining_due,
        notes || '', 'Confirmed', COMPANY_ID
      ]
    );

    // 9. Create Ledger Transactions
    // Transaction A: SUPPLY_PAYABLE
    const txPayableId = generateUuid();
    await dbQuery(
      `INSERT INTO supplier_account_transactions (
        id, company_id, supplier_id, transaction_date, transaction_type, reference_type, reference_id,
        debit, credit, amount, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        txPayableId, COMPANY_ID, supplier_id, date, 'SUPPLY_PAYABLE', 'SUPPLY_ENTRY', id,
        0, total_amount, total_amount, `Supply Entry ${supply_number} - ${qty} unit(s) @ ₹${price}`, COMPANY_ID
      ]
    );

    // Transaction B: ADVANCE_ADJUSTMENT (if advance consumed)
    if (amount_adjusted > 0) {
      const txAdjId = generateUuid();
      await dbQuery(
        `INSERT INTO supplier_account_transactions (
          id, company_id, supplier_id, transaction_date, transaction_type, reference_type, reference_id,
          debit, credit, amount, description, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          txAdjId, COMPANY_ID, supplier_id, date, 'ADVANCE_ADJUSTMENT', 'SUPPLY_ENTRY', id,
          amount_adjusted, 0, amount_adjusted, `Advance adjusted for Supply Entry ${supply_number}`, COMPANY_ID
        ]
      );
    }

    // 10. Update Stock System (Stock Movement IN)
    const stockId = generateUuid();
    await dbQuery(
      `INSERT INTO stock_movements (
        id, company_id, raw_material_id, unit_id, movement_type, quantity,
        reference_type, reference_id, supplier_id, vehicle_id, movement_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        stockId, COMPANY_ID, raw_material_id, unit_id, 'IN', qty,
        'SUPPLY_ENTRY', id, supplier_id, vehicle_id, date
      ]
    );

    // Return created entry with full join data
    const created = await getSupplyEntryByIdInternal(id);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating supply entry:', error);
    res.status(500).json({ error: error.message });
  }
}

// POST /api/supplier-management/supply-entries/:id/cancel
export async function cancelSupplyEntry(req, res) {
  try {
    const { id } = req.params;

    const entry = await dbQuery(`SELECT * FROM supply_entries WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`, [id, COMPANY_ID]);
    if (entry.length === 0) {
      return res.status(404).json({ error: 'Supply entry not found.' });
    }
    if (entry[0].status === 'Cancelled') {
      return res.status(400).json({ error: 'Supply entry is already cancelled.' });
    }

    const item = entry[0];

    // Soft delete supply entry
    await dbQuery(`UPDATE supply_entries SET status = 'Cancelled', deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);

    // Reverse stock movement (Create OUT movement)
    const stockRevId = generateUuid();
    await dbQuery(
      `INSERT INTO stock_movements (
        id, company_id, raw_material_id, unit_id, movement_type, quantity,
        reference_type, reference_id, supplier_id, vehicle_id, movement_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        stockRevId, COMPANY_ID, item.raw_material_id, item.unit_id, 'OUT', parseFloat(item.quantity),
        'SUPPLY_ENTRY_CANCEL', id, item.supplier_id, item.vehicle_id, new Date().toISOString().split('T')[0]
      ]
    );

    res.json({ success: true, message: 'Supply entry cancelled successfully and stock reversed.' });
  } catch (error) {
    console.error('Error cancelling supply entry:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getSupplyEntryByIdInternal(id) {
  const rows = await dbQuery(`
    SELECT se.*,
           s.supplier_name, s.supplier_number, s.company_name as supplier_company,
           rm.name as raw_material_name,
           u.name as unit_name, u.short_code as unit_code,
           vt.name as vehicle_type_name,
           v.vehicle_number
    FROM supply_entries se
    LEFT JOIN suppliers s ON se.supplier_id = s.id
    LEFT JOIN raw_materials rm ON se.raw_material_id = rm.id
    LEFT JOIN units u ON se.unit_id = u.id
    LEFT JOIN vehicle_types vt ON se.vehicle_type_id = vt.id
    LEFT JOIN vehicles v ON se.vehicle_id = v.id
    WHERE se.id = $1
  `, [id]);
  return rows[0] || null;
}
