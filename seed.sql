-- Insert Roles
INSERT INTO roles (name, description) VALUES
('admin', 'System Administrator - Full access'),
('hr', 'HR Manager - Can manage attendance and corrections'),
('employee', 'Regular Employee - Can mark attendance and request corrections');

-- Insert Users (password: 'password123' hashed with bcrypt)
-- Default password for all users is: password123
INSERT INTO users (username, email, password_hash, role_id, full_name, department, employee_code) VALUES
('admin1', 'admin@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 1, 'System Admin', 'IT', 'EMP001'),
('hrmanager', 'hr@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 2, 'HR Manager', 'HR', 'EMP002'),
('john_doe', 'john@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 3, 'John Doe', 'Engineering', 'EMP003'),
('jane_smith', 'jane@company.com', '$2a$10$rQvKjXYKZ5xX5yX5yX5yXu5x5yX5yX5yX5yX5yX5yX5yX5yX5yX5y', 3, 'Jane Smith', 'Sales', 'EMP004');

-- Insert Attendance Rules
INSERT INTO attendance_rules (rule_name, rule_type, rule_value, created_by) VALUES
('Standard Work Hours', 'work_hours', '{"start": "09:00", "end": "18:00", "min_hours": 8}', 1),
('Late Threshold', 'late_threshold', '{"minutes": 15, "grace_period": 5}', 1),
('Overtime Rate', 'overtime', '{"multiplier": 1.5, "min_overtime": 30}', 1);

-- Insert sample attendance records for current date
INSERT INTO attendance_records (user_id, attendance_date, clock_in_time, clock_out_time, total_hours, status)
VALUES 
(3, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '8 hours', CURRENT_TIMESTAMP, 8, 'present'),
(4, CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '7.5 hours', NULL, NULL, 'present');

-- Insert sample correction request
INSERT INTO correction_requests (user_id, request_type, request_date, reason, corrected_time, status) VALUES
(4, 'missed_out_time', CURRENT_DATE, 'Forgot to clock out due to meeting', CURRENT_TIMESTAMP, 'pending');

-- Insert audit log
INSERT INTO audit_logs (user_id, action, entity_type, ip_address, user_agent) VALUES
(1, 'SYSTEM_INIT', 'SYSTEM', '127.0.0.1', 'Database Seeder');