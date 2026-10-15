require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase, getPool, isDbConnected, initialEmployees, TABLE_NAME } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory Data Store (Used as fallback if MySQL is not running)
let employees = JSON.parse(JSON.stringify(initialEmployees));

// 1D K-Means Clustering Algorithm
function kMeans1D(data, k, maxIter) {
  if (k === undefined) k = 3;
  if (maxIter === undefined) maxIter = 100;

  if (data.length === 0) return [];
  if (data.length <= k) {
    return data.map(function(v, i) { return { centroid: v, indices: [i] }; });
  }

  var sorted = data.slice().sort(function(a, b) { return a - b; });
  var centroids = [];
  for (var ci = 0; ci < k; ci++) {
    centroids.push(sorted[Math.floor(((ci + 0.5) * sorted.length) / k)]);
  }

  var assignments = [];
  for (var ai = 0; ai < data.length; ai++) assignments.push(-1);

  for (var iter = 0; iter < maxIter; iter++) {
    var newAssignments = data.map(function(val) {
      var minDist = Infinity;
      var best = 0;
      for (var j = 0; j < centroids.length; j++) {
        var dist = Math.abs(val - centroids[j]);
        if (dist < minDist) { minDist = dist; best = j; }
      }
      return best;
    });

    var changed = false;
    for (var ni = 0; ni < newAssignments.length; ni++) {
      if (newAssignments[ni] !== assignments[ni]) { changed = true; break; }
    }
    assignments = newAssignments;
    if (!changed) break;

    centroids = centroids.map(function(_, cIdx) {
      var group = [];
      for (var di = 0; di < data.length; di++) {
        if (assignments[di] === cIdx) group.push(data[di]);
      }
      if (group.length === 0) return centroids[cIdx];
      var sum = group.reduce(function(s, v) { return s + v; }, 0);
      return sum / group.length;
    });
  }

  return centroids.map(function(c, cIdx) {
    var indices = [];
    for (var di = 0; di < assignments.length; di++) {
      if (assignments[di] === cIdx) indices.push(di);
    }
    return { centroid: Math.round(c), indices: indices };
  });
}

