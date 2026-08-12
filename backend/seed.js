import { dbQuery, generateUuid, initDb } from './src/config/db.js';

export async function seedData() {
  await initDb();

  await dbQuery(`DELETE FROM settlements;`);
  await dbQuery(`DELETE FROM supplier_ledger;`);
  await dbQuery(`DELETE FROM receipts;`);
  await dbQuery(`DELETE FROM supplier_vehicles;`);
  await dbQuery(`DELETE FROM suppliers;`);
  await dbQuery(`DELETE FROM master_vehicles;`);

  console.log('[SEED] Database cleared.');

  // Master Vehicles (Truck Master)
  const masterVehicles = [
    { vehicle_type: 'Pickup', default_rate: 1800.00 },
    { vehicle_type: '6-Wheeler', default_rate: 4500.00 },
    { vehicle_type: '10-Wheeler', default_rate: 7500.00 },
    { vehicle_type: 'Tractor Trailer', default_rate: 5500.00 },
    { vehicle_type: 'Diesel Tanker', default_rate: 1500.00 },
    { vehicle_type: 'Water Tanker (6000L)', default_rate: 1600.00 },
    { vehicle_type: 'Water Tanker (12000L)', default_rate: 2900.00 },
    { vehicle_type: 'Custom Truck', default_rate: 0.00 }
  ];

  for (const mv of masterVehicles) {
    await dbQuery(
      `INSERT INTO master_vehicles (id, vehicle_type, default_rate) VALUES ($1, $2, $3)`,
      [generateUuid(), mv.vehicle_type, mv.default_rate]
    );
  }

  // Suppliers
  const suppliers = [
    {
      id: 'SUP-001',
      name: 'Sri Lakshmi Husk Yard',
      category: 'Raw Material',
      company_name: 'Lakshmi Agro Enterprise',
      contact_person: 'S. Murugan',
      contact_number: '+91 98421 88301',
      status: 'Active'
    },
    {
      id: 'SUP-002',
      name: 'Kavitha Husk Suppliers',
      category: 'Raw Material',
      company_name: 'Kavitha Agri Traders',
      contact_person: 'R. Kavitha',
      contact_number: '+91 97862 11045',
      status: 'Active'
    },
    {
      id: 'SUP-003',
      name: 'Perundurai Fuel Mart',
      category: 'Fuel',
      company_name: 'Perundurai Petroleum Corp',
      contact_person: 'K. Selvam',
      contact_number: '+91 94432 55902',
      status: 'Active'
    },
    {
      id: 'SUP-004',
      name: 'Bhavani Tanker Utilities',
      category: 'Utility',
      company_name: 'Bhavani Water Supply & Transport',
      contact_person: 'M. Prakash',
      contact_number: '+91 98940 33210',
      status: 'Active'
    }
  ];

  for (const s of suppliers) {
    await dbQuery(
      `INSERT INTO suppliers (id, name, category, company_name, contact_person, contact_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [s.id, s.name, s.category, s.company_name, s.contact_person, s.contact_number, s.status]
    );
  }

  // Vehicles
  const vehicles = [
    { supplier_id: 'SUP-001', vehicle_type: 'Pickup', rate: 1800.00 },
    { supplier_id: 'SUP-001', vehicle_type: '6-Wheeler', rate: 4200.00 },
    { supplier_id: 'SUP-001', vehicle_type: '10-Wheeler', rate: 7500.00 },

    { supplier_id: 'SUP-002', vehicle_type: 'Pickup', rate: 2000.00 },
    { supplier_id: 'SUP-002', vehicle_type: '6-Wheeler', rate: 4500.00 },
    { supplier_id: 'SUP-002', vehicle_type: '10-Wheeler', rate: 8000.00 },

    { supplier_id: 'SUP-003', vehicle_type: 'Diesel Tanker', rate: 1500.00 },

    { supplier_id: 'SUP-004', vehicle_type: 'Water Tanker (6000L)', rate: 1600.00 },
    { supplier_id: 'SUP-004', vehicle_type: 'Water Tanker (12000L)', rate: 2900.00 }
  ];

  for (const v of vehicles) {
    await dbQuery(
      `INSERT INTO supplier_vehicles (id, supplier_id, vehicle_type, rate_per_trip)
       VALUES ($1, $2, $3, $4)`,
      [generateUuid(), v.supplier_id, v.vehicle_type, v.rate]
    );
  }

  // Receipts (Goods Inward)
  const receipts = [
    {
      id: 'RCT-0001',
      supplier_id: 'SUP-001',
      material_type: 'Green Husk',
      vehicle_type: '6-Wheeler',
      receipt_date: '2026-08-01',
      trip_count: 3,
      rate_per_trip: 4200.00,
      total_amount: 12600.00,
      status: 'Settled'
    },
    {
      id: 'RCT-0002',
      supplier_id: 'SUP-001',
      material_type: 'Green Husk',
      vehicle_type: '10-Wheeler',
      receipt_date: '2026-08-04',
      trip_count: 2,
      rate_per_trip: 7500.00,
      total_amount: 15000.00,
      status: 'Partial'
    },
    {
      id: 'RCT-0003',
      supplier_id: 'SUP-002',
      material_type: 'Brown Husk',
      vehicle_type: '6-Wheeler',
      receipt_date: '2026-08-06',
      trip_count: 4,
      rate_per_trip: 4500.00,
      total_amount: 18000.00,
      status: 'Pending'
    },
    {
      id: 'RCT-0004',
      supplier_id: 'SUP-002',
      material_type: 'Green Husk',
      vehicle_type: '10-Wheeler',
      receipt_date: '2026-08-08',
      trip_count: 1,
      rate_per_trip: 8000.00,
      total_amount: 8000.00,
      status: 'Pending'
    },
    {
      id: 'RCT-0005',
      supplier_id: 'SUP-003',
      material_type: 'Diesel',
      vehicle_type: 'Diesel Tanker',
      receipt_date: '2026-08-09',
      trip_count: 2,
      rate_per_trip: 1500.00,
      total_amount: 3000.00,
      status: 'Settled'
    },
    {
      id: 'RCT-0006',
      supplier_id: 'SUP-004',
      material_type: 'Water',
      vehicle_type: 'Water Tanker (12000L)',
      receipt_date: '2026-08-10',
      trip_count: 5,
      rate_per_trip: 2900.00,
      total_amount: 14500.00,
      status: 'Pending'
    }
  ];

  for (const r of receipts) {
    await dbQuery(
      `INSERT INTO receipts (id, supplier_id, material_type, vehicle_type, receipt_date, trip_count, rate_per_trip, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [r.id, r.supplier_id, r.material_type, r.vehicle_type, r.receipt_date, r.trip_count, r.rate_per_trip, r.total_amount, r.status]
    );

    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Delivery Due', $4, 'Owner Owes', $5)`,
      [
        generateUuid(),
        r.supplier_id,
        r.receipt_date,
        r.total_amount,
        `Goods Inward Receipt ${r.id} - ${r.trip_count} trip(s) of ${r.material_type}`
      ]
    );
  }

  // Advances Paid
  const advances = [
    {
      supplier_id: 'SUP-001',
      date: '2026-07-28',
      amount: 10000.00,
      note: 'Season Advance Payment via NEFT (Ref: N987123)'
    },
    {
      supplier_id: 'SUP-002',
      date: '2026-08-02',
      amount: 5000.00,
      note: 'Advance for Raw Husk Batch Delivery'
    }
  ];

  for (const adv of advances) {
    await dbQuery(
      `INSERT INTO supplier_ledger (id, supplier_id, transaction_date, transaction_type, amount, balance_impact, note)
       VALUES ($1, $2, $3, 'Advance Paid', $4, 'Owner Paid', $5)`,
      [generateUuid(), adv.supplier_id, adv.date, adv.amount, adv.note]
    );
  }

  // Settlements
  const settlements = [
    {
      id: 'STL-001',
      supplier_id: 'SUP-001',
      settlement_date: '2026-08-02',
      settlement_type: 'Full Settlement',
      amount_paid: 12600.00,
      remaining_balance: 0.00,
      linked_invoices: ['RCT-0001']
    },
    {
      id: 'STL-002',
      supplier_id: 'SUP-001',
      settlement_date: '2026-08-05',
      settlement_type: 'Partial',
      amount_paid: 8000.00,
      remaining_balance: 7000.00,
      linked_invoices: ['RCT-0002']
    },
    {
      id: 'STL-003',
      supplier_id: 'SUP-003',
      settlement_date: '2026-08-10',
      settlement_type: 'Full Settlement',
      amount_paid: 3000.00,
      remaining_balance: 0.00,
      linked_invoices: ['RCT-0005']
    }
  ];

  for (const st of settlements) {
    await dbQuery(
      `INSERT INTO settlements (id, supplier_id, settlement_date, settlement_type, amount_paid, remaining_balance, linked_invoices)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [st.id, st.supplier_id, st.settlement_date, st.settlement_type, st.amount_paid, st.remaining_balance, st.linked_invoices]
    );
  }

  console.log('[SEED] Master vehicles and realistic Coir ERP data populated.');
}
