const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('========================================');
    console.log('Login attempt for:', email);
    console.log('Password provided:', password);
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }
    
    // First, get the user
    const userQuery = 'SELECT * FROM users WHERE email = $1 AND is_active = true';
    const userResult = await pool.query(userQuery, [email]);
    const user = userResult.rows[0];
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    console.log('User found:', user.email);
    console.log('Stored hash:', user.password_hash);
    
    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Get role name
    const roleQuery = 'SELECT name FROM roles WHERE id = $1';
    const roleResult = await pool.query(roleQuery, [user.role_id]);
    const roleName = roleResult.rows[0]?.name || 'employee';
    
    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    
    // Generate token
    const token = generateToken(user.id);
    
    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, ip_address) VALUES ($1, $2, $3, $4)',
      [user.id, 'LOGIN', 'AUTH', req.ip || req.connection.remoteAddress]
    );
    
    console.log('Login successful for:', email);
    console.log('========================================');
    
    // Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: roleName,
        department: user.department
      }
    });
    
  } catch (error) {
    console.error('Login error details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};

const getMe = async (req, res) => {
  try {
    const query = `
      SELECT u.id, u.username, u.email, u.full_name, u.department, u.employee_code, 
             u.is_active, u.created_at, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [req.userId]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, ip_address) VALUES ($1, $2, $3, $4)',
      [req.userId, 'LOGOUT', 'AUTH', req.ip || req.connection.remoteAddress]
    );
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Debug endpoint
const debugUsers = async (req, res) => {
  try {
    const users = await pool.query('SELECT id, email, role_id, password_hash FROM users');
    const roles = await pool.query('SELECT * FROM roles');
    
    // Test password for first user
    let testResult = false;
    if (users.rows[0]) {
      testResult = await bcrypt.compare('password123', users.rows[0].password_hash);
    }
    
    res.json({ 
      users: users.rows.map(u => ({ 
        id: u.id, 
        email: u.email, 
        role_id: u.role_id,
        hash_preview: u.password_hash.substring(0, 30) + '...'
      })),
      roles: roles.rows,
      password_test: testResult ? '✅ password123 works' : '❌ password123 fails',
      message: 'Use email: john@company.com, password: password123'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { login, getMe, logout, debugUsers };