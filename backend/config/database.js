require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'ip_std6730202327',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
};

let pool = null;
let isConnected = false;

// Default initial mock employees
const initialEmployees = [
  { id: '1', name: 'John Doe',    position: 'Software Engineer', status: 'Active',   salary: 45000 },
  { id: '2', name: 'Jane Smith',  position: 'HR Manager',        status: 'Active',   salary: 55000 },
  { id: '3', name: 'Mike Brown',  position: 'Accountant',        status: 'On Leave', salary: 38000 },
  { id: '4', name: 'Sara Lee',    position: 'UX Designer',       status: 'Active',   salary: 42000 },
  { id: '5', name: 'Tom Wilson',  position: 'Sales Executive',   status: 'On Leave', salary: 35000 },
  { id: '6', name: 'Alice Chen',  position: 'Data Analyst',      status: 'Active',   salary: 62000 },
  { id: '7', name: 'Bob Johnson', position: 'DevOps Engineer',   status: 'Active',   salary: 78000 },
  { id: '8', name: 'Carol White', position: 'Marketing Lead',    status: 'Active',   salary: 48000 },
];

const TABLE_NAME = process.env.EMPLOYEES_TABLE || 'Pornpipat_6730202327';

async function initDatabase() {
  try {
    // 1. สร้าง Connection Pool เชื่อมต่อไปยัง Database โดยตรง
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();

    // 3. สร้างตารางพนักงาน (Pornpipat_6730202327)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Active',
        salary DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. สร้างตาราง users (สำหรับการ Login)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // ตรวจสอบ user admin เริ่มต้น
    const [users] = await conn.query('SELECT id FROM users WHERE username = ?', ['admin']);
    if (users.length === 0) {
      await conn.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', 'password123', 'admin']
      );
    }

    // 5. Seed ข้อมูลพนักงานเริ่มต้น 8 คน หากตารางว่าง
    const [existing] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${TABLE_NAME}\``);
    if (existing[0].cnt === 0) {
      for (const emp of initialEmployees) {
        await conn.query(
          `INSERT INTO \`${TABLE_NAME}\` (name, position, status, salary) VALUES (?, ?, ?, ?)`,
          [emp.name, emp.position, emp.status, emp.salary]
        );
      }
      console.log(`🌱 [MySQL] Seeded 8 initial employees into table "${TABLE_NAME}"!`);
    }

    conn.release();
    isConnected = true;
    console.log(`✅ [MySQL/phpMyAdmin] Connected successfully! Database: ${dbConfig.database}, Table: ${TABLE_NAME}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ [MySQL/phpMyAdmin] Connection failed: ${err.message}`);
    console.warn('ℹ️ Running in fallback In-Memory mode (as required by Exam Phase 1 Rubric).');
    return false;
  }
}

function getPool() {
  return pool;
}

function isDbConnected() {
  return isConnected;
}

module.exports = {
  dbConfig,
  TABLE_NAME,
  initDatabase,
  getPool,
  isDbConnected,
  initialEmployees,
};
