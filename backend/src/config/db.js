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
      `);
      console.log('[DB] PostgreSQL schema initialized.');
    } finally {
      client.release();
    }
  } else {
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS suppliers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('Raw Material', 'Fuel', 'Utility')),
          company_name TEXT,
          contact_person TEXT,
          contact_number TEXT NOT NULL,
          status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supplier_vehicles (
          id TEXT PRIMARY KEY,
          supplier_id TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
          vehicle_type TEXT NOT NULL,
          rate_per_trip REAL NOT NULL DEFAULT 0.00
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS receipts (
          id TEXT PRIMARY KEY,
          supplier_id TEXT REFERENCES suppliers(id),
          material_type TEXT NOT NULL CHECK (material_type IN ('Green Husk', 'Brown Husk', 'Water', 'Diesel')),
          vehicle_type TEXT NOT NULL,
          receipt_date TEXT NOT NULL DEFAULT (date('now')),
          trip_count INTEGER NOT NULL DEFAULT 1,
          rate_per_trip REAL NOT NULL,
          total_amount REAL NOT NULL,
          status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partial', 'Settled')),
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS supplier_ledger (
          id TEXT PRIMARY KEY,
          supplier_id TEXT REFERENCES suppliers(id),
          transaction_date TEXT NOT NULL DEFAULT (date('now')),
          transaction_type TEXT NOT NULL CHECK (transaction_type IN ('Advance Paid', 'Delivery Due')),
          amount REAL NOT NULL,
          balance_impact TEXT NOT NULL CHECK (balance_impact IN ('Owner Paid', 'Owner Owes')),
          note TEXT,
          created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS settlements (
          id TEXT PRIMARY KEY,
          supplier_id TEXT REFERENCES suppliers(id),
          settlement_date TEXT NOT NULL DEFAULT (date('now')),
          settlement_type TEXT CHECK (settlement_type IN ('Partial', 'Full Settlement')),
          amount_paid REAL NOT NULL,
          remaining_balance REAL DEFAULT 0.00,
          linked_invoices TEXT,
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

    const res = await pgPool.query(`SELECT nextval('${seqName}') as val`);
    return `${prefix}-${String(res.rows[0].val).padStart(padLen, '0')}`;
  } else {
    let table = 'suppliers';
    let padLen = 3;
    if (prefix === 'RCT') { table = 'receipts'; padLen = 4; }
    if (prefix === 'STL') { table = 'settlements'; padLen = 3; }

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
    const sqliteText = text.replace(/\$(\d+)/g, '?');
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
