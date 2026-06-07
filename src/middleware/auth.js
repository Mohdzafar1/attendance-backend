const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const query = `
      SELECT u.id, u.username, u.email, u.full_name, u.department, u.employee_code, 
             u.is_active, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.is_active = true
    `;
    const result = await pool.query(query, [decoded.id]);
    const user = result.rows[0];
    
    if (!user) {
      throw new Error();
    }
    
    req.user = user;
    req.userId = decoded.id;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Please authenticate' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({ 
        success: false, 
        message: `Role ${req.user.role_name} is not authorized to access this resource` 
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };