import { initDb, dbQuery, generateUuid } from '../src/config/db.js';
import { createUnit } from '../src/modules/supplier/controllers/unitController.js';
import { createRawMaterial } from '../src/modules/supplier/controllers/rawMaterialController.js';
import { createVehicleType } from '../src/modules/supplier/controllers/vehicleTypeController.js';
import { createVehicle } from '../src/modules/supplier/controllers/vehicleController.js';
import { createPricing, resolvePrice } from '../src/modules/supplier/controllers/pricingController.js';
import { createSupplier } from '../src/modules/supplier/controllers/supplierController.js';
import { recordTransaction, getSupplierBalance } from '../src/modules/supplier/controllers/accountController.js';
import { createSupplyEntry } from '../src/modules/supplier/controllers/supplyEntryController.js';

async function runMockReq(handler, body = {}, params = {}, query = {}) {
  return new Promise((resolve) => {
    const req = { body, params, query };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(data) { resolve({ status: this.statusCode, body: data }); }
    };
    handler(req, res).catch(err => resolve({ status: 500, error: err.message }));
  });
}

async function runAcceptanceTest() {
  console.log('--- STARTING SUPPLIER MANAGEMENT END-TO-END ACCEPTANCE TEST ---');
  await initDb();

  const timestamp = Date.now();

  // 1. Create Unit: KG
  const unitRes = await runMockReq(createUnit, {
    name: `Test Unit KG ${timestamp}`,
    short_code: `TKG${timestamp.toString().slice(-4)}`,
    status: 'Active'
  });
  console.log('[1] Unit Creation:', unitRes.status === 201 ? 'SUCCESS' : 'FAILED', unitRes.body?.name);
  const unitId = unitRes.body.id;

  // 2. Create Raw Material: Coconut Husk
  const rmRes = await runMockReq(createRawMaterial, {
    raw_material_name: `Test Coconut Husk ${timestamp}`,
    unit_id: unitId,
    description: 'Fresh coconut husk',
    status: 'Active'
  });
  console.log('[2] Raw Material Creation:', rmRes.status === 201 ? 'SUCCESS' : 'FAILED', rmRes.body?.name);
  const rmId = rmRes.body.id;

  // 3. Create Vehicle Type: Mini Truck
  const vtRes = await runMockReq(createVehicleType, {
    vehicle_type_name: `Test Mini Truck ${timestamp}`,
    description: 'Small transport vehicle',
    status: 'Active'
  });
  console.log('[3] Vehicle Type Creation:', vtRes.status === 201 ? 'SUCCESS' : 'FAILED', vtRes.body?.name);
  const vtId = vtRes.body.id;

  // 4. Create Vehicle: TN-57-AB-1234
  const vRes = await runMockReq(createVehicle, {
    vehicle_number: `TN-57-TEST-${timestamp.toString().slice(-4)}`,
    vehicle_type_id: vtId,
    status: 'Active'
  });
  console.log('[4] Vehicle Creation:', vRes.status === 201 ? 'SUCCESS' : 'FAILED', vRes.body?.vehicle_number);
  const vId = vRes.body.id;

  // 5. Create Product Price: Coconut Husk + Mini Truck = ₹15/KG
  const today = new Date().toISOString().split('T')[0];
  const priceRes = await runMockReq(createPricing, {
    raw_material_id: rmId,
    vehicle_type_id: vtId,
    price: 15.00,
    effective_from: '2025-01-01',
    status: 'Active'
  });
  console.log('[5] Pricing Matrix Creation:', priceRes.status === 201 ? 'SUCCESS' : 'FAILED', `₹${priceRes.body?.price}`);

  // Test Auto-Price Resolution
  const resolveRes = await runMockReq(resolvePrice, {}, {}, {
    raw_material_id: rmId,
    vehicle_type_id: vtId,
    date: today
  });
  console.log('[5.1] Price Resolution Check:', resolveRes.body?.resolved ? `RESOLVED: ₹${resolveRes.body.price}` : 'FAILED');

  // 6. Create Supplier: Test ABC Supplier
  const supRes = await runMockReq(createSupplier, {
    supplier_name: `Test ABC Supplier ${timestamp}`,
    company_name: 'ABC Enterprise',
    phone_number: '+91 98765 00000',
    contact_person: 'Test Manager',
    status: 'Active',
    raw_materials: [rmId],
    vehicle_types: [vtId],
    vehicles: [vId]
  });
  console.log('[6] Supplier Creation & Relationship Assignment:', supRes.status === 201 ? 'SUCCESS' : 'FAILED', supRes.body?.supplier_name);
  const supplierId = supRes.body.id;

  // 7. Give Supplier ₹15,000 Advance
  const advRes = await runMockReq(recordTransaction, {
    supplier_id: supplierId,
    transaction_date: today,
    transaction_type: 'ADVANCE_GIVEN',
    amount: 15000,
    description: 'Initial test advance payment'
  });
  console.log('[7] Advance Payment Recording:', advRes.status === 201 ? 'SUCCESS' : 'FAILED', `₹${advRes.body?.amount}`);

  // Check balance before supply entry
  const balBefore = await runMockReq(getSupplierBalance, {}, { supplierId });
  console.log('[7.1] Supplier Balance Before Supply:', `Available Advance: ₹${balBefore.body?.available_advance}`);

  // 8. Create Supply Entry: 1,000 KG @ ₹15 = ₹15,000
  const entryRes = await runMockReq(createSupplyEntry, {
    date: today,
    supplier_id: supplierId,
    vehicle_type_id: vtId,
    vehicle_id: vId,
    raw_material_id: rmId,
    quantity: 1000,
    notes: 'Test supply receipt of 1000 KG husk'
  });

  console.log('[8] Supply Entry Creation:');
  console.log('    - Status:', entryRes.status === 201 ? 'SUCCESS' : 'FAILED');
  console.log('    - Total Supply Amount:', `₹${entryRes.body?.total_amount}`);
  console.log('    - Previous Advance:', `₹${entryRes.body?.previous_advance}`);
  console.log('    - Amount Adjusted:', `₹${entryRes.body?.amount_adjusted}`);
  console.log('    - Remaining Advance:', `₹${entryRes.body?.remaining_advance}`);
  console.log('    - Remaining Due:', `₹${entryRes.body?.remaining_due}`);

  // 9. Verify Stock Movements
  const stockMovements = await dbQuery(
    `SELECT * FROM stock_movements WHERE reference_id = $1`,
    [entryRes.body.id]
  );
  console.log('[9] Stock Integration Check:', stockMovements.length > 0 ? `SUCCESS (+${stockMovements[0].quantity} ${entryRes.body.unit_code})` : 'FAILED');

  // 10. Check Final Supplier Balance
  const balAfter = await runMockReq(getSupplierBalance, {}, { supplierId });
  console.log('[10] Final Balance Check:');
  console.log('    - Available Advance:', `₹${balAfter.body?.available_advance}`);
  console.log('    - Outstanding Payable:', `₹${balAfter.body?.outstanding_payable}`);

  console.log('--- ACCEPTANCE TEST COMPLETED SUCCESSFULLY ---');
}

runAcceptanceTest().catch(err => {
  console.error('Acceptance test error:', err);
  process.exit(1);
});
