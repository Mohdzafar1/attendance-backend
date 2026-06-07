const pool = require('../config/database');

const getPendingRequests = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const query = `
      SELECT cr.*, 
             u.full_name as employee_name, 
             u.email as employee_email,
             u.department,
             r.full_name as reviewed_by_name
      FROM correction_requests cr
      JOIN users u ON cr.user_id = u.id
      LEFT JOIN users r ON cr.reviewed_by = r.id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [parseInt(limit), parseInt(offset)]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const reviewRequest = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { status, remarks } = req.body;
    const reviewerId = req.userId;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    // Get the request
    const requestQuery = 'SELECT * FROM correction_requests WHERE id = $1 FOR UPDATE';
    const requestResult = await client.query(requestQuery, [id]);
    
    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    
    const request = requestResult.rows[0];
    
    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }
    
    // Update request
    const updateQuery = `
      UPDATE correction_requests 
      SET status = $1, remarks = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [status, remarks, reviewerId, id]);
    
    // If approved, update attendance record
    if (status === 'approved') {
      // Check if attendance record exists
      const checkAttendance = await client.query(
        'SELECT * FROM attendance_records WHERE user_id = $1 AND attendance_date = $2',
        [request.user_id, request.request_date]
      );
      
      let inTime = request.original_in_time;
      let outTime = request.original_out_time;
      
      if (request.request_type === 'missed_in_time' || request.request_type === 'wrong_in_time') {
        inTime = request.corrected_time;
      }
      if (request.request_type === 'missed_out_time' || request.request_type === 'wrong_out_time') {
        outTime = request.corrected_time;
      }
      
      if (checkAttendance.rows.length === 0) {
        // Insert new attendance record
        await client.query(`
          INSERT INTO attendance_records (user_id, attendance_date, clock_in_time, clock_out_time, is_updated)
          VALUES ($1, $2, $3, $4, true)
        `, [request.user_id, request.request_date, inTime, outTime]);
      } else {
        // Update existing record
        await client.query(`
          UPDATE attendance_records 
          SET clock_in_time = COALESCE($1, clock_in_time),
              clock_out_time = COALESCE($2, clock_out_time),
              is_updated = true,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $3 AND attendance_date = $4
        `, [inTime, outTime, request.user_id, request.request_date]);
      }
    }
    
    // Log audit
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, old_value, new_value) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [reviewerId, 'REVIEW_CORRECTION', 'CORRECTION', id, req.ip, 
       JSON.stringify({ status: request.status }), 
       JSON.stringify({ status, remarks })]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: `Request ${status} successfully`,
      data: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
};

const getAllAttendance = async (req, res) => {
  try {
    const { start_date, end_date, department, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT ar.*, u.full_name, u.email, u.department, u.employee_code
      FROM attendance_records ar
      JOIN users u ON ar.user_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let valueIndex = 1;
    
    if (start_date) {
      query += ` AND ar.attendance_date >= $${valueIndex++}`;
      values.push(start_date);
    }
    if (end_date) {
      query += ` AND ar.attendance_date <= $${valueIndex++}`;
      values.push(end_date);
    }
    if (department) {
      query += ` AND u.department = $${valueIndex++}`;
      values.push(department);
    }
    
    query += ` ORDER BY ar.attendance_date DESC LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

module.exports = { getPendingRequests, reviewRequest, getAllAttendance };