const pool = require('../config/database');

const clockIn = async (req, res) => {
  try {
    const userId = req.userId;
    const { location } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already clocked in today
    const existingQuery = 'SELECT * FROM attendance_records WHERE user_id = $1 AND attendance_date = $2';
    const existing = await pool.query(existingQuery, [userId, today]);
    
    if (existing.rows.length > 0 && existing.rows[0].clock_in_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already clocked in today' 
      });
    }
    
    // Check attendance rules for late arrival
    let status = 'present';
    const currentTime = new Date();
    const rulesQuery = 'SELECT rule_value FROM attendance_rules WHERE rule_type = $1 AND is_active = true';
    const workHoursRule = await pool.query(rulesQuery, ['work_hours']);
    
    if (workHoursRule.rows.length > 0) {
      const workHours = workHoursRule.rows[0].rule_value;
      const startTime = new Date();
      const [hours, minutes] = workHours.start.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      if (currentTime > startTime) {
        const lateThreshold = await pool.query(rulesQuery, ['late_threshold']);
        if (lateThreshold.rows.length > 0) {
          const threshold = lateThreshold.rows[0].rule_value;
          const diffMinutes = (currentTime - startTime) / (1000 * 60);
          if (diffMinutes > threshold.grace_period) {
            status = 'late';
          }
        }
      }
    }
    
    // Check if record exists
    if (existing.rows.length === 0) {
      const insertQuery = `
        INSERT INTO attendance_records (user_id, attendance_date, clock_in_time, clock_in_location, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [userId, today, new Date(), location || null, status];
      const result = await pool.query(insertQuery, values);
      
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'CLOCK_IN', 'ATTENDANCE', result.rows[0].id, req.ip]
      );
      
      return res.json({ 
        success: true, 
        message: 'Clocked in successfully',
        data: result.rows[0]
      });
    } else {
      const updateQuery = `
        UPDATE attendance_records 
        SET clock_in_time = $1, clock_in_location = $2, status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      const values = [new Date(), location || null, status, existing.rows[0].id];
      const result = await pool.query(updateQuery, values);
      
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'CLOCK_IN', 'ATTENDANCE', result.rows[0].id, req.ip]
      );
      
      return res.json({ 
        success: true, 
        message: 'Clocked in successfully',
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const clockOut = async (req, res) => {
  try {
    const userId = req.userId;
    const { location } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if clocked in today
    const existingQuery = 'SELECT * FROM attendance_records WHERE user_id = $1 AND attendance_date = $2';
    const existing = await pool.query(existingQuery, [userId, today]);
    
    if (existing.rows.length === 0 || !existing.rows[0].clock_in_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must clock in before clocking out' 
      });
    }
    
    if (existing.rows[0].clock_out_time) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already clocked out today' 
      });
    }
    
    // Calculate total hours
    const clockInTime = new Date(existing.rows[0].clock_in_time);
    const clockOutTime = new Date();
    const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    const totalHoursRounded = Math.round(totalHours * 100) / 100;
    
    console.log('Clock In:', clockInTime);
    console.log('Clock Out:', clockOutTime);
    console.log('Total Hours Calculated:', totalHoursRounded);
    
    // Calculate overtime (optional)
    let overtimeHours = 0;
    const rulesQuery = 'SELECT rule_value FROM attendance_rules WHERE rule_type = $1 AND is_active = true';
    const workHoursRule = await pool.query(rulesQuery, ['work_hours']);
    
    if (workHoursRule.rows.length > 0) {
      const workHours = workHoursRule.rows[0].rule_value;
      const endTime = new Date();
      const [hours, minutes] = workHours.end.split(':');
      endTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      if (clockOutTime > endTime) {
        overtimeHours = (clockOutTime - endTime) / (1000 * 60 * 60);
        overtimeHours = Math.round(overtimeHours * 100) / 100;
      }
    }
    
    const query = `
      UPDATE attendance_records 
      SET clock_out_time = $1, 
          clock_out_location = $2,
          total_hours = $3,
          overtime_hours = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    
    const values = [new Date(), location || null, totalHoursRounded, overtimeHours, existing.rows[0].id];
    const result = await pool.query(query, values);
    
    console.log('Updated record:', result.rows[0]);
    
    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'CLOCK_OUT', 'ATTENDANCE', result.rows[0].id, req.ip]
    );
    
    res.json({ 
      success: true, 
      message: 'Clocked out successfully',
      data: {
        ...result.rows[0],
        total_hours: totalHoursRounded,
        overtime_hours: overtimeHours
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getTodayStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const today = new Date().toISOString().split('T')[0];
    
    const query = 'SELECT * FROM attendance_records WHERE user_id = $1 AND attendance_date = $2';
    const result = await pool.query(query, [userId, today]);
    
    if (result.rows[0]) {
      // Ensure total_hours is properly formatted
      const record = result.rows[0];
      if (record.total_hours) {
        record.total_hours = parseFloat(record.total_hours).toFixed(2);
      }
      if (record.overtime_hours) {
        record.overtime_hours = parseFloat(record.overtime_hours).toFixed(2);
      }
    }
    
    res.json({ 
      success: true, 
      data: result.rows[0] || { status: 'not_started', message: 'Not clocked in yet' }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { start_date, end_date, limit = 30, offset = 0 } = req.query;
    
    let query = `
      SELECT ar.*
      FROM attendance_records ar
      WHERE ar.user_id = $1
    `;
    const values = [userId];
    let valueIndex = 2;
    
    if (start_date) {
      query += ` AND ar.attendance_date >= $${valueIndex++}`;
      values.push(start_date);
    }
    if (end_date) {
      query += ` AND ar.attendance_date <= $${valueIndex++}`;
      values.push(end_date);
    }
    
    query += ` ORDER BY ar.attendance_date DESC LIMIT $${valueIndex++} OFFSET $${valueIndex++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    // Format total_hours for each record
    const formattedRows = result.rows.map(record => ({
      ...record,
      total_hours: record.total_hours ? parseFloat(record.total_hours).toFixed(2) : null,
      overtime_hours: record.overtime_hours ? parseFloat(record.overtime_hours).toFixed(2) : 0
    }));
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM attendance_records WHERE user_id = $1';
    const countResult = await pool.query(countQuery, [userId]);
    
    res.json({ 
      success: true, 
      data: formattedRows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

module.exports = { clockIn, clockOut, getTodayStatus, getHistory };