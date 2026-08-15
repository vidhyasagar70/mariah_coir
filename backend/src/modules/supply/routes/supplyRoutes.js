import { Router } from 'express';
import { getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial } from '../controllers/rawMaterialController.js';
import { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } from '../controllers/vehicleTypeController.js';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicleController.js';
import { getPricing, resolvePrice, createPricing, updatePricing, deletePricing } from '../controllers/pricingController.js';
import { getAccounts, getAccountLedger, createAccount, recordAdvance, recordPayment } from '../controllers/accountController.js';
import { getEntries, createEntry, deleteEntry, getEntryReports } from '../controllers/entryController.js';

const router = Router();

// Raw Materials Master
router.get('/raw-materials', getRawMaterials);
router.post('/raw-materials', createRawMaterial);
router.put('/raw-materials/:id', updateRawMaterial);
router.delete('/raw-materials/:id', deleteRawMaterial);

// Vehicle Types Master
router.get('/vehicle-types', getVehicleTypes);
router.post('/vehicle-types', createVehicleType);
router.put('/vehicle-types/:id', updateVehicleType);
router.delete('/vehicle-types/:id', deleteVehicleType);

// Suppliers
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Supplier Vehicles
router.get('/vehicles', getVehicles);
router.post('/vehicles', createVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// Pricing (Material + Vehicle Type → Rate)
router.get('/pricing', getPricing);
router.get('/pricing/resolve', resolvePrice);
router.post('/pricing', createPricing);
router.put('/pricing/:id', updatePricing);
router.delete('/pricing/:id', deletePricing);

// Supplier Accounts & Ledger
router.get('/accounts', getAccounts);
router.get('/accounts/:id/ledger', getAccountLedger);
router.post('/accounts', createAccount);
router.post('/accounts/:id/advance', recordAdvance);
router.post('/accounts/:id/payment', recordPayment);

// Supply Entries (Receipts)
router.get('/entries/reports', getEntryReports);
router.get('/entries', getEntries);
router.post('/entries', createEntry);
router.delete('/entries/:id', deleteEntry);

export default router;