// PHASE 1: Authentication
// POST /api/login
app.post('/api/login', async function(req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  // 1. Try checking in MySQL Database if connected
  if (isDbConnected()) {
    try {
      const [rows] = await getPool().query(
        'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
        [username, password]
      );
      if (rows.length > 0) {
        return res.status(200).json({
          success: true,
          token: 'mock-jwt-token',
          user: { username: rows[0].username, role: rows[0].role || 'admin' },
        });
      }
    } catch (err) {
      console.error('DB Login error:', err.message);
    }
  }

  // 2. Default credentials check (admin / password123)
  if (username === 'admin' && password === 'password123') {
    return res.status(200).json({
      success: true,
      token: 'mock-jwt-token',
      user: { username: 'admin', role: 'admin' },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password',
  });
});

// PHASE 1: Employee CRUD
// GET /api/employees (supports ?search=...)
app.get('/api/employees', async function(req, res) {
  var search = (req.query.search || '').trim().toLowerCase();
  var result = [];

  if (isDbConnected()) {
    try {
      var query = `SELECT id, name, position, status, CAST(salary AS SIGNED) as salary FROM \`${TABLE_NAME}\``;
      var params = [];
      if (search) {
        query += ` WHERE LOWER(name) LIKE ? OR LOWER(position) LIKE ? OR LOWER(status) LIKE ?`;
        var s = `%${search}%`;
        params = [s, s, s];
      }
      query += ` ORDER BY id ASC`;
      const [rows] = await getPool().query(query, params);
      result = rows.map(function(r) {
        return {
          id: String(r.id),
          name: r.name,
          position: r.position,
          status: r.status,
          salary: Number(r.salary),
        };
      });
      return res.json(result);
    } catch (err) {
      console.error('DB fetch error, falling back to memory:', err.message);
    }
  }

  result = employees;
  if (search) {
    result = employees.filter(function(e) {
      return (
        e.name.toLowerCase().includes(search) ||
        e.position.toLowerCase().includes(search) ||
        e.status.toLowerCase().includes(search) ||
        String(e.salary).includes(search)
      );
    });
  }
  res.json(result);
});

// POST /api/employees
app.post('/api/employees', async function(req, res) {
  var name = req.body.name;
  var position = req.body.position;
  var salary = req.body.salary;

  if (
    name == null    || String(name).trim()     === '' ||
    position == null || String(position).trim() === '' ||
    salary == null  || String(salary).trim()   === ''
  ) {
    return res.status(400).json({ error: 'name, position, and salary are required' });
  }

  var salaryNum = Number(salary);
  if (isNaN(salaryNum) || salaryNum < 0) {
    return res.status(400).json({ error: 'salary must be a valid positive number' });
  }

  var trimmedName = String(name).trim();
  var trimmedPos = String(position).trim();

  if (isDbConnected()) {
    try {
      const [result] = await getPool().query(
        `INSERT INTO \`${TABLE_NAME}\` (name, position, status, salary) VALUES (?, ?, ?, ?)`,
        [trimmedName, trimmedPos, 'Active', salaryNum]
      );
      const newEmp = {
        id:       String(result.insertId),
        name:     trimmedName,
        position: trimmedPos,
        status:   'Active',
        salary:   salaryNum,
      };
      return res.status(201).json(newEmp);
    } catch (err) {
      console.error('DB insert error, falling back to memory:', err.message);
    }
  }

  var newEmployee = {
    id:       String(Date.now()),
    name:     trimmedName,
    position: trimmedPos,
    status:   'Active',
    salary:   salaryNum,
  };

  employees.push(newEmployee);
  res.status(201).json(newEmployee);
});

// PUT /api/employees/:id  (Update Employee Details: name, position, salary, status)
app.put('/api/employees/:id', async function(req, res) {
  var id = req.params.id;
  var name = req.body.name;
  var position = req.body.position;
  var salary = req.body.salary;
  var status = req.body.status;

  if (
    name == null    || String(name).trim()     === '' ||
    position == null || String(position).trim() === '' ||
    salary == null  || String(salary).trim()   === ''
  ) {
    return res.status(400).json({ error: 'name, position, and salary are required' });
  }

  var salaryNum = Number(salary);
  if (isNaN(salaryNum) || salaryNum < 0) {
    return res.status(400).json({ error: 'salary must be a valid positive number' });
  }

  var trimmedName = String(name).trim();
  var trimmedPos = String(position).trim();

  if (isDbConnected()) {
    try {
      const [rows] = await getPool().query(
        `SELECT id, name, position, status, CAST(salary AS SIGNED) as salary FROM \`${TABLE_NAME}\` WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      var current = rows[0];
      var updatedStatus = status ? String(status) : current.status;
      await getPool().query(
        `UPDATE \`${TABLE_NAME}\` SET name = ?, position = ?, salary = ?, status = ? WHERE id = ?`,
        [trimmedName, trimmedPos, salaryNum, updatedStatus, id]
      );
      return res.json({
        id:       String(current.id),
        name:     trimmedName,
        position: trimmedPos,
        status:   updatedStatus,
        salary:   salaryNum,
      });
    } catch (err) {
      console.error('DB update error, falling back to memory:', err.message);
    }
  }

  var employee = null;
  for (var i = 0; i < employees.length; i++) {
    if (employees[i].id === id) { employee = employees[i]; break; }
  }

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  employee.name = trimmedName;
  employee.position = trimmedPos;
  employee.salary = salaryNum;
  if (status) employee.status = String(status);

  res.json(employee);
});

// PUT /api/employees/:id/status  (Toggle Active <-> On Leave)
app.put('/api/employees/:id/status', async function(req, res) {
  var id = req.params.id;

  if (isDbConnected()) {
    try {
      const [rows] = await getPool().query(
        `SELECT id, name, position, status, CAST(salary AS SIGNED) as salary FROM \`${TABLE_NAME}\` WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      var current = rows[0];
      var newStatus = current.status === 'Active' ? 'On Leave' : 'Active';
      await getPool().query(`UPDATE \`${TABLE_NAME}\` SET status = ? WHERE id = ?`, [newStatus, id]);
      return res.json({
        id:       String(current.id),
        name:     current.name,
        position: current.position,
        status:   newStatus,
        salary:   Number(current.salary),
      });
    } catch (err) {
      console.error('DB status update error, falling back to memory:', err.message);
    }
  }

  var employee = null;
  for (var i = 0; i < employees.length; i++) {
    if (employees[i].id === id) { employee = employees[i]; break; }
  }

  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';
  res.json(employee);
});

// DELETE /api/employees/:id
app.delete('/api/employees/:id', async function(req, res) {
  var id = req.params.id;

  if (isDbConnected()) {
    try {
      const [rows] = await getPool().query(
        `SELECT id, name, position, status, CAST(salary AS SIGNED) as salary FROM \`${TABLE_NAME}\` WHERE id = ?`,
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      var deleted = {
        id:       String(rows[0].id),
        name:     rows[0].name,
        position: rows[0].position,
        status:     rows[0].status,
        salary:   Number(rows[0].salary),
      };
      await getPool().query(`DELETE FROM \`${TABLE_NAME}\` WHERE id = ?`, [id]);
      return res.json({ success: true, employee: deleted });
    } catch (err) {
      console.error('DB delete error, falling back to memory:', err.message);
    }
  }

  var index = -1;
  for (var i = 0; i < employees.length; i++) {
    if (employees[i].id === id) { index = i; break; }
  }

  if (index === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  var deletedEmployee = employees.splice(index, 1)[0];
  res.json({ success: true, employee: deletedEmployee });
});

// PHASE 2: Salary Clustering (1D K-Means, k=3)
// GET /api/employees/salary-clusters
app.get('/api/employees/salary-clusters', async function(req, res) {
  var currentEmployees = employees;

  if (isDbConnected()) {
    try {
      const [rows] = await getPool().query(
        `SELECT id, name, position, status, CAST(salary AS SIGNED) as salary FROM \`${TABLE_NAME}\` ORDER BY id ASC`
      );
      currentEmployees = rows.map(function(r) {
        return {
          id:       String(r.id),
          name:     r.name,
          position: r.position,
          status:   r.status,
          salary:   Number(r.salary),
        };
      });
    } catch (err) {
      console.error('DB cluster fetch error, falling back to memory:', err.message);
    }
  }

  if (currentEmployees.length === 0) {
    return res.status(200).json({ success: true, clusters: [] });
  }

  var salaries = currentEmployees.map(function(e) { return Number(e.salary); });
  var k = Math.min(3, currentEmployees.length);
  var rawClusters = kMeans1D(salaries, k);

  rawClusters.sort(function(a, b) { return a.centroid - b.centroid; });

  var tierNames = ['Tier 1', 'Tier 2', 'Tier 3'];
  var clusters = rawClusters.map(function(cluster, idx) {
    var members = cluster.indices.map(function(i) {
      return {
        id:       currentEmployees[i].id,
        name:     currentEmployees[i].name,
        salary:   currentEmployees[i].salary,
        position: currentEmployees[i].position,
      };
    });
    return {
      group:    tierNames[idx] || ('Tier ' + (idx + 1)),
      centroid: cluster.centroid,
      count:    cluster.indices.length,
      members:  members,
    };
  });

  res.json({ success: true, clusters: clusters });
});

// Health Check
app.get('/api/health', function(req, res) {
  res.json({
    status: 'OK',
    database: isDbConnected() ? 'connected (MySQL/phpMyAdmin)' : 'in-memory (fallback)',
    timestamp: new Date().toISOString(),
  });
});

// Start Server & Initialize Database
async function startServer() {
  await initDatabase();

  app.listen(PORT, function() {
    console.log('===========================================');
    console.log('  HR Manager & Salary Analytics API');
    console.log('  Server running at http://localhost:' + PORT);
    console.log('  Active Table: ' + TABLE_NAME);
    console.log('  DB Mode: ' + (isDbConnected() ? 'MySQL/phpMyAdmin ✅' : 'In-Memory (Fallback) ℹ️'));
    console.log('===========================================');
    console.log('  GET  /api/employees');
    console.log('  POST /api/employees');
    console.log('  PUT  /api/employees/:id');
    console.log('  PUT  /api/employees/:id/status');
    console.log('  DEL  /api/employees/:id');
    console.log('  GET  /api/employees/salary-clusters');
    console.log('  POST /api/login');
    console.log('  GET  /api/health');
    console.log('===========================================');
  });
}

startServer();
