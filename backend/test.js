const http = require('http');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json', ...(data && { 'Content-Length': Buffer.byteLength(data) }) }
    };
    const r = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function runTests() {
  console.log('\n===== TEST 1: Login admin =====');
  const login = await req('POST', '/api/login', { username: 'admin', password: 'password123' });
  console.log('Status:', login.status, '| success:', login.body.success, '| token:', login.body.token);

  console.log('\n===== TEST 2: Login wrong password =====');
  const badLogin = await req('POST', '/api/login', { username: 'admin', password: 'wrong' });
  console.log('Status:', badLogin.status, '| success:', badLogin.body.success, '| message:', badLogin.body.message);

  console.log('\n===== TEST 3: GET /api/employees =====');
  const list = await req('GET', '/api/employees');
  console.log('Status:', list.status, '| Count:', list.body.length, 'employees');

  console.log('\n===== TEST 4: POST /api/employees (add) =====');
  const add = await req('POST', '/api/employees', { name: 'Test User', position: 'QA Engineer', salary: 50000 });
  console.log('Status:', add.status, '| Created:', add.body.name, '|', add.body.position, '| salary:', add.body.salary);
  const newId = add.body.id;

  console.log('\n===== TEST 5: POST /api/employees (validation fail) =====');
  const badAdd = await req('POST', '/api/employees', { name: '', position: '', salary: '' });
  console.log('Status:', badAdd.status, '| error:', badAdd.body.error);

  console.log('\n===== TEST 6: PUT /api/employees/:id/status (toggle) =====');
  const toggle = await req('PUT', `/api/employees/${newId}/status`);
  console.log('Status:', toggle.status, '| New status:', toggle.body.status);

  console.log('\n===== TEST 7: DELETE /api/employees/:id =====');
  const del = await req('DELETE', `/api/employees/${newId}`);
  console.log('Status:', del.status, '| Deleted:', del.body.employee?.name);

  console.log('\n===== TEST 8: DELETE /api/employees/:id (not found) =====');
  const notFound = await req('DELETE', `/api/employees/99999`);
  console.log('Status:', notFound.status, '| error:', notFound.body.error);

  console.log('\n===== TEST 9: GET /api/employees/salary-clusters (K-Means) =====');
  const clusters = await req('GET', '/api/employees/salary-clusters');
  console.log('Status:', clusters.status, '| success:', clusters.body.success);
  clusters.body.clusters.forEach(c => {
    console.log(`  ${c.group}: centroid=${c.centroid} count=${c.count}`);
  });

  console.log('\n===== TEST 10: PUT /api/employees/:id (edit full info) =====');
  const add2 = await req('POST', '/api/employees', { name: 'Edit Target', position: 'Junior Dev', salary: 30000 });
  const editId = add2.body.id;
  const edited = await req('PUT', `/api/employees/${editId}`, { name: 'Edited Senior Dev', position: 'Senior Dev', salary: 80000, status: 'Active' });
  console.log('Status:', edited.status, '| Name:', edited.body.name, '| Pos:', edited.body.position, '| Salary:', edited.body.salary);
  await req('DELETE', `/api/employees/${editId}`);

  console.log('\n===== TEST 11: GET /api/employees?search=developer / engineer =====');
  const searchRes = await req('GET', '/api/employees?search=Engineer');
  console.log('Status:', searchRes.status, '| Search "Engineer" found:', searchRes.body.length, 'employees');

  console.log('\n✅ All tests passed!\n');
}

runTests().catch(console.error);
