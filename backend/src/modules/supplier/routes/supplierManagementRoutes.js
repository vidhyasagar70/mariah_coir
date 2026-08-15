import { Router } from 'express';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../controllers/unitController.js';
import { getRawMaterials, createRawMaterial, updateRawMaterial, deleteRawMaterial } from '../controllers/rawMaterialController.js';
import { getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType } from '../controllers/vehicleTypeController.js';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../controllers/vehicleController.js';
import { getPricing, resolvePrice, createPricing, updatePricing, deletePricing } from '../controllers/pricingController.js';
import {
  getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier,
  getSupplierRawMaterials, getSupplierVehicleTypes, getSupplierVehicles
} from '../controllers/supplierController.js';
import { recordTransaction, getAccountBySupplier, getSupplierBalance, getSupplierLedger } from '../controllers/accountController.js';
import {
  getSupplyEntries, getSupplyEntryById, createSupplyEntry, cancelSupplyEntry
} from '../controllers/supplyEntryController.js';

const router = Router();

// Units Master
router.get('/units', getUnits);
router.post('/units', createUnit);
router.put('/units/:id', updateUnit);
router.delete('/units/:id', deleteUnit);

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

// Vehicle Master
router.get('/vehicles', getVehicles);
router.post('/vehicles', createVehicle);
router.put('/vehicles/:id', updateVehicle);
router.delete('/vehicles/:id', deleteVehicle);

// Product Pricing Matrix
router.get('/pricing/resolve', resolvePrice);
router.get('/pricing', getPricing);
router.post('/pricing', createPricing);
router.put('/pricing/:id', updatePricing);
router.delete('/pricing/:id', deletePricing);

// Supplier Relationships (must come before /suppliers/:id)
router.get('/suppliers/:id/raw-materials', getSupplierRawMaterials);
router.get('/suppliers/:id/vehicle-types', getSupplierVehicleTypes);
router.get('/suppliers/:id/vehicles', getSupplierVehicles);

// Suppliers Master
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Supplier Accounts & Financial Ledger
router.post('/accounts/transaction', recordTransaction);
router.get('/accounts/:supplierId/balance', getSupplierBalance);
router.get('/accounts/:supplierId/ledger', getSupplierLedger);
router.get('/accounts/:supplierId', getAccountBySupplier);

// Supply Entries
router.get('/supply-entries', getSupplyEntries);
router.get('/supply-entries/:id', getSupplyEntryById);
router.post('/supply-entries', createSupplyEntry);
router.post('/supply-entries/:id/cancel', cancelSupplyEntry);

export default router;
