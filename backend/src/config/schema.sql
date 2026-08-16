CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1;
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
CREATE SEQUENCE IF NOT EXISTS settlement_seq START 1;
CREATE SEQUENCE IF NOT EXISTS product_seq START 1;
CREATE SEQUENCE IF NOT EXISTS dust_master_seq START 1;
CREATE SEQUENCE IF NOT EXISTS dust_customer_seq START 1;
CREATE SEQUENCE IF NOT EXISTS dust_sale_seq START 1;
CREATE SEQUENCE IF NOT EXISTS sales_dispatch_seq START 1;
CREATE SEQUENCE IF NOT EXISTS expense_seq START 1;

-- Operational Expenses Schema
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

-- Product Directory Schema
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'PRD-' || LPAD(CAST(nextval('product_seq') AS TEXT), 3, '0'),
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- e.g., 'Coir Fibre', 'Coir Yarn', 'Curled Coir', 'Coir Rope', 'Others'
    unit VARCHAR(30) NOT NULL DEFAULT 'Bundle', -- e.g., 'Bundle', 'Bale', 'Piece'
    approx_bundle_weight NUMERIC(10, 2) NOT NULL, -- in kg (e.g., 35.00)
    sell_price_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- in ₹ per kg (e.g., 28.50)
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales & Stock Out Dispatches Schema
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

-- Dust Sub-System Schema
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
