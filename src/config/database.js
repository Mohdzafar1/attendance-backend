// const { Pool } = require('pg');
// const dotenv = require('dotenv');

// dotenv.config();

// const pool = new Pool({
//   host: process.env.DB_HOST || 'localhost',
//   port: process.env.DB_PORT || 5432,
//   user: process.env.DB_USER || 'postgres',
//   password: process.env.DB_PASSWORD || 'postgres',
//   database: process.env.DB_NAME || 'attendance_db',
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });

// // Test database connection
// pool.connect((err, client, release) => {
//   if (err) {
//     console.error('❌ Database connection failed:', err.stack);
//   } else {
//     console.log('✅ Connected to PostgreSQL database');
//     release();
//   }
// });

// module.exports = pool;

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
(async () => {
  try {
    const client = await pool.connect();

    const result = await client.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL database');
    console.log('🕒 Server Time:', result.rows[0].now);

    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }
})();

module.exports = pool;