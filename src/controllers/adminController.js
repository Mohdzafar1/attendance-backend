const pool = require('../config/database');
const User = require('../models/User');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll(req.query);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, role_id, full_name, department, employee_code } = req.body;
    
    // Check if user exists
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    const user = await User.create({ username, email, password, role_id, full_name, department, employee_code });
    
    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.userId, 'CREATE_USER', 'USER', user.id, req.ip]
    );
    
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const user = await User.update(id, updates);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, new_value) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.userId, 'UPDATE_USER', 'USER', id, req.ip, JSON.stringify(updates)]
    );
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if trying to delete own account
    if (parseInt(id) === req.userId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }
    
    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, old_value) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.userId, 'DELETE_USER', 'USER', id, req.ip, JSON.stringify({ deleted_user_id: id })]
    );
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;
    
    const user = await User.updateRole(id, role_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, new_value) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.userId, 'UPDATE_USER_ROLE', 'USER', id, req.ip, JSON.stringify({ role_id })]
    );
    
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getAttendanceRules = async (req, res) => {
  try {
    const query = 'SELECT * FROM attendance_rules WHERE is_active = true ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const createAttendanceRule = async (req, res) => {
  try {
    const { rule_name, rule_type, rule_value } = req.body;
    
    const query = `
      INSERT INTO attendance_rules (rule_name, rule_type, rule_value, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [rule_name, rule_type, rule_value, req.userId]);
    
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.userId, 'CREATE_RULE', 'ATTENDANCE_RULE', result.rows[0].id, req.ip]
    );
    
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const updateAttendanceRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { rule_name, rule_value, is_active } = req.body;
    
    const query = `
      UPDATE attendance_rules 
      SET rule_name = COALESCE($1, rule_name),
          rule_value = COALESCE($2, rule_value),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [rule_name, rule_value, is_active, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.userId, 'UPDATE_RULE', 'ATTENDANCE_RULE', id, req.ip]
    );
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0, user_id, action } = req.query;
    
    let query = `
      SELECT al.*, u.username, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;
    
    if (user_id) {
      query += ` AND al.user_id = $${valueIndex++}`;
      values.push(user_id);
    }
    if (action) {
      query += ` AND al.action = $${valueIndex++}`;
      values.push(action);
    }
    
    query += ` ORDER BY al.created_at DESC LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const stats = {};
    
    // Total users
    const userCount = await pool.query('SELECT COUNT(*) FROM users WHERE is_active = true');
    stats.total_users = parseInt(userCount.rows[0].count);
    
    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await pool.query(
      'SELECT COUNT(*) FROM attendance_records WHERE attendance_date = $1 AND clock_in_time IS NOT NULL',
      [today]
    );
    stats.today_clocked_in = parseInt(todayAttendance.rows[0].count);
    
    // Pending corrections
    const pendingCorrections = await pool.query(
      'SELECT COUNT(*) FROM correction_requests WHERE status = $1',
      ['pending']
    );
    stats.pending_corrections = parseInt(pendingCorrections.rows[0].count);
    
    // Late arrivals this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const lateArrivals = await pool.query(
      'SELECT COUNT(*) FROM attendance_records WHERE attendance_date >= $1 AND status = $2',
      [startOfMonth, 'late']
    );
    stats.late_arrivals_month = parseInt(lateArrivals.rows[0].count);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  getAttendanceRules,
  createAttendanceRule,
  updateAttendanceRule,
  getAuditLogs,
  getDashboardStats,
  deleteUser
};