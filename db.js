// db.js
require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'lost_and_found_db',
  port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// optional: test connection quickly
pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ MySQL Connection Failed', err.message || err);
  } else {
    console.log('✔ MySQL Connected Successfully');
    conn.release();
  }
});

module.exports = pool;
