CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
CREATE SEQUENCE IF NOT EXISTS settlement_seq START 1;

-- 0. Master Vehicles Table (Truck Master)
CREATE TABLE IF NOT EXISTS master_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_type VARCHAR(50) NOT NULL UNIQUE,
    default_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Suppliers Table
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

-- 2. Supplier Vehicles & Rate Matrix Table
CREATE TABLE IF NOT EXISTS supplier_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id VARCHAR(20) REFERENCES suppliers(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    rate_per_trip NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- 3. Material Receipts Table (SM-02)
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

-- 4. Payment Ledger Table (SM-03)
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

-- 5. Account Settlements Table (SM-04)
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
