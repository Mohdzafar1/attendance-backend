const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { username, email, password, role_id, full_name, department, employee_code } = userData;
    const password_hash = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (username, email, password_hash, role_id, full_name, department, employee_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, role_id, full_name, department, employee_code, is_active, created_at
    `;
    const values = [username, email, password_hash, role_id, full_name, department, employee_code];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT u.*, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1 AND u.is_active = true
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT u.id, u.username, u.email, u.full_name, u.department, u.employee_code, 
             u.is_active, u.created_at, r.id as role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const allowedFields = ['full_name', 'department', 'is_active'];
    const setClause = allowedFields
      .filter(field => updates[field] !== undefined)
      .map((field, i) => `${field} = $${i + 2}`)
      .join(', ');
    
    if (!setClause) return null;
    
    const values = [id, ...allowedFields.filter(f => updates[f] !== undefined).map(f => updates[f])];
    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateRole(userId, roleId) {
    const query = 'UPDATE users SET role_id = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [roleId, userId]);
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let query = `
      SELECT u.id, u.username, u.email, u.full_name, u.department, u.employee_code, 
             u.is_active, u.created_at, r.name as role_name, r.id as role_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;
    
    if (filters.role_id) {
      query += ` AND u.role_id = $${valueIndex++}`;
      values.push(filters.role_id);
    }
    if (filters.is_active !== undefined) {
      query += ` AND u.is_active = $${valueIndex++}`;
      values.push(filters.is_active);
    }
    
    query += ` ORDER BY u.created_at DESC`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = User;