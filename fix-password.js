const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'attendance_db',
});

async function fixPasswords() {
  try {
    console.log('🔧 FIXING PASSWORDS...\n');
    
    // Generate correct hash for 'password123'
    const correctHash = await bcrypt.hash('password123', 10);
    console.log('Generated hash for "password123":', correctHash);
    console.log('');
    
    // Update all users with correct hash
    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email IN ('admin@company.com', 'hr@company.com', 'john@company.com', 'jane@company.com', 'mike@company.com')
      RETURNING email
    `, [correctHash]);
    
    console.log(`✅ Updated ${result.rowCount} users\n`);
    
    // Verify the updates
    console.log('Verifying passwords:');
    const users = await pool.query('SELECT email, password_hash FROM users');
    
    for (const user of users.rows) {
      const isValid = await bcrypt.compare('password123', user.password_hash);
      console.log(`${user.email}: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    }
    
    console.log('\n✅ Password fix completed!');
    console.log('\n📋 Try logging in with:');
    console.log('   Email: john@company.com');
    console.log('   Password: password123');
    
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixPasswords();