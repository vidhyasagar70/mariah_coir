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

    const res = await pgPool.query(`SELECT nextval('${seqName}') as val`);
    return `${prefix}-${String(res.rows[0].val).padStart(padLen, '0')}`;
  } else {
    let table = 'suppliers';
    let padLen = 3;
    if (prefix === 'RCT') { table = 'receipts'; padLen = 4; }
    if (prefix === 'STL') { table = 'settlements'; padLen = 3; }
    if (prefix === 'MN') { table = 'maintenance_register'; padLen = 3; }
    if (prefix === 'SE') { table = 'supply_entries'; padLen = 4; }

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
