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

  // Maintenance Register Entries
  await dbQuery(`DELETE FROM maintenance_register;`);
  const maintenanceEntries = [
    {
      id: 'MN-001',
      maintenance_date: '2026-08-04',
      maintenance_name: 'Husk Decorticator Motor & Bearing Replacement',
      maintenance_reason: '50HP Main drive motor bearing overheating and noise issues',
      amount_spent: 18500.00,
      days_taken: 2,
      pay_mode: 'Online / Bank Transfer',
      receiver_name: 'Kavitha Industrial Electricals',
      account_number: 'SBIN00042189012'
    },
    {
      id: 'MN-002',
      maintenance_date: '2026-08-08',
      maintenance_name: 'Coir Fibre Baler Hydraulic Press Oil Servicing',
      maintenance_reason: 'Hydraulic cylinder seal kit replacement & 100L oil flush',
      amount_spent: 12400.00,
      days_taken: 1,
      pay_mode: 'Cash',
      receiver_name: null,
      account_number: null
    },
    {
      id: 'MN-003',
      maintenance_date: '2026-08-11',
      maintenance_name: 'Conveyor Belt Alignment & Roller Greasing',
      maintenance_reason: 'Green husk feeder conveyor belt tracking drift correction',
      amount_spent: 4500.00,
      days_taken: 1,
      pay_mode: 'UPI',
      receiver_name: 'Perundurai Mill Spares',
      account_number: 'perundurai@okaxis'
    }
  ];

  for (const entry of maintenanceEntries) {
    await dbQuery(
      `INSERT INTO maintenance_register (id, maintenance_date, maintenance_name, maintenance_reason, amount_spent, days_taken, pay_mode, receiver_name, account_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [entry.id, entry.maintenance_date, entry.maintenance_name, entry.maintenance_reason, entry.amount_spent, entry.days_taken, entry.pay_mode, entry.receiver_name, entry.account_number]
    );
  }

  // Seeding Employee & Attendance Module
  await dbQuery(`DELETE FROM attendance;`);
  await dbQuery(`DELETE FROM salary_structures;`);
  await dbQuery(`DELETE FROM employees;`);
  await dbQuery(`DELETE FROM shifts;`);
  await dbQuery(`DELETE FROM genders;`);
  await dbQuery(`DELETE FROM positions;`);

  // 1. Seed Genders
  const genderMap = {};
  const gendersToSeed = ['Male', 'Female'];
  for (const gName of gendersToSeed) {
    const id = generateUuid();
    genderMap[gName] = id;
    await dbQuery(
      `INSERT INTO genders (id, name, status) VALUES ($1, $2, $3)`,
      [id, gName, 1]
    );
  }

  // 2. Seed Positions
  const posMap = {};
  const positionsToSeed = [
    { name: 'Owner', description: 'Business Owner & Director' },
    { name: 'Management', description: 'Executive Operations & Planning' },
    { name: 'Manager', description: 'Plant & Production Manager' },
    { name: 'Supervisor', description: 'Shift & Floor Supervisor' },
    { name: 'Worker', description: 'General Factory & Mill Worker' },
    { name: 'Labour', description: 'Manual Loader & Husk Handler' },
    { name: 'Operator', description: 'Decorticator & Machine Operator' },
    { name: 'Accountant', description: 'Accounts & Billing Specialist' }
  ];

  for (const p of positionsToSeed) {
    const id = generateUuid();
    posMap[p.name] = id;
    await dbQuery(
      `INSERT INTO positions (id, name, description, status) VALUES ($1, $2, $3, $4)`,
      [id, p.name, p.description, 1]
    );
  }

  // 3. Seed Shifts
  const shiftMap = {};
  const shiftsToSeed = [
    { name: 'Morning Shift', start_time: '08:00', end_time: '16:30', break_duration: 30, description: 'First production morning shift' },
    { name: 'General Shift', start_time: '09:00', end_time: '17:30', break_duration: 60, description: 'General office & maintenance shift' },
    { name: 'Night Shift', start_time: '20:00', end_time: '04:30', break_duration: 30, description: 'Overnight heavy decortication shift' }
  ];

  for (const s of shiftsToSeed) {
    const id = generateUuid();
    shiftMap[s.name] = id;
    await dbQuery(
      `INSERT INTO shifts (id, name, start_time, end_time, break_duration, description, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, s.name, s.start_time, s.end_time, s.break_duration, s.description, 1]
    );
  }

  // 4. Seed Employees
  const employeesToSeed = [
    {
      employee_code: 'EMP-001',
      full_name: 'K. Rajendran',
      gender: 'Male',
      position: 'Manager',
      shift: 'General Shift',
      joining_date: '2022-01-15',
      phone: '+91 98422 10001',
      address: 'No. 12, Main Road, Perundurai, Erode',
      employment_status: 'Active'
    },
    {
      employee_code: 'EMP-002',
      full_name: 'M. Sangeetha',
      gender: 'Female',
      position: 'Accountant',
      shift: 'General Shift',
      joining_date: '2023-03-10',
      phone: '+91 97890 20002',
      address: '45/2 Gandhi Street, Kangeyam',
      employment_status: 'Active'
    },
    {
      employee_code: 'EMP-003',
      full_name: 'S. Arumugam',
      gender: 'Male',
      position: 'Supervisor',
      shift: 'Morning Shift',
      joining_date: '2023-06-01',
      phone: '+91 94431 30003',
      address: '88 Mill Colony, Perundurai',
      employment_status: 'Active'
    },
    {
      employee_code: 'EMP-004',
      full_name: 'P. Velusamy',
      gender: 'Male',
      position: 'Operator',
      shift: 'Morning Shift',
      joining_date: '2024-01-10',
      phone: '+91 98941 40004',
      address: 'Village East, Chennimalai',
      employment_status: 'Active'
    },
    {
      employee_code: 'EMP-005',
      full_name: 'R. Lakshmi',
      gender: 'Female',
      position: 'Worker',
      shift: 'Morning Shift',
      joining_date: '2024-02-15',
      phone: '+91 97500 50005',
      address: '22 South Street, Perundurai',
      employment_status: 'Active'
    },
    {
      employee_code: 'EMP-006',
      full_name: 'G. Palanisamy',
      gender: 'Male',
      position: 'Labour',
      shift: 'Night Shift',
      joining_date: '2024-05-01',
      phone: '+91 98425 60006',
      address: 'Bhavani Road, Erode',
      employment_status: 'Active'
    }
  ];

  const empMap = {};
  for (const emp of employeesToSeed) {
    const id = generateUuid();
    empMap[emp.employee_code] = { id, ...emp };
    await dbQuery(
      `INSERT INTO employees (id, employee_code, full_name, gender_id, position_id, default_shift_id, joining_date, phone, address, employment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        emp.employee_code,
        emp.full_name,
        genderMap[emp.gender],
        posMap[emp.position],
        shiftMap[emp.shift],
        emp.joining_date,
        emp.phone,
        emp.address,
        emp.employment_status
      ]
    );
  }

  // 5. Seed Salary Structures (Employee-specific and Generic)
  const salariesToSeed = [
    {
      employee_id: empMap['EMP-001'].id,
      salary_frequency: 'Monthly',
      salary_amount: 35000.00,
      effective_from: '2026-01-01',
      status: 'Active'
    },
    {
      employee_id: empMap['EMP-002'].id,
      salary_frequency: 'Monthly',
      salary_amount: 22000.00,
      effective_from: '2026-01-01',
      status: 'Active'
    },
    {
      position_id: posMap['Supervisor'],
      shift_id: shiftMap['Morning Shift'],
      salary_frequency: 'Weekly',
      salary_amount: 6000.00,
      effective_from: '2026-01-01',
      status: 'Active'
    },
    {
      position_id: posMap['Operator'],
      shift_id: shiftMap['Morning Shift'],
      salary_frequency: 'Daily',
      salary_amount: 850.00,
      effective_from: '2026-01-01',
      status: 'Active'
    },
    {
      position_id: posMap['Worker'],
      salary_frequency: 'Daily',
      salary_amount: 650.00,
      effective_from: '2026-01-01',
      status: 'Active'
    },
    {
      position_id: posMap['Labour'],
      shift_id: shiftMap['Night Shift'],
      salary_frequency: 'Daily',
      salary_amount: 750.00,
      effective_from: '2026-01-01',
      status: 'Active'
    }
  ];

  for (const sal of salariesToSeed) {
    await dbQuery(
      `INSERT INTO salary_structures (id, employee_id, position_id, gender_id, shift_id, salary_frequency, salary_amount, effective_from, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        generateUuid(),
        sal.employee_id || null,
        sal.position_id || null,
        sal.gender_id || null,
        sal.shift_id || null,
        sal.salary_frequency,
        sal.salary_amount,
        sal.effective_from,
        sal.status
      ]
    );
  }

  // 6. Seed Attendance Records for recent dates
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const attendanceLogs = [
    { date: todayStr, emp: 'EMP-001', status: 'Present', count: 1 },
    { date: todayStr, emp: 'EMP-002', status: 'Present', count: 1 },
    { date: todayStr, emp: 'EMP-003', status: 'Present', count: 1 },
    { date: todayStr, emp: 'EMP-004', status: 'Present', count: 1 },
    { date: todayStr, emp: 'EMP-005', status: 'Half Day', count: 0.5 },
    { date: todayStr, emp: 'EMP-006', status: 'Present', count: 1 },
    
    { date: yesterdayStr, emp: 'EMP-001', status: 'Present', count: 1 },
    { date: yesterdayStr, emp: 'EMP-002', status: 'Present', count: 1 },
    { date: yesterdayStr, emp: 'EMP-003', status: 'Present', count: 1 },
    { date: yesterdayStr, emp: 'EMP-004', status: 'Absent', count: 0 },
    { date: yesterdayStr, emp: 'EMP-005', status: 'Present', count: 1 },
    { date: yesterdayStr, emp: 'EMP-006', status: 'Leave', count: 0 }
  ];

  for (const att of attendanceLogs) {
    const empData = empMap[att.emp];
    if (empData) {
      await dbQuery(
        `INSERT INTO attendance (id, attendance_date, employee_id, position_id, shift_id, attendance_status, count, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          generateUuid(),
          att.date,
          empData.id,
          posMap[empData.position],
          shiftMap[empData.shift],
          att.status,
          att.count,
          'system'
        ]
      );
    }
  }

  // ==============================
  // SUPPLY MANAGEMENT MODULE SEED
  // ==============================
  try { await dbQuery(`DELETE FROM supply_entries;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM supply_account_ledger;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM supply_accounts;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM supply_pricing;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM supply_vehicles;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM supply_suppliers;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM supply_vehicle_types;`); } catch(e) {}
  try { await dbQuery(`DELETE FROM raw_materials;`); } catch(e) {}

  // 1. Seed Raw Materials
  const rmMap = {};
  const rawMats = [
    { name: 'Green Husk', unit: 'Load', description: 'Fresh coconut husks for decorticating' },
    { name: 'Brown Husk', unit: 'Load', description: 'Semi-dried coconut husks' },
    { name: 'Coir Fibre', unit: 'Ton', description: 'Extracted coir fibre bundles' },
    { name: 'Water', unit: 'Litre', description: 'Process water supply' },
    { name: 'Diesel', unit: 'Litre', description: 'Fuel for machinery and transport' }
  ];
  for (const rm of rawMats) {
    const id = generateUuid();
    rmMap[rm.name] = id;
    await dbQuery(`INSERT INTO raw_materials (id, name, unit, description, status) VALUES ($1, $2, $3, $4, $5)`, [id, rm.name, rm.unit, rm.description, 1]);
  }

  // 2. Seed Supply Vehicle Types
  const svtMap = {};
  const vTypes = [
    { name: 'Pickup', capacity: '1-2 Ton', description: 'Small pickup for short hauls' },
    { name: '6-Wheeler Truck', capacity: '6 Ton', description: 'Medium truck for husk transport' },
    { name: '10-Wheeler Truck', capacity: '10-12 Ton', description: 'Heavy truck for bulk husk' },
    { name: 'Tractor Trailer', capacity: '4-5 Ton', description: 'Agricultural trailer transport' },
    { name: 'Diesel Tanker', capacity: '5000L', description: 'Fuel delivery tanker' },
    { name: 'Water Tanker', capacity: '12000L', description: 'Water supply tanker' }
  ];
  for (const vt of vTypes) {
    const id = generateUuid();
    svtMap[vt.name] = id;
    await dbQuery(`INSERT INTO supply_vehicle_types (id, name, capacity, description, status) VALUES ($1, $2, $3, $4, $5)`, [id, vt.name, vt.capacity, vt.description, 1]);
  }

  // 3. Seed Supply Suppliers
  const ssMap = {};
  const ssuppliers = [
    { code: 'SSUP-001', name: 'Sri Lakshmi Husk Yard', contact_person: 'S. Murugan', phone: '+91 98421 88301', address: 'Perundurai, Erode Dist.' },
    { code: 'SSUP-002', name: 'Kavitha Husk Suppliers', contact_person: 'R. Kavitha', phone: '+91 97862 11045', address: 'Kangeyam Road, Tirupur' },
    { code: 'SSUP-003', name: 'Perundurai Fuel Mart', contact_person: 'K. Selvam', phone: '+91 94432 55902', address: 'NH-47, Perundurai' },
    { code: 'SSUP-004', name: 'Bhavani Water Supply', contact_person: 'M. Prakash', phone: '+91 98940 33210', address: 'Bhavani Town, Erode' }
  ];
  for (const ss of ssuppliers) {
    const id = generateUuid();
    ssMap[ss.code] = id;
    await dbQuery(
      `INSERT INTO supply_suppliers (id, supplier_code, name, contact_person, phone, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, ss.code, ss.name, ss.contact_person, ss.phone, ss.address, 'Active']
    );
  }

  // 4. Seed Supplier Vehicles
  const svehicles = [
    { supplier: 'SSUP-001', vtype: 'Pickup', number: 'TN 36 AB 1234' },
    { supplier: 'SSUP-001', vtype: '6-Wheeler Truck', number: 'TN 36 CD 5678' },
    { supplier: 'SSUP-001', vtype: '10-Wheeler Truck', number: 'TN 36 EF 9012' },
    { supplier: 'SSUP-002', vtype: 'Pickup', number: 'TN 39 GH 3456' },
    { supplier: 'SSUP-002', vtype: '6-Wheeler Truck', number: 'TN 39 IJ 7890' },
    { supplier: 'SSUP-003', vtype: 'Diesel Tanker', number: 'TN 36 KL 2345' },
    { supplier: 'SSUP-004', vtype: 'Water Tanker', number: 'TN 36 MN 6789' }
  ];
  const svMap = {};
  for (const sv of svehicles) {
    const id = generateUuid();
    svMap[`${sv.supplier}_${sv.vtype}`] = id;
    await dbQuery(
      `INSERT INTO supply_vehicles (id, supplier_id, vehicle_type_id, vehicle_number, status) VALUES ($1, $2, $3, $4, $5)`,
      [id, ssMap[sv.supplier], svtMap[sv.vtype], sv.number, 1]
    );
  }

  // 5. Seed Pricing Rules
  const pricingRules = [
    { material: 'Green Husk', vehicle: 'Pickup', rate: 1800 },
    { material: 'Green Husk', vehicle: '6-Wheeler Truck', rate: 4200 },
    { material: 'Green Husk', vehicle: '10-Wheeler Truck', rate: 7500 },
    { material: 'Green Husk', vehicle: 'Tractor Trailer', rate: 5500 },
    { material: 'Brown Husk', vehicle: 'Pickup', rate: 1500 },
    { material: 'Brown Husk', vehicle: '6-Wheeler Truck', rate: 3800 },
    { material: 'Brown Husk', vehicle: '10-Wheeler Truck', rate: 6800 },
    { material: 'Diesel', vehicle: 'Diesel Tanker', rate: 1500 },
    { material: 'Water', vehicle: 'Water Tanker', rate: 2900 }
  ];
  for (const pr of pricingRules) {
    await dbQuery(
      `INSERT INTO supply_pricing (id, raw_material_id, vehicle_type_id, rate_per_unit, effective_from, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateUuid(), rmMap[pr.material], svtMap[pr.vehicle], pr.rate, '2026-01-01', 'Active']
    );
  }

  // 6. Seed Supplier Accounts
  const acctMap = {};
  for (const code of ['SSUP-001', 'SSUP-002', 'SSUP-003', 'SSUP-004']) {
    const id = generateUuid();
    acctMap[code] = id;
    await dbQuery(
      `INSERT INTO supply_accounts (id, supplier_id, account_type, opening_balance, current_balance, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, ssMap[code], 'Payable', 0, 0, 'Active']
    );
  }

  // 7. Seed Supply Entries + Ledger
  const supplyEntries = [
    { code: 'SE-0001', supplier: 'SSUP-001', material: 'Green Husk', vehicle: '6-Wheeler Truck', date: '2026-08-01', qty: 3, rate: 4200 },
    { code: 'SE-0002', supplier: 'SSUP-001', material: 'Green Husk', vehicle: '10-Wheeler Truck', date: '2026-08-04', qty: 2, rate: 7500 },
    { code: 'SE-0003', supplier: 'SSUP-002', material: 'Brown Husk', vehicle: '6-Wheeler Truck', date: '2026-08-06', qty: 4, rate: 3800 },
    { code: 'SE-0004', supplier: 'SSUP-002', material: 'Green Husk', vehicle: '10-Wheeler Truck', date: '2026-08-08', qty: 1, rate: 7500 },
    { code: 'SE-0005', supplier: 'SSUP-003', material: 'Diesel', vehicle: 'Diesel Tanker', date: '2026-08-09', qty: 2, rate: 1500 },
    { code: 'SE-0006', supplier: 'SSUP-004', material: 'Water', vehicle: 'Water Tanker', date: '2026-08-10', qty: 5, rate: 2900 }
  ];

  for (const se of supplyEntries) {
    const entryId = generateUuid();
    const total = se.qty * se.rate;
    const vehicleKey = `${se.supplier}_${se.vehicle}`;

    await dbQuery(
      `INSERT INTO supply_entries (id, entry_code, supplier_id, raw_material_id, vehicle_type_id, vehicle_id, entry_date, quantity, rate_per_unit, total_amount, payment_mode, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [entryId, se.code, ssMap[se.supplier], rmMap[se.material], svtMap[se.vehicle], svMap[vehicleKey] || null, se.date, se.qty, se.rate, total, 'Credit', 'Confirmed']
    );

    // Update account balance
    const acctId = acctMap[se.supplier];
    const acctRows = await dbQuery(`SELECT current_balance FROM supply_accounts WHERE id = $1`, [acctId]);
    const newBal = parseFloat(acctRows[0]?.current_balance || 0) + total;
    await dbQuery(`UPDATE supply_accounts SET current_balance = $1 WHERE id = $2`, [newBal, acctId]);

    // Create ledger entry
    await dbQuery(
      `INSERT INTO supply_account_ledger (id, account_id, supplier_id, transaction_date, transaction_type, description, debit, credit, running_balance, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [generateUuid(), acctId, ssMap[se.supplier], se.date, 'Supply Receipt', `${se.code} - ${se.qty} unit(s) of ${se.material}`, total, 0, newBal, entryId, 'supply_entry']
    );
  }

  // Seed an advance payment for SUP-001
  const adv1Acct = acctMap['SSUP-001'];
  const adv1Rows = await dbQuery(`SELECT current_balance FROM supply_accounts WHERE id = $1`, [adv1Acct]);
  const adv1Bal = parseFloat(adv1Rows[0]?.current_balance || 0) - 10000;
  await dbQuery(`UPDATE supply_accounts SET current_balance = $1 WHERE id = $2`, [adv1Bal, adv1Acct]);
  await dbQuery(
    `INSERT INTO supply_account_ledger (id, account_id, supplier_id, transaction_date, transaction_type, description, debit, credit, running_balance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [generateUuid(), adv1Acct, ssMap['SSUP-001'], '2026-08-05', 'Advance Payment', 'Season Advance via NEFT', 0, 10000, adv1Bal]
  );

  // Clean and Seed Production-Level Supplier Management Tables
  await dbQuery(`DELETE FROM stock_movements;`);
  await dbQuery(`DELETE FROM supplier_account_transactions;`);
  await dbQuery(`DELETE FROM supplier_vehicles;`);
  await dbQuery(`DELETE FROM supplier_vehicle_types;`);
  await dbQuery(`DELETE FROM supplier_raw_materials;`);
  await dbQuery(`DELETE FROM raw_material_prices;`);
  await dbQuery(`DELETE FROM vehicles;`);
  await dbQuery(`DELETE FROM vehicle_types;`);
  await dbQuery(`DELETE FROM units;`);

  const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

  // 1. Seed Units
  const unitKgId = generateUuid();
  const unitTonId = generateUuid();
  const unitBagId = generateUuid();
  const unitLoadId = generateUuid();

  await dbQuery(`INSERT INTO units (id, company_id, name, short_code, status) VALUES ($1, $2, 'Kilogram', 'KG', 'Active')`, [unitKgId, COMPANY_ID]);
  await dbQuery(`INSERT INTO units (id, company_id, name, short_code, status) VALUES ($1, $2, 'Tonne', 'TON', 'Active')`, [unitTonId, COMPANY_ID]);
  await dbQuery(`INSERT INTO units (id, company_id, name, short_code, status) VALUES ($1, $2, 'Bag', 'BAG', 'Active')`, [unitBagId, COMPANY_ID]);
  await dbQuery(`INSERT INTO units (id, company_id, name, short_code, status) VALUES ($1, $2, 'Load', 'LOAD', 'Active')`, [unitLoadId, COMPANY_ID]);

  // Update existing raw_materials unit_id
  const existingRms = await dbQuery(`SELECT id, name FROM raw_materials`);
  for (const rm of existingRms) {
    let uId = unitKgId;
    if (rm.name.includes('Pith')) uId = unitBagId;
    if (rm.name.includes('Water') || rm.name.includes('Diesel')) uId = unitLoadId;
    await dbQuery(`UPDATE raw_materials SET unit_id = $1 WHERE id = $2`, [uId, rm.id]);
  }

  // Ensure 'Coconut Husk' raw material exists
  let husk = await dbQuery(`SELECT id FROM raw_materials WHERE name = 'Coconut Husk' AND deleted_at IS NULL`);
  let huskId;
  if (husk.length === 0) {
    huskId = generateUuid();
    await dbQuery(`INSERT INTO raw_materials (id, company_id, name, unit_id, unit, description, status) VALUES ($1, $2, 'Coconut Husk', $3, 'KG', 'Raw unprocessed husk', 'Active')`, [huskId, COMPANY_ID, unitKgId]);
  } else {
    huskId = husk[0].id;
    await dbQuery(`UPDATE raw_materials SET unit_id = $1, unit = 'KG' WHERE id = $2`, [unitKgId, huskId]);
  }

  // 2. Seed Vehicle Types
  const vtMiniTruckId = generateUuid();
  const vtLorryId = generateUuid();
  const vtAceId = generateUuid();
  const vtTractorId = generateUuid();

  await dbQuery(`INSERT INTO vehicle_types (id, company_id, name, description, status) VALUES ($1, $2, 'Mini Truck', 'Small transport truck', 'Active')`, [vtMiniTruckId, COMPANY_ID]);
  await dbQuery(`INSERT INTO vehicle_types (id, company_id, name, description, status) VALUES ($1, $2, 'Lorry', 'Heavy goods lorry', 'Active')`, [vtLorryId, COMPANY_ID]);
  await dbQuery(`INSERT INTO vehicle_types (id, company_id, name, description, status) VALUES ($1, $2, 'Tata Ace', 'Compact haulage vehicle', 'Active')`, [vtAceId, COMPANY_ID]);
  await dbQuery(`INSERT INTO vehicle_types (id, company_id, name, description, status) VALUES ($1, $2, 'Tractor', 'Agricultural tractor load', 'Active')`, [vtTractorId, COMPANY_ID]);

  // 3. Seed Vehicles
  const v1Id = generateUuid();
  const v2Id = generateUuid();

  await dbQuery(`INSERT INTO vehicles (id, company_id, vehicle_number, vehicle_type_id, status) VALUES ($1, $2, 'TN-57-AB-1234', $3, 'Active')`, [v1Id, COMPANY_ID, vtMiniTruckId]);
  await dbQuery(`INSERT INTO vehicles (id, company_id, vehicle_number, vehicle_type_id, status) VALUES ($1, $2, 'TN-57-CD-5678', $3, 'Active')`, [v2Id, COMPANY_ID, vtLorryId]);

  // 4. Seed Product Pricing: Coconut Husk + Mini Truck = ₹15/KG
  const price1Id = generateUuid();
  await dbQuery(
    `INSERT INTO raw_material_prices (id, company_id, raw_material_id, vehicle_type_id, unit_id, price, effective_from, status)
     VALUES ($1, $2, $3, $4, $5, $6, '2025-01-01', 'Active')`,
    [price1Id, COMPANY_ID, huskId, vtMiniTruckId, unitKgId, 15.00]
  );

  // 5. Seed Supplier: ABC Supplier
  const abcSupplierId = generateUuid();
  await dbQuery(
    `INSERT INTO suppliers (id, company_id, supplier_number, supplier_name, company_name, phone_number, contact_person, status)
     VALUES ($1, $2, 'SUP-001', 'ABC Supplier', 'ABC Traders Ltd', '+91 98765 43210', 'Ramesh Kumar', 'Active')`,
    [abcSupplierId, COMPANY_ID]
  );

  // 6. Assign Relationships to ABC Supplier
  await dbQuery(`INSERT INTO supplier_raw_materials (id, company_id, supplier_id, raw_material_id) VALUES ($1, $2, $3, $4)`, [generateUuid(), COMPANY_ID, abcSupplierId, huskId]);
  await dbQuery(`INSERT INTO supplier_vehicle_types (id, company_id, supplier_id, vehicle_type_id) VALUES ($1, $2, $3, $4)`, [generateUuid(), COMPANY_ID, abcSupplierId, vtMiniTruckId]);
  await dbQuery(`INSERT INTO supplier_vehicle_types (id, company_id, supplier_id, vehicle_type_id) VALUES ($1, $2, $3, $4)`, [generateUuid(), COMPANY_ID, abcSupplierId, vtLorryId]);
  await dbQuery(`INSERT INTO supplier_vehicles (id, company_id, supplier_id, vehicle_id) VALUES ($1, $2, $3, $4)`, [generateUuid(), COMPANY_ID, abcSupplierId, v1Id]);
  await dbQuery(`INSERT INTO supplier_vehicles (id, company_id, supplier_id, vehicle_id) VALUES ($1, $2, $3, $4)`, [generateUuid(), COMPANY_ID, abcSupplierId, v2Id]);

  // 7. Seed Advance for ABC Supplier: ₹15,000
  await dbQuery(
    `INSERT INTO supplier_account_transactions (id, company_id, supplier_id, transaction_date, transaction_type, debit, credit, amount, description, created_by)
     VALUES ($1, $2, $3, '2026-08-01', 'ADVANCE_GIVEN', 15000, 0, 15000, 'Initial season advance paid to ABC Supplier', $4)`,
    [generateUuid(), COMPANY_ID, abcSupplierId, COMPANY_ID]
  );

  console.log('[SEED] Master vehicles, Coir ERP data, Maintenance records, Employee & Attendance module, and Production Supplier Management module populated successfully.');
}

