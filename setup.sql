-- ============================================
-- COMPLETE DATABASE SETUP FOR ATTENDANCE SYSTEM
-- RUN THIS SCRIPT ONCE TO SETUP EVERYTHING
-- ============================================

-- Drop existing tables (in correct order to avoid foreign key errors)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS correction_requests CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_rules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- 1. Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    department VARCHAR(100),
    employee_code VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- 3. Attendance Records table
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    clock_in_time TIMESTAMP,
    clock_out_time TIMESTAMP,
    clock_in_location VARCHAR(255),
    clock_out_location VARCHAR(255),
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'present',
    is_updated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, attendance_date)
);

-- 4. Correction Requests table
CREATE TABLE correction_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_record_id INTEGER REFERENCES attendance_records(id) ON DELETE SET NULL,
    request_type VARCHAR(50) NOT NULL,
    request_date DATE NOT NULL,
    original_in_time TIMESTAMP,
    original_out_time TIMESTAMP,
    requested_in_time TIMESTAMP,
    requested_out_time TIMESTAMP,
    corrected_time TIMESTAMP,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    remarks TEXT,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Attendance Rules table
CREATE TABLE attendance_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    rule_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Logs table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert Roles
INSERT INTO roles (name, description) VALUES
('admin', 'System Administrator - Full access to all features'),
('hr', 'HR Manager - Can manage attendance and approve corrections'),
('employee', 'Regular Employee - Can mark attendance and request corrections');

-- Insert Users (password for all is 'password123')
INSERT INTO users (username, email, password_hash, role_id, full_name, department, employee_code) VALUES
('admin1', 'admin@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 1, 'System Administrator', 'IT', 'ADMIN001'),
('hrmanager', 'hr@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 2, 'HR Manager', 'Human Resources', 'HR001'),
('john_doe', 'john@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 3, 'John Doe', 'Engineering', 'EMP001'),
('jane_smith', 'jane@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 3, 'Jane Smith', 'Sales', 'EMP002'),
('mike_wilson', 'mike@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 3, 'Mike Wilson', 'Marketing', 'EMP003');

-- Insert Attendance Rules
INSERT INTO attendance_rules (rule_name, rule_type, rule_value, created_by) VALUES
('Standard Work Hours', 'work_hours', '{"start": "09:00", "end": "18:00", "min_hours": 8}'::jsonb, 1),
('Late Threshold', 'late_threshold', '{"minutes": 15, "grace_period": 5}'::jsonb, 1),
('Overtime Policy', 'overtime', '{"multiplier": 1.5, "min_overtime": 30}'::jsonb, 1),
('Half Day Policy', 'half_day', '{"min_hours": 4, "max_hours": 5}'::jsonb, 1);

-- Insert sample attendance records for current date
INSERT INTO attendance_records (user_id, attendance_date, clock_in_time, clock_out_time, total_hours, status)
SELECT 3, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP, 8, 'present'
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE user_id = 3 AND attendance_date = CURRENT_DATE);

INSERT INTO attendance_records (user_id, attendance_date, clock_in_time, status)
SELECT 4, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '7.5 hours', 'present'
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE user_id = 4 AND attendance_date = CURRENT_DATE);

INSERT INTO attendance_records (user_id, attendance_date, status)
SELECT 5, CURRENT_DATE, 'absent'
WHERE NOT EXISTS (SELECT 1 FROM attendance_records WHERE user_id = 5 AND attendance_date = CURRENT_DATE);

-- Insert sample correction request
INSERT INTO correction_requests (user_id, request_type, request_date, reason, corrected_time, status) 
SELECT 4, 'missed_out_time', CURRENT_DATE, 'Forgot to clock out due to urgent meeting', CURRENT_TIMESTAMP, 'pending'
WHERE NOT EXISTS (SELECT 1 FROM correction_requests WHERE user_id = 4 AND request_date = CURRENT_DATE);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_records(user_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_corrections_user_id ON correction_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_status ON correction_requests(status);
CREATE INDEX IF NOT EXISTS idx_corrections_date ON correction_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- CREATE TRIGGERS FOR AUTO-UPDATING timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_correction_requests_updated_at ON correction_requests;
CREATE TRIGGER update_correction_requests_updated_at BEFORE UPDATE ON correction_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_rules_updated_at ON attendance_rules;
CREATE TRIGGER update_attendance_rules_updated_at BEFORE UPDATE ON attendance_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE VIEWS FOR EASY REPORTING
-- ============================================

-- View for attendance summary
CREATE OR REPLACE VIEW v_attendance_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.full_name,
    u.email,
    u.department,
    u.employee_code,
    ar.attendance_date,
    ar.clock_in_time,
    ar.clock_out_time,
    ar.total_hours,
    ar.status as attendance_status,
    cr.id as correction_id,
    cr.status as correction_status,
    cr.request_type,
    CASE 
        WHEN ar.clock_in_time IS NULL THEN 'Not Clocked In'
        WHEN ar.clock_out_time IS NULL THEN 'Working'
        ELSE 'Completed'
    END as day_status
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id
LEFT JOIN correction_requests cr ON u.id = cr.user_id AND ar.attendance_date = cr.request_date
WHERE u.is_active = true
ORDER BY ar.attendance_date DESC;

-- View for HR dashboard
CREATE OR REPLACE VIEW v_hr_dashboard AS
SELECT 
    COUNT(DISTINCT u.id) as total_employees,
    COUNT(DISTINCT CASE WHEN u.role_id = 3 THEN u.id END) as total_employees_count,
    COUNT(DISTINCT CASE WHEN ar.attendance_date = CURRENT_DATE AND ar.clock_in_time IS NOT NULL THEN u.id END) as today_present,
    COUNT(DISTINCT CASE WHEN ar.attendance_date = CURRENT_DATE AND ar.status = 'late' THEN u.id END) as today_late,
    COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_corrections
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id
LEFT JOIN correction_requests cr ON cr.status = 'pending';

-- ============================================
-- DISPLAY SUMMARY
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETE!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '✓ Tables created successfully';
    RAISE NOTICE '✓ Sample data inserted';
    RAISE NOTICE '✓ Indexes created';
    RAISE NOTICE '✓ Triggers created';
    RAISE NOTICE '✓ Views created';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Sample Credentials:';
    RAISE NOTICE '  Admin:    admin@company.com / password123';
    RAISE NOTICE '  HR:       hr@company.com / password123';
    RAISE NOTICE '  Employee: john@company.com / password123';
    RAISE NOTICE '  Employee: jane@company.com / password123';
    RAISE NOTICE '=========================================';
END $$;

-- Display summary counts
SELECT '✅ DATABASE SETUP COMPLETE!' as Status;
SELECT COUNT(*) as Total_Roles FROM roles;
SELECT COUNT(*) as Total_Users FROM users;
SELECT COUNT(*) as Total_Rules FROM attendance_rules;
SELECT COUNT(*) as Total_Attendance_Records FROM attendance_records;

