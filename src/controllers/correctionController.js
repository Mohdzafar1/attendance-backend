const pool = require('../config/database');

const createRequest = async (req, res) => {
  try {
    const userId = req.userId;
    const { request_type, request_date, corrected_time, reason } = req.body;
    
    // Validate request type
    const validTypes = ['missed_in_time', 'missed_out_time', 'wrong_in_time', 'wrong_out_time'];
    if (!validTypes.includes(request_type)) {
      return res.status(400).json({ success: false, message: 'Invalid request type' });
    }
    
    // Check for duplicate pending request
    const duplicateQuery = `
      SELECT * FROM correction_requests 
      WHERE user_id = $1 AND request_date = $2 AND status = 'pending'
    `;
    const duplicate = await pool.query(duplicateQuery, [userId, request_date]);
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'A pending correction request already exists for this date' 
      });
    }
    
    // Get original attendance record
    const attendanceQuery = 'SELECT * FROM attendance_records WHERE user_id = $1 AND attendance_date = $2';
    const attendance = await pool.query(attendanceQuery, [userId, request_date]);
    
    const originalInTime = attendance.rows[0]?.clock_in_time || null;
    const originalOutTime = attendance.rows[0]?.clock_out_time || null;
    
    const query = `
      INSERT INTO correction_requests 
      (user_id, request_type, request_date, original_in_time, original_out_time, corrected_time, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [userId, request_type, request_date, originalInTime, originalOutTime, corrected_time, reason];
    const result = await pool.query(query, values);
    
    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'CREATE_CORRECTION_REQUEST', 'CORRECTION', result.rows[0].id, req.ip]
    );
    
    res.json({ 
      success: true, 
      message: 'Correction request submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT cr.*, 
             r.full_name as reviewed_by_name
      FROM correction_requests cr
      LEFT JOIN users r ON cr.reviewed_by = r.id
      WHERE cr.user_id = $1
    `;
    const values = [userId];
    let valueIndex = 2;
    
    if (status) {
      query += ` AND cr.status = $${valueIndex++}`;
      values.push(status);
    }
    
    query += ` ORDER BY cr.created_at DESC LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getRequestStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    
    const query = `
      SELECT cr.*, r.full_name as reviewer_name
      FROM correction_requests cr
      LEFT JOIN users r ON cr.reviewed_by = r.id
      WHERE cr.id = $1 AND cr.user_id = $2
    `;
    const result = await pool.query(query, [id, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

module.exports = { createRequest, getMyRequests, getRequestStatus };