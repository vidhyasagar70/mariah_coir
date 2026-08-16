import pg from 'pg';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const usePostgres = Boolean(process.env.DATABASE_URL || process.env.SUPABASE_URL || process.env.PGHOST);

let pgPool = null;
let sqliteDb = null;

if (usePostgres) {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;
  pgPool = new pg.Pool({
    connectionString,
    ssl: process.env.DB_SSL === 'true' || connectionString?.includes('supabase') ? { rejectUnauthorized: false } : false
  });
  console.log('[DB] Connected to PostgreSQL / Supabase instance.');
} else {
  const dbPath = path.join(__dirname, '..', '..', 'coir_erp.db');
  sqliteDb = new sqlite3.Database(dbPath);
  console.log(`[DB] Using SQLite fallback at ${dbPath}`);
}

const runSqlite = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const allSqlite = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getSqlite = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export async function initDb() {
  if (usePostgres) {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS settlement_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS product_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS dust_master_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS dust_customer_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS dust_sale_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS sales_dispatch_seq START 1;
        CREATE SEQUENCE IF NOT EXISTS expense_seq START 1;

        CREATE TABLE IF NOT EXISTS products (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'PRD-' || LPAD(CAST(nextval('product_seq') AS TEXT), 3, '0'),
            product_name VARCHAR(150) NOT NULL,
            category VARCHAR(50) NOT NULL,
            unit VARCHAR(30) NOT NULL DEFAULT 'Bundle',
            approx_bundle_weight NUMERIC(10, 2) NOT NULL,
            sell_price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'EXP-' || LPAD(CAST(nextval('expense_seq') AS TEXT), 4, '0'),
            expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
            category VARCHAR(50) NOT NULL CHECK (category IN ('Driver Salary', 'Employee Salary', 'Diesel Expense', 'Miscellaneous', 'Utility & Maintenance')),
            amount NUMERIC(10, 2) NOT NULL,
            payment_mode VARCHAR(30) DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'Bank Transfer', 'UPI', 'Cheque')),
            beneficiary_name VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales_dispatches (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'DISP-' || LPAD(CAST(nextval('sales_dispatch_seq') AS TEXT), 4, '0'),
            customer_name VARCHAR(150) NOT NULL,
            customer_phone VARCHAR(20),
            order_date DATE NOT NULL DEFAULT CURRENT_DATE,
            warehouse VARCHAR(100),
            vehicle_type VARCHAR(50) NOT NULL,
            vehicle_number VARCHAR(30) NOT NULL,
            product_id VARCHAR(20) REFERENCES products(id) ON DELETE RESTRICT,
            quantity_units INT NOT NULL,
            approx_unit_weight NUMERIC(10, 2) NOT NULL,
            total_approx_weight NUMERIC(10, 2) NOT NULL,
            actual_scale_weight NUMERIC(10, 2) NOT NULL,
            weight_difference NUMERIC(10, 2) NOT NULL,
            rate_per_kg NUMERIC(10, 2) NOT NULL,
            total_sales_amount NUMERIC(10, 2) NOT NULL,
            notes TEXT,
            payment_status VARCHAR(30) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dust_master (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'DST-' || LPAD(CAST(nextval('dust_master_seq') AS TEXT), 3, '0'),
            dust_name VARCHAR(100) NOT NULL,
            standard_vehicle_type VARCHAR(50) NOT NULL CHECK (standard_vehicle_type IN ('Tractor', 'Pickup', '6-Wheeler Tipper', '10-Wheeler Lorry', 'Trailer')),
            custom_vehicle_name VARCHAR(100),
            fixed_rate_per_load NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dust_customers (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'DCUS-' || LPAD(CAST(nextval('dust_customer_seq') AS TEXT), 3, '0'),
            customer_name VARCHAR(100) NOT NULL,
            phone_number VARCHAR(20) NOT NULL,
            company_name VARCHAR(150),
            preferred_vehicle_type VARCHAR(50) NOT NULL,
            advance_amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            current_advance_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
            delivery_due_date DATE NOT NULL,
            queue_status VARCHAR(30) DEFAULT 'In Queue' CHECK (queue_status IN ('In Queue', 'Partial Delivered', 'Completed', 'Cancelled')),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS dust_sales (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'DSLE-' || LPAD(CAST(nextval('dust_sale_seq') AS TEXT), 4, '0'),
            customer_id VARCHAR(20) REFERENCES dust_customers(id) ON DELETE RESTRICT,
            dust_id VARCHAR(20) REFERENCES dust_master(id),
            vehicle_type VARCHAR(50) NOT NULL,
            vehicle_number VARCHAR(30) NOT NULL,
            dispatch_date DATE NOT NULL DEFAULT CURRENT_DATE,
            loads_count INT NOT NULL DEFAULT 1,
            rate_per_load NUMERIC(10, 2) NOT NULL,
            total_sale_amount NUMERIC(10, 2) NOT NULL,
            amount_deducted_from_advance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            remaining_balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            payment_status VARCHAR(30) DEFAULT 'Deducted from Advance' CHECK (payment_status IN ('Deducted from Advance', 'Payment Due', 'Fully Settled')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS master_vehicles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            vehicle_type VARCHAR(50) NOT NULL UNIQUE,
            default_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'SUP-' || LPAD(CAST(nextval('supplier_seq') AS TEXT), 3, '0'),
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50) NOT NULL CHECK (category IN ('Raw Material', 'Fuel', 'Utility')),
            company_name VARCHAR(150),
            contact_person VARCHAR(100),
            contact_number VARCHAR(20) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supplier_vehicles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            supplier_id VARCHAR(20) REFERENCES suppliers(id) ON DELETE CASCADE,
            vehicle_type VARCHAR(50) NOT NULL,
            rate_per_trip NUMERIC(10, 2) NOT NULL DEFAULT 0.00
        );

        CREATE TABLE IF NOT EXISTS receipts (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'RCT-' || LPAD(CAST(nextval('receipt_seq') AS TEXT), 4, '0'),
            supplier_id VARCHAR(20) REFERENCES suppliers(id),
            material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('Green Husk', 'Brown Husk', 'Water', 'Diesel')),
            vehicle_type VARCHAR(50) NOT NULL,
            receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
            trip_count INT NOT NULL DEFAULT 1,
            rate_per_trip NUMERIC(10, 2) NOT NULL,
            total_amount NUMERIC(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Settled')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supplier_ledger (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            supplier_id VARCHAR(20) REFERENCES suppliers(id),
            transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
            transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('Advance Paid', 'Delivery Due')),
            amount NUMERIC(10, 2) NOT NULL,
            balance_impact VARCHAR(20) NOT NULL CHECK (balance_impact IN ('Owner Paid', 'Owner Owes')),
            note VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settlements (
            id VARCHAR(20) PRIMARY KEY DEFAULT 'STL-' || LPAD(CAST(nextval('settlement_seq') AS TEXT), 3, '0'),
            supplier_id VARCHAR(20) REFERENCES suppliers(id),
            settlement_date DATE NOT NULL DEFAULT CURRENT_DATE,
            settlement_type VARCHAR(50) CHECK (settlement_type IN ('Partial', 'Full Settlement')),
            amount_paid NUMERIC(10, 2) NOT NULL,
            remaining_balance NUMERIC(10, 2) DEFAULT 0.00,
            linked_invoices TEXT[],
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS miscellaneous_entries (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL,
            description VARCHAR(255) NOT NULL,
            expense_date DATE NOT NULL,
            amount NUMERIC(10, 2) NOT NULL,
            payment_mode VARCHAR(20) NOT NULL CHECK (payment_mode IN ('ONLINE', 'OFFLINE')),
            account_number VARCHAR(100),
            bank_name VARCHAR(150),
            transaction_reference VARCHAR(150),
            payment_reference VARCHAR(150),
            notes TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'CANCELLED')),
            created_by UUID NOT NULL,
            updated_by UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS maintenance_register (
            id VARCHAR(20) PRIMARY KEY,
            maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
            payment_date DATE DEFAULT CURRENT_DATE,
            maintenance_name VARCHAR(150) NOT NULL,
            maintenance_reason TEXT,
            amount_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            days_taken INT NOT NULL DEFAULT 1,
            pay_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
            receiver_name VARCHAR(100),
            account_number VARCHAR(100),
            status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'PENDING', 'CANCELLED')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS positions (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            name VARCHAR(100) NOT NULL,
            description TEXT,
            status BOOLEAN DEFAULT TRUE,
            created_by UUID,
            updated_by UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS genders (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            name VARCHAR(50) NOT NULL,
            status BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS shifts (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            name VARCHAR(100) NOT NULL,
            start_time VARCHAR(20) NOT NULL,
            end_time VARCHAR(20) NOT NULL,
            break_duration INT DEFAULT 0,
            description TEXT,
            status BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS employees (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            employee_code VARCHAR(50) NOT NULL,
            full_name VARCHAR(150) NOT NULL,
            gender_id UUID NOT NULL,
            position_id UUID NOT NULL,
            default_shift_id UUID NOT NULL,
            date_of_birth DATE,
            joining_date DATE NOT NULL,
            phone VARCHAR(30),
            address TEXT,
            employment_status VARCHAR(30) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS salary_structures (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            employee_id UUID,
            position_id UUID,
            gender_id UUID,
            shift_id UUID,
            salary_frequency VARCHAR(20) NOT NULL,
            salary_amount NUMERIC(12, 2) NOT NULL,
            effective_from DATE NOT NULL,
            effective_to DATE,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_by UUID,
            updated_by UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            attendance_date DATE NOT NULL,
            employee_id UUID,
            position_id UUID NOT NULL,
            shift_id UUID NOT NULL,
            attendance_status VARCHAR(30) NOT NULL,
            count NUMERIC(5, 2) DEFAULT 1.0,
            notes TEXT,
            created_by UUID,
            updated_by UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS units (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            name VARCHAR(100) NOT NULL,
            short_code VARCHAR(30) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS raw_materials (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            name VARCHAR(150) NOT NULL,
            unit_id UUID,
            unit VARCHAR(50) DEFAULT 'Load',
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS vehicle_types (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            name VARCHAR(100) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            vehicle_number VARCHAR(50) NOT NULL,
            vehicle_type_id UUID NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS raw_material_prices (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            raw_material_id UUID NOT NULL,
            vehicle_type_id UUID NOT NULL,
            unit_id UUID NOT NULL,
            price NUMERIC(18, 2) NOT NULL,
            effective_from DATE NOT NULL,
            effective_to DATE,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            supplier_number VARCHAR(50) NOT NULL,
            supplier_name VARCHAR(150) NOT NULL,
            company_name VARCHAR(150),
            phone_number VARCHAR(30) NOT NULL,
            contact_person VARCHAR(150) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS supplier_raw_materials (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            supplier_id UUID NOT NULL,
            raw_material_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supplier_vehicle_types (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            supplier_id UUID NOT NULL,
            vehicle_type_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supplier_vehicles (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            supplier_id UUID NOT NULL,
            vehicle_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supplier_account_transactions (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            supplier_id UUID NOT NULL,
            transaction_date DATE NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            reference_type VARCHAR(50),
            reference_id UUID,
            debit NUMERIC(18, 2) DEFAULT 0,
            credit NUMERIC(18, 2) DEFAULT 0,
            amount NUMERIC(18, 2) NOT NULL,
            description TEXT,
            created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supply_entries (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            supply_number VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            supplier_id UUID NOT NULL,
            vehicle_type_id UUID NOT NULL,
            vehicle_id UUID NOT NULL,
            raw_material_id UUID NOT NULL,
            unit_id UUID NOT NULL,
            quantity NUMERIC(18, 3) NOT NULL,
            price NUMERIC(18, 2) NOT NULL,
            total_amount NUMERIC(18, 2) NOT NULL,
            previous_advance NUMERIC(18, 2) NOT NULL DEFAULT 0,
            amount_adjusted NUMERIC(18, 2) NOT NULL DEFAULT 0,
            remaining_advance NUMERIC(18, 2) NOT NULL DEFAULT 0,
            remaining_due NUMERIC(18, 2) NOT NULL DEFAULT 0,
            notes TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'Confirmed',
            created_by UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            updated_by UUID,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS stock_movements (
            id UUID PRIMARY KEY,
            company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
            raw_material_id UUID NOT NULL,
            unit_id UUID NOT NULL,
            movement_type VARCHAR(20) NOT NULL,
            quantity NUMERIC(18, 3) NOT NULL,
            reference_type VARCHAR(50) NOT NULL DEFAULT 'SUPPLY_ENTRY',
            reference_id UUID NOT NULL,
            supplier_id UUID,
            vehicle_id UUID,
            movement_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS supply_vehicle_types (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            capacity VARCHAR(50),
            description TEXT,
            status INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS supply_suppliers (
            id VARCHAR(50) PRIMARY KEY,
            supplier_code VARCHAR(30) NOT NULL,
            name VARCHAR(100) NOT NULL,
            contact_person VARCHAR(100),
            phone VARCHAR(20),
            address TEXT,
            custom_notes TEXT,
            status VARCHAR(20) DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );
        ALTER TABLE supply_suppliers ADD COLUMN IF NOT EXISTS custom_notes TEXT;

        CREATE TABLE IF NOT EXISTS supply_vehicle_types (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            capacity VARCHAR(50),
            description TEXT,
            custom_alias TEXT,
            status INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );
        ALTER TABLE supply_vehicle_types ADD COLUMN IF NOT EXISTS custom_alias TEXT;

        CREATE TABLE IF NOT EXISTS supply_vehicles (
            id VARCHAR(50) PRIMARY KEY,
            supplier_id VARCHAR(50),
            vehicle_type_id VARCHAR(50),
            vehicle_number VARCHAR(50),
            notes TEXT,
            custom_driver_info TEXT,
            status INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );
        ALTER TABLE supply_vehicles ADD COLUMN IF NOT EXISTS custom_driver_info TEXT;

        CREATE TABLE IF NOT EXISTS raw_materials (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            unit VARCHAR(50),
            description TEXT,
            custom_specifications TEXT,
            status INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );
        ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS custom_specifications TEXT;

        CREATE TABLE IF NOT EXISTS supply_vehicles (
            id VARCHAR(50) PRIMARY KEY,
            supplier_id VARCHAR(50),
            vehicle_type_id VARCHAR(50),
            vehicle_number VARCHAR(50),
            notes TEXT,
            status INT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS supply_pricing (
            id VARCHAR(50) PRIMARY KEY,
            raw_material_id VARCHAR(50),
            vehicle_type_id VARCHAR(50),
            rate_per_unit NUMERIC(10, 2) NOT NULL,
            effective_from DATE NOT NULL,
            effective_to DATE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS supply_accounts (
            id VARCHAR(50) PRIMARY KEY,
            supplier_id VARCHAR(50),
            account_type VARCHAR(50) DEFAULT 'Payable',
            opening_balance NUMERIC(12, 2) DEFAULT 0.00,
            opening_advance NUMERIC(12, 2) DEFAULT 0.00,
            current_balance NUMERIC(12, 2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP DEFAULT NULL
        );
        ALTER TABLE supply_accounts ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'Payable';
        ALTER TABLE supply_accounts ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12, 2) DEFAULT 0.00;

        CREATE TABLE IF NOT EXISTS supply_account_ledger (
            id VARCHAR(50) PRIMARY KEY,
            account_id VARCHAR(50),
            supplier_id VARCHAR(50),
            entry_date DATE NOT NULL,
            entry_type VARCHAR(50) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            balance_after NUMERIC(12, 2) NOT NULL,
            reference_id VARCHAR(50),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[DB] PostgreSQL schema initialized.');
    } finally {
      client.release();
    }
  } else {
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          name TEXT NOT NULL,
          short_code TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    try {
      const rmInfo = await allSqlite(`PRAGMA table_info(raw_materials)`);
      if (rmInfo.length > 0 && !rmInfo.some(c => c.name === 'unit_id')) {
        await runSqlite(`ALTER TABLE raw_materials ADD COLUMN unit_id TEXT;`);
      }
    } catch (e) {}

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS raw_materials (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          name TEXT NOT NULL,
          unit_id TEXT,
          unit TEXT DEFAULT 'Load',
          description TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS vehicle_types (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          name TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS vehicles (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          vehicle_number TEXT NOT NULL,
          vehicle_type_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS raw_material_prices (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          raw_material_id TEXT NOT NULL,
          vehicle_type_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          price REAL NOT NULL,
          effective_from TEXT NOT NULL,
          effective_to TEXT,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    try {
      const supInfo = await allSqlite(`PRAGMA table_info(suppliers)`);
      if (supInfo.length > 0 && !supInfo.some(c => c.name === 'supplier_number')) {
        await runSqlite(`DROP TABLE suppliers;`);
      }
    } catch (e) {}

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS suppliers (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          supplier_number TEXT NOT NULL,
          supplier_name TEXT NOT NULL,
          company_name TEXT,
          phone_number TEXT NOT NULL,
          contact_person TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    try {
      const svInfo = await allSqlite(`PRAGMA table_info(supplier_vehicles)`);
      if (svInfo.length > 0 && !svInfo.some(c => c.name === 'vehicle_id')) {
        await runSqlite(`DROP TABLE supplier_vehicles;`);
      }
    } catch (e) {}

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supplier_raw_materials (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          supplier_id TEXT NOT NULL,
          raw_material_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supplier_vehicle_types (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          supplier_id TEXT NOT NULL,
          vehicle_type_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supplier_vehicles (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          supplier_id TEXT NOT NULL,
          vehicle_id TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supplier_account_transactions (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          supplier_id TEXT NOT NULL,
          transaction_date TEXT NOT NULL,
          transaction_type TEXT NOT NULL,
          reference_type TEXT,
          reference_id TEXT,
          debit REAL DEFAULT 0,
          credit REAL DEFAULT 0,
          amount REAL NOT NULL,
          description TEXT,
          created_by TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    try {
      const seInfo = await allSqlite(`PRAGMA table_info(supply_entries)`);
      if (seInfo.length > 0 && !seInfo.some(c => c.name === 'supply_number')) {
        await runSqlite(`DROP TABLE supply_entries;`);
      }
    } catch (e) {}

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_entries (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          supply_number TEXT NOT NULL,
          date TEXT NOT NULL,
          supplier_id TEXT NOT NULL,
          vehicle_type_id TEXT NOT NULL,
          vehicle_id TEXT NOT NULL,
          raw_material_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          quantity REAL NOT NULL,
          price REAL NOT NULL,
          total_amount REAL NOT NULL,
          previous_advance REAL NOT NULL DEFAULT 0,
          amount_adjusted REAL NOT NULL DEFAULT 0,
          remaining_advance REAL NOT NULL DEFAULT 0,
          remaining_due REAL NOT NULL DEFAULT 0,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'Confirmed',
          created_by TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          updated_by TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS stock_movements (
          id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
          raw_material_id TEXT NOT NULL,
          unit_id TEXT NOT NULL,
          movement_type TEXT NOT NULL,
          quantity REAL NOT NULL,
          reference_type TEXT NOT NULL DEFAULT 'SUPPLY_ENTRY',
          reference_id TEXT NOT NULL,
          supplier_id TEXT,
          vehicle_id TEXT,
          movement_date TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    try {
      const prdInfo = await allSqlite(`PRAGMA table_info(products)`);
      if (prdInfo.length > 0 && !prdInfo.some(c => c.name === 'sell_price_per_kg')) {
        await runSqlite(`DROP TABLE products;`);
      }
    } catch (e) {}

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          product_name TEXT NOT NULL,
          category TEXT NOT NULL,
          unit TEXT NOT NULL DEFAULT 'Bundle',
          approx_bundle_weight REAL NOT NULL,
          sell_price_per_kg REAL NOT NULL DEFAULT 0.00,
          status TEXT DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS dust_master (
          id TEXT PRIMARY KEY,
          dust_name TEXT NOT NULL,
          standard_vehicle_type TEXT NOT NULL,
          custom_vehicle_name TEXT,
          fixed_rate_per_load REAL NOT NULL DEFAULT 0.00,
          status TEXT DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS dust_customers (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          company_name TEXT,
          preferred_vehicle_type TEXT NOT NULL,
          advance_amount_paid REAL NOT NULL DEFAULT 0.00,
          current_advance_balance REAL NOT NULL DEFAULT 0.00,
          advance_date TEXT NOT NULL DEFAULT (date('now')),
          delivery_due_date TEXT NOT NULL,
          queue_status TEXT DEFAULT 'In Queue',
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS dust_sales (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          dust_id TEXT,
          vehicle_type TEXT NOT NULL,
          vehicle_number TEXT NOT NULL,
          dispatch_date TEXT NOT NULL DEFAULT (date('now')),
          loads_count INTEGER NOT NULL DEFAULT 1,
          rate_per_load REAL NOT NULL,
          total_sale_amount REAL NOT NULL,
          amount_deducted_from_advance REAL NOT NULL DEFAULT 0.00,
          remaining_balance_due REAL NOT NULL DEFAULT 0.00,
          payment_status TEXT DEFAULT 'Deducted from Advance',
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS sales_dispatches (
          id TEXT PRIMARY KEY,
          customer_name TEXT NOT NULL,
          customer_phone TEXT,
          order_date TEXT NOT NULL DEFAULT (date('now')),
          warehouse TEXT,
          vehicle_type TEXT NOT NULL,
          vehicle_number TEXT NOT NULL,
          product_id TEXT NOT NULL,
          quantity_units INTEGER NOT NULL,
          approx_unit_weight REAL NOT NULL,
          total_approx_weight REAL NOT NULL,
          actual_scale_weight REAL NOT NULL,
          weight_difference REAL NOT NULL,
          rate_per_kg REAL NOT NULL,
          total_sales_amount REAL NOT NULL,
          notes TEXT,
          payment_status TEXT DEFAULT 'Pending',
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          expense_date TEXT NOT NULL DEFAULT (date('now')),
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          payment_mode TEXT DEFAULT 'Cash',
          beneficiary_name TEXT,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_vehicle_types (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          capacity TEXT,
          description TEXT,
          status INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_suppliers (
          id TEXT PRIMARY KEY,
          supplier_code TEXT NOT NULL,
          name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          address TEXT,
          custom_notes TEXT,
          status TEXT DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    try {
      const ssInfo = await allSqlite(`PRAGMA table_info(supply_suppliers)`);
      if (ssInfo.length > 0 && !ssInfo.some(c => c.name === 'custom_notes')) {
        await runSqlite(`ALTER TABLE supply_suppliers ADD COLUMN custom_notes TEXT;`);
      }
      const svtInfo = await allSqlite(`PRAGMA table_info(supply_vehicle_types)`);
      if (svtInfo.length > 0 && !svtInfo.some(c => c.name === 'custom_alias')) {
        await runSqlite(`ALTER TABLE supply_vehicle_types ADD COLUMN custom_alias TEXT;`);
      }
      const svInfo = await allSqlite(`PRAGMA table_info(supply_vehicles)`);
      if (svInfo.length > 0 && !svInfo.some(c => c.name === 'custom_driver_info')) {
        await runSqlite(`ALTER TABLE supply_vehicles ADD COLUMN custom_driver_info TEXT;`);
      }
      const rmInfo2 = await allSqlite(`PRAGMA table_info(raw_materials)`);
      if (rmInfo2.length > 0 && !rmInfo2.some(c => c.name === 'custom_specifications')) {
        await runSqlite(`ALTER TABLE raw_materials ADD COLUMN custom_specifications TEXT;`);
      }
    } catch (e) { console.error('SQLite alter check error:', e); }

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_vehicles (
          id TEXT PRIMARY KEY,
          supplier_id TEXT,
          vehicle_type_id TEXT,
          vehicle_number TEXT,
          notes TEXT,
          status INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_pricing (
          id TEXT PRIMARY KEY,
          raw_material_id TEXT,
          vehicle_type_id TEXT,
          rate_per_unit REAL NOT NULL,
          effective_from TEXT NOT NULL,
          effective_to TEXT,
          notes TEXT,
          status TEXT DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_accounts (
          id TEXT PRIMARY KEY,
          supplier_id TEXT,
          account_type TEXT DEFAULT 'Payable',
          opening_balance REAL DEFAULT 0.00,
          opening_advance REAL DEFAULT 0.00,
          current_balance REAL DEFAULT 0.00,
          status TEXT DEFAULT 'Active',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          deleted_at TEXT DEFAULT NULL
      );
    `);

    try {
      const saInfo = await allSqlite(`PRAGMA table_info(supply_accounts)`);
      if (saInfo.length > 0 && !saInfo.some(c => c.name === 'account_type')) {
        await runSqlite(`ALTER TABLE supply_accounts ADD COLUMN account_type TEXT DEFAULT 'Payable';`);
      }
      if (saInfo.length > 0 && !saInfo.some(c => c.name === 'opening_balance')) {
        await runSqlite(`ALTER TABLE supply_accounts ADD COLUMN opening_balance REAL DEFAULT 0.00;`);
      }

      const spInfo = await allSqlite(`PRAGMA table_info(supply_pricing)`);
      if (spInfo.length > 0 && !spInfo.some(c => c.name === 'status')) {
        await runSqlite(`ALTER TABLE supply_pricing ADD COLUMN status TEXT DEFAULT 'Active';`);
      }

      const salInfo = await allSqlite(`PRAGMA table_info(supply_account_ledger)`);
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'transaction_date')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN transaction_date TEXT;`);
      }
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'transaction_type')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN transaction_type TEXT;`);
      }
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'description')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN description TEXT;`);
      }
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'debit')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN debit REAL DEFAULT 0;`);
      }
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'credit')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN credit REAL DEFAULT 0;`);
      }
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'running_balance')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN running_balance REAL DEFAULT 0;`);
      }
      if (salInfo.length > 0 && !salInfo.some(c => c.name === 'reference_type')) {
        await runSqlite(`ALTER TABLE supply_account_ledger ADD COLUMN reference_type TEXT;`);
      }

      const seInfo = await allSqlite(`PRAGMA table_info(supply_entries)`);
      if (seInfo.length > 0 && !seInfo.some(c => c.name === 'entry_code')) {
        await runSqlite(`ALTER TABLE supply_entries ADD COLUMN entry_code TEXT;`);
      }
      if (seInfo.length > 0 && !seInfo.some(c => c.name === 'entry_date')) {
        await runSqlite(`ALTER TABLE supply_entries ADD COLUMN entry_date TEXT;`);
      }
      if (seInfo.length > 0 && !seInfo.some(c => c.name === 'rate_per_unit')) {
        await runSqlite(`ALTER TABLE supply_entries ADD COLUMN rate_per_unit REAL DEFAULT 0;`);
      }
      if (seInfo.length > 0 && !seInfo.some(c => c.name === 'payment_mode')) {
        await runSqlite(`ALTER TABLE supply_entries ADD COLUMN payment_mode TEXT DEFAULT 'Credit';`);
      }
    } catch (e) { console.error('SQLite alter check error:', e); }

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supply_account_ledger (
          id TEXT PRIMARY KEY,
          account_id TEXT,
          supplier_id TEXT,
          entry_date TEXT NOT NULL,
          entry_type TEXT NOT NULL,
          amount REAL NOT NULL,
          balance_after REAL NOT NULL,
          reference_id TEXT,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    console.log('[DB] SQLite schema initialized.');
  }
}

export async function getNextId(prefix) {
  if (usePostgres) {
    let seqName = 'supplier_seq';
    let padLen = 3;
    if (prefix === 'RCT') { seqName = 'receipt_seq'; padLen = 4; }
    if (prefix === 'STL') { seqName = 'settlement_seq'; padLen = 3; }
    if (prefix === 'MN') { seqName = 'maintenance_seq'; padLen = 3; }
    if (prefix === 'SE') { seqName = 'supply_entry_seq'; padLen = 4; }
    if (prefix === 'PRD') { seqName = 'product_seq'; padLen = 3; }
    if (prefix === 'DST') { seqName = 'dust_master_seq'; padLen = 3; }
    if (prefix === 'DCUS') { seqName = 'dust_customer_seq'; padLen = 3; }
    if (prefix === 'DSLE') { seqName = 'dust_sale_seq'; padLen = 4; }
    if (prefix === 'DISP') { seqName = 'sales_dispatch_seq'; padLen = 4; }
    if (prefix === 'EXP') { seqName = 'expense_seq'; padLen = 4; }

    const res = await pgPool.query(`SELECT nextval('${seqName}') as val`);
    return `${prefix}-${String(res.rows[0].val).padStart(padLen, '0')}`;
  } else {
    let table = 'suppliers';
    let padLen = 3;
    if (prefix === 'RCT') { table = 'receipts'; padLen = 4; }
    if (prefix === 'STL') { table = 'settlements'; padLen = 3; }
    if (prefix === 'MN') { table = 'maintenance_register'; padLen = 3; }
    if (prefix === 'SE') { table = 'supply_entries'; padLen = 4; }
    if (prefix === 'PRD') { table = 'products'; padLen = 3; }
    if (prefix === 'DST') { table = 'dust_master'; padLen = 3; }
    if (prefix === 'DCUS') { table = 'dust_customers'; padLen = 3; }
    if (prefix === 'DSLE') { table = 'dust_sales'; padLen = 4; }
    if (prefix === 'DISP') { table = 'sales_dispatches'; padLen = 4; }
    if (prefix === 'EXP') { table = 'expenses'; padLen = 4; }

    const row = await getSqlite(`SELECT id FROM ${table} ORDER BY created_at DESC, id DESC LIMIT 1`);
    let nextNum = 1;
    if (row && row.id && row.id.startsWith(prefix + '-')) {
      const numPart = parseInt(row.id.split('-')[1], 10);
      if (!isNaN(numPart)) nextNum = numPart + 1;
    }
    return `${prefix}-${String(nextNum).padStart(padLen, '0')}`;
  }
}

export function generateUuid() {
  return crypto.randomUUID();
}

export async function dbQuery(text, params = []) {
  if (usePostgres) {
    const res = await pgPool.query(text, params);
    return res.rows;
  } else {
    const sqliteText = text.replace(/\$\d+/g, '?');
    const trimmed = text.trim().toUpperCase();
    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) {
      const rows = await allSqlite(sqliteText, params);
      return rows.map(r => {
        if (r.linked_invoices && typeof r.linked_invoices === 'string') {
          try { r.linked_invoices = JSON.parse(r.linked_invoices); } catch(e){}
        }
        return r;
      });
    } else {
      const adaptedParams = params.map(p => Array.isArray(p) ? JSON.stringify(p) : p);
      await runSqlite(sqliteText, adaptedParams);
      return [];
    }
  }
}
