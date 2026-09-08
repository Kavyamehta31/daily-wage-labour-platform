-- PostgreSQL Database Schema for Daily Wage Labour Attendance & Payment Platform
-- Initial Migration: Phase 1 Core Entities

-- 1. Create User Roles Enum safely
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('CONTRACTOR', 'ADMIN');
    END IF;
END $$;

-- 2. Create Attendance Status Enum safely
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY');
    END IF;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CONTRACTOR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sites Table
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    contractor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_name VARCHAR(255) NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Workers Table
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    contractor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL, -- Job type/role (e.g. Mason, Electrician, Labourer)
    daily_wage NUMERIC(10, 2) NOT NULL CHECK (daily_wage >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Worker Site Assignments Table
CREATE TABLE IF NOT EXISTS worker_site_assignments (
    id SERIAL PRIMARY KEY,
    worker_id INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    site_id INT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_worker_site UNIQUE (worker_id, site_id)
);

-- 5. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    worker_id INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    site_id INT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_worker_site_date UNIQUE (worker_id, site_id, date)
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    worker_id INT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimizing query performance
CREATE INDEX IF NOT EXISTS idx_sites_contractor ON sites(contractor_id);
CREATE INDEX IF NOT EXISTS idx_workers_contractor ON workers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_worker_site_assignments_worker ON worker_site_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_site_assignments_site ON worker_site_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_attendance_worker_date ON attendance(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_site_date ON attendance(site_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_worker_date ON payments(worker_id, payment_date);
