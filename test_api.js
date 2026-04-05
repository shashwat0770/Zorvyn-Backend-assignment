'use strict';
/**
 * Zorvyn Finance API - Test Suite
 * Writes results to test_report.json for clean reading.
 */

const http = require('http');
const fs   = require('fs');

const BASE    = 'http://localhost:3000/api';
const results = [];

/* ── HTTP helper ── */
function req(method, urlPath, body, token) {
  return new Promise(function(resolve, reject) {
    var url  = new URL(BASE + urlPath);
    var opts = {
      method   : method,
      hostname : url.hostname,
      port     : parseInt(url.port) || 80,
      path     : url.pathname + url.search,
      headers  : { 'Content-Type': 'application/json' },
      timeout  : 8000,
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    var r = http.request(opts, function(res) {
      var raw = '';
      res.on('data', function(c) { raw += c; });
      res.on('end', function() {
        try   { resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error',   reject);
    r.on('timeout', function() { r.destroy(); reject(new Error('Timeout: ' + method + ' ' + urlPath)); });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function check(label, condition, hint) {
  var entry = { label: label, pass: !!condition, hint: hint || '' };
  results.push(entry);
}

/* ── Run ── */
async function run() {
  var adminToken, analystToken, viewerToken, freshViewerToken;
  var adminId, analystId, viewerId;
  var record1Id, record2Id;
  var ts           = Date.now();
  var viewerEmail  = 'viewer_' + ts + '@test.com';
  var analystEmail = 'analyst_' + ts + '@test.com';

  /* 1. Health */
  {
    var r = await req('GET', '/health');
    check('1.1 GET /api/health returns 200',         r.status === 200,           'got ' + r.status);
    check('1.2 uptime is a number',                  typeof r.body.uptime === 'number');
    check('1.3 timestamp is present',                typeof r.body.timestamp === 'string');
    check('1.4 success flag is true',                r.body.success === true);
  }

  /* 2. Registration */
  {
    var r = await req('POST', '/auth/register', { name: 'Test Viewer', email: viewerEmail, password: 'Password1' });
    check('2.1 Register new user returns 201',        r.status === 201,           'got ' + r.status);
    check('2.2 Default role is viewer',               r.body.data && r.body.data.role === 'viewer', 'role=' + (r.body.data && r.body.data.role));
    check('2.3 Password not in response',             r.body.data && !r.body.data.password);
    viewerId = r.body.data && r.body.data.id;
  }
  {
    var r = await req('POST', '/auth/register', { name: 'Test Analyst', email: analystEmail, password: 'Password1' });
    check('2.4 Register analyst candidate returns 201', r.status === 201,         'got ' + r.status);
    analystId = r.body.data && r.body.data.id;
  }
  {
    var r = await req('POST', '/auth/register', { name: 'Dup', email: viewerEmail, password: 'Password1' });
    check('2.5 Duplicate email returns 409',          r.status === 409,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/auth/register', { name: 'Bad', email: 'bad_' + ts + '@test.com', password: 'weak' });
    check('2.6 Short/weak password returns 422',      r.status === 422,           'got ' + r.status);
    check('2.7 Errors field present in 422 response', r.body.errors !== undefined, JSON.stringify(r.body));
  }
  {
    var r = await req('POST', '/auth/register', { name: 'Bad', email: 'bad2_' + ts + '@test.com', password: 'password1' });
    check('2.8 No-uppercase password returns 422',    r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/auth/register', { name: 'Bad', email: 'not-an-email', password: 'Password1' });
    check('2.9 Invalid email format returns 422',     r.status === 422,           'got ' + r.status);
  }

  /* 3. Login & /me */
  {
    var r = await req('POST', '/auth/login', { email: 'admin@zorvyn.com', password: 'Admin@123' });
    check('3.1 Seeded admin login returns 200',       r.status === 200,           'got ' + r.status + ' ' + JSON.stringify(r.body).slice(0,100));
    adminToken = r.body.data && r.body.data.token;
    adminId    = r.body.data && r.body.data.user && r.body.data.user.id;
    check('3.2 Login returns JWT token',              typeof adminToken === 'string', 'token=' + adminToken);
    check('3.3 Login returns user object',            !!(r.body.data && r.body.data.user));
    check('3.4 Admin role confirmed',                 r.body.data && r.body.data.user && r.body.data.user.role === 'admin', 'role=' + (r.body.data && r.body.data.user && r.body.data.user.role));
  }
  {
    var r = await req('POST', '/auth/login', { email: viewerEmail, password: 'Password1' });
    check('3.5 Viewer login returns 200',             r.status === 200,           'got ' + r.status);
    viewerToken = r.body.data && r.body.data.token;
  }
  {
    var r = await req('POST', '/auth/login', { email: analystEmail, password: 'Password1' });
    check('3.6 Analyst candidate login returns 200',  r.status === 200,           'got ' + r.status);
    analystToken = r.body.data && r.body.data.token;
  }
  {
    var r = await req('POST', '/auth/login', { email: viewerEmail, password: 'WrongPass1' });
    check('3.7 Wrong password returns 401',           r.status === 401,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/auth/login', { email: 'nobody@example.com', password: 'Password1' });
    check('3.8 Unknown user returns 401',             r.status === 401,           'got ' + r.status);
  }
  {
    var r = await req('GET', '/auth/me', null, viewerToken);
    check('3.9 GET /auth/me returns 200',             r.status === 200,           'got ' + r.status);
    check('3.10 /me hides password',                  r.body.data && !r.body.data.password);
    check('3.11 /me returns correct email',           r.body.data && r.body.data.email === viewerEmail, 'got ' + (r.body.data && r.body.data.email));
  }
  {
    var r = await req('GET', '/auth/me');
    check('3.12 /me without token returns 401',       r.status === 401,           'got ' + r.status);
  }
  {
    var r = await req('GET', '/auth/me', null, 'garbage.token.here');
    check('3.13 /me with bad token returns 401',      r.status === 401,           'got ' + r.status);
  }

  /* 4. User Management */
  {
    var r = await req('GET', '/users', null, adminToken);
    check('4.1 Admin list users returns 200',         r.status === 200,           'got ' + r.status);
    check('4.2 Returns array of users',               Array.isArray(r.body.data), typeof r.body.data);
    check('4.3 Pagination meta present',              !!(r.body.meta && r.body.meta.total >= 1), JSON.stringify(r.body.meta));
    check('4.4 Passwords not exposed in user list',   !!(r.body.data && r.body.data.every(function(u) { return !u.password; })));
  }
  {
    var r = await req('GET', '/users', null, viewerToken);
    check('4.5 Viewer list users returns 403',        r.status === 403,           'got ' + r.status);
  }
  {
    var r = await req('GET', '/users');
    check('4.6 No-token list users returns 401',      r.status === 401,           'got ' + r.status);
  }
  {
    var r = await req('GET', '/users/' + viewerId, null, adminToken);
    check('4.7 Admin get user by ID returns 200',     r.status === 200,           'got ' + r.status + ' id=' + viewerId);
    check('4.8 Correct user returned',                r.body.data && r.body.data.email === viewerEmail);
  }
  {
    var r = await req('GET', '/users/99999999', null, adminToken);
    check('4.9 Unknown user ID returns 404',          r.status === 404,           'got ' + r.status);
  }
  {
    var r = await req('PATCH', '/users/' + analystId + '/role', { role: 'analyst' }, adminToken);
    check('4.10 Admin promotes to analyst returns 200', r.status === 200,         'got ' + r.status + ' id=' + analystId);
    check('4.11 Role is now analyst',                 r.body.data && r.body.data.role === 'analyst', 'role=' + (r.body.data && r.body.data.role));
  }
  {
    var r = await req('PATCH', '/users/' + analystId + '/role', { role: 'admin' }, viewerToken);
    check('4.12 Viewer change role returns 403',      r.status === 403,           'got ' + r.status);
  }
  {
    var r = await req('PATCH', '/users/' + analystId + '/role', { role: 'superuser' }, adminToken);
    check('4.13 Invalid role value returns 422',      r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/auth/login', { email: analystEmail, password: 'Password1' });
    check('4.14 Analyst re-login after promotion 200', r.status === 200,          'got ' + r.status);
    analystToken = r.body.data && r.body.data.token;
    check('4.15 Token reflects analyst role',         r.body.data && r.body.data.user && r.body.data.user.role === 'analyst', 'role=' + (r.body.data && r.body.data.user && r.body.data.user.role));
  }

  /* 5. Records RBAC */
  {
    var r = await req('POST', '/records', { amount: 100, type: 'income', category: 'Test', date: '2024-01-15' }, viewerToken);
    check('5.1 Viewer create record returns 403',     r.status === 403,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/records', { amount: 5000, type: 'income', category: 'Salary', date: '2024-01-01', notes: 'Jan salary' }, analystToken);
    check('5.2 Analyst create income returns 201',    r.status === 201,           'got ' + r.status);
    record1Id = r.body.data && r.body.data.id;
    check('5.3 Amount returned correctly (5000)',     r.body.data && r.body.data.amount === 5000, 'got ' + (r.body.data && r.body.data.amount));
    check('5.4 Type is income',                       r.body.data && r.body.data.type === 'income');
    check('5.5 created_by is set',                   r.body.data && typeof r.body.data.created_by === 'number');
  }
  {
    var r = await req('POST', '/records', { amount: 1200.50, type: 'expense', category: 'Rent', date: '2024-01-05', notes: 'Monthly rent' }, adminToken);
    check('5.6 Admin create expense returns 201',     r.status === 201,           'got ' + r.status);
    record2Id = r.body.data && r.body.data.id;
    check('5.7 Decimal amount 1200.50 stored OK',    r.body.data && r.body.data.amount === 1200.50, 'got ' + (r.body.data && r.body.data.amount));
  }

  /* 6. Records Reading */
  {
    var r = await req('GET', '/records', null, viewerToken);
    check('6.1 Viewer list records returns 200',      r.status === 200,           'got ' + r.status);
    check('6.2 Data is an array',                     Array.isArray(r.body.data));
    check('6.3 At least 2 records in DB',             !!(r.body.meta && r.body.meta.total >= 2), 'total=' + (r.body.meta && r.body.meta.total));
    check('6.4 Pagination meta present',              r.body.meta && typeof r.body.meta.totalPages === 'number');
  }
  {
    var r = await req('GET', '/records/' + record1Id, null, viewerToken);
    check('6.5 Get single record returns 200',        r.status === 200,           'got ' + r.status + ' id=' + record1Id);
    check('6.6 Correct category returned',            r.body.data && r.body.data.category === 'Salary', 'got ' + (r.body.data && r.body.data.category));
    check('6.7 Notes returned correctly',             r.body.data && r.body.data.notes === 'Jan salary');
  }
  {
    var r = await req('GET', '/records/99999999', null, viewerToken);
    check('6.8 Non-existent record returns 404',      r.status === 404,           'got ' + r.status);
  }

  /* 7. Records Update */
  {
    var r = await req('PATCH', '/records/' + record1Id, { amount: 5500, notes: 'Updated salary' }, analystToken);
    check('7.1 Analyst update record returns 200',    r.status === 200,           'got ' + r.status);
    check('7.2 Amount updated to 5500',               r.body.data && r.body.data.amount === 5500, 'got ' + (r.body.data && r.body.data.amount));
    check('7.3 Notes updated correctly',              r.body.data && r.body.data.notes === 'Updated salary');
  }
  {
    var r = await req('PATCH', '/records/' + record1Id, { amount: 999 }, viewerToken);
    check('7.4 Viewer update record returns 403',     r.status === 403,           'got ' + r.status);
  }
  {
    var r = await req('PATCH', '/records/' + record2Id, { category: 'Office Rent' }, adminToken);
    check('7.5 Admin update record returns 200',      r.status === 200,           'got ' + r.status);
    check('7.6 Category updated',                     r.body.data && r.body.data.category === 'Office Rent');
  }

  /* 8. Validation */
  {
    var r = await req('POST', '/records', { amount: 500, type: 'income', category: 'Test', date: '15-01-2024' }, adminToken);
    check('8.1 Invalid date format returns 422',      r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/records', { amount: -100, type: 'income', category: 'Test', date: '2024-01-15' }, adminToken);
    check('8.2 Negative amount returns 422',          r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/records', { amount: 0, type: 'income', category: 'Test', date: '2024-01-15' }, adminToken);
    check('8.3 Zero amount returns 422',              r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/records', { amount: 100, type: 'transfer', category: 'Test', date: '2024-01-15' }, adminToken);
    check('8.4 Invalid type "transfer" returns 422',  r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('PATCH', '/records/' + record1Id, {}, analystToken);
    check('8.5 Empty update body returns 422',        r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('PATCH', '/users/' + viewerId + '/status', { status: 'banned' }, adminToken);
    check('8.6 Invalid status value returns 422',     r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/records', { amount: 100, type: 'income', category: 'A'.repeat(101), date: '2024-01-15' }, adminToken);
    check('8.7 Category >100 chars returns 422',      r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/records', { amount: 1000000000, type: 'income', category: 'Test', date: '2024-01-15' }, adminToken);
    check('8.8 Amount too large returns 422',         r.status === 422,           'got ' + r.status);
  }
  {
    var r = await req('GET', '/this-route-does-not-exist');
    check('8.9 Unknown route returns 404',            r.status === 404,           'got ' + r.status);
  }
  {
    var r = await req('POST', '/auth/login', { email: 'admin@zorvyn.com' });
    check('8.10 Login missing password returns 422',  r.status === 422,           'got ' + r.status);
  }

  /* 9. Filter / Search / Pagination */
  await req('POST', '/records', { amount: 300,  type: 'expense', category: 'Food',      date: '2024-02-10', notes: 'Groceries'   }, adminToken);
  await req('POST', '/records', { amount: 8000, type: 'income',  category: 'Freelance', date: '2024-03-01', notes: 'Design work' }, adminToken);
  await req('POST', '/records', { amount: 150,  type: 'expense', category: 'Transport', date: '2024-03-15', notes: 'Uber rides'  }, adminToken);
  await req('POST', '/records', { amount: 50,   type: 'expense', category: 'Food',      date: '2024-03-20', notes: 'Coffee'      }, adminToken);

  {
    var r = await req('GET', '/records?type=income', null, viewerToken);
    check('9.1 Filter type=income returns 200',       r.status === 200,           'got ' + r.status);
    check('9.2 All returned records are income type', r.body.data && r.body.data.length > 0 && r.body.data.every(function(x) { return x.type === 'income'; }), 'count=' + (r.body.data && r.body.data.length));
  }
  {
    var r = await req('GET', '/records?type=expense', null, viewerToken);
    check('9.3 Filter type=expense returns 200',      r.status === 200,           'got ' + r.status);
    check('9.4 All returned records are expense type', r.body.data && r.body.data.length > 0 && r.body.data.every(function(x) { return x.type === 'expense'; }));
  }
  {
    var r = await req('GET', '/records?category=Freelance', null, viewerToken);
    check('9.5 Filter by category=Freelance returns 200', r.status === 200,       'got ' + r.status);
    check('9.6 All match Freelance category',         r.body.data && r.body.data.every(function(x) { return x.category.includes('Freelance'); }));
  }
  {
    var r = await req('GET', '/records?startDate=2024-03-01&endDate=2024-03-31', null, viewerToken);
    check('9.7 Date range filter returns 200',        r.status === 200,           'got ' + r.status);
    check('9.8 All results within date range',        r.body.data && r.body.data.every(function(x) { return x.date >= '2024-03-01' && x.date <= '2024-03-31'; }));
  }
  {
    var r = await req('GET', '/records?search=Groceries', null, viewerToken);
    check('9.9 Search "Groceries" returns 200',       r.status === 200,           'got ' + r.status);
    check('9.10 At least 1 result matching Groceries', r.body.data && r.body.data.length >= 1 && r.body.data.some(function(x) { return x.notes && x.notes.includes('Groceries'); }));
  }
  {
    var r = await req('GET', '/records?page=1&limit=2', null, viewerToken);
    check('9.11 Pagination limit=2 returns 200',      r.status === 200,           'got ' + r.status);
    check('9.12 Returns max 2 records',               r.body.data && r.body.data.length <= 2, 'got ' + (r.body.data && r.body.data.length));
    check('9.13 meta.limit equals 2',                 r.body.meta && r.body.meta.limit === 2);
    check('9.14 meta.totalPages >= 1',                r.body.meta && r.body.meta.totalPages >= 1);
    check('9.15 meta.page equals 1',                  r.body.meta && r.body.meta.page === 1);
  }

  /* 10. Dashboard */
  {
    var r = await req('GET', '/records/dashboard/summary', null, viewerToken);
    check('10.1 Viewer dashboard/summary returns 200', r.status === 200,          'got ' + r.status);
    var d = r.body.data;
    check('10.2 Has total_income field',               d && typeof d.total_income  === 'number', 'got ' + (d && typeof d.total_income));
    check('10.3 Has total_expense field',              d && typeof d.total_expense === 'number');
    check('10.4 Has net_balance field',                d && typeof d.net_balance   === 'number');
    check('10.5 Has total_records field',              d && typeof d.total_records === 'number');
    check('10.6 net_balance = income - expense',       d && Math.abs((d.total_income - d.total_expense) - d.net_balance) < 0.01, 'in=' + (d && d.total_income) + ' ex=' + (d && d.total_expense) + ' net=' + (d && d.net_balance));
    check('10.7 total_income > 0',                     d && d.total_income > 0, 'got ' + (d && d.total_income));
    check('10.8 total_records > 0',                    d && d.total_records > 0);
  }
  {
    var r = await req('GET', '/records/dashboard/categories', null, viewerToken);
    check('10.9 Viewer dashboard/categories returns 200', r.status === 200,       'got ' + r.status);
    check('10.10 Has income array',                    r.body.data && Array.isArray(r.body.data.income));
    check('10.11 Has expense array',                   r.body.data && Array.isArray(r.body.data.expense));
    check('10.12 Income categories not empty',         r.body.data && r.body.data.income.length > 0);
    check('10.13 Each category has total_amount',      r.body.data && r.body.data.income.every(function(c) { return typeof c.total_amount === 'number'; }));
  }
  {
    var r = await req('GET', '/records/dashboard/trends?period=monthly', null, analystToken);
    check('10.14 Analyst trends monthly returns 200',  r.status === 200,          'got ' + r.status);
    check('10.15 Trends data is an array',             Array.isArray(r.body.data));
  }
  {
    var r = await req('GET', '/records/dashboard/trends?period=weekly', null, analystToken);
    check('10.16 Analyst trends weekly returns 200',   r.status === 200,          'got ' + r.status);
  }
  {
    var r = await req('GET', '/records/dashboard/trends', null, viewerToken);
    check('10.17 Viewer trends returns 403',           r.status === 403,          'got ' + r.status);
  }
  {
    var r = await req('GET', '/records/dashboard/recent', null, viewerToken);
    check('10.18 Viewer dashboard/recent returns 200', r.status === 200,          'got ' + r.status);
    check('10.19 Recent data is an array',             Array.isArray(r.body.data));
    check('10.20 Recent has records',                  r.body.data && r.body.data.length > 0, 'len=' + (r.body.data && r.body.data.length));
  }
  {
    var r = await req('GET', '/records/dashboard/recent?limit=3', null, viewerToken);
    check('10.21 Recent limit=3 returns <=3 records',  r.status === 200 && r.body.data && r.body.data.length <= 3, 'status=' + r.status + ' len=' + (r.body.data && r.body.data.length));
  }

  /* 11. Soft Delete */
  {
    var r = await req('DELETE', '/records/' + record1Id, null, analystToken);
    check('11.1 Analyst delete returns 403',           r.status === 403,          'got ' + r.status);
  }
  {
    var r = await req('DELETE', '/records/' + record1Id, null, viewerToken);
    check('11.2 Viewer delete returns 403',            r.status === 403,          'got ' + r.status);
  }
  {
    var r = await req('DELETE', '/records/' + record2Id, null, adminToken);
    check('11.3 Admin soft-delete returns 200',        r.status === 200,          'got ' + r.status);
  }
  {
    var r = await req('GET', '/records/' + record2Id, null, viewerToken);
    check('11.4 Soft-deleted record returns 404',      r.status === 404,          'got ' + r.status);
  }
  {
    var r = await req('GET', '/records', null, viewerToken);
    var found = r.body.data && r.body.data.some(function(x) { return x.id === record2Id; });
    check('11.5 Soft-deleted excluded from list',      !found, 'id=' + record2Id + ' found=' + found);
  }
  {
    var r = await req('DELETE', '/records/99999999', null, adminToken);
    check('11.6 Delete non-existent returns 404',      r.status === 404,          'got ' + r.status);
  }

  /* 12. User Status */
  {
    var r = await req('PATCH', '/users/' + viewerId + '/status', { status: 'inactive' }, adminToken);
    check('12.1 Admin deactivate user returns 200',    r.status === 200,          'got ' + r.status);
    check('12.2 Status is now inactive',               r.body.data && r.body.data.status === 'inactive');
  }
  {
    var r = await req('GET', '/records', null, viewerToken);
    check('12.3 Deactivated user token rejected 403',  r.status === 403,          'got ' + r.status);
  }
  {
    var r = await req('PATCH', '/users/' + viewerId + '/status', { status: 'active' }, adminToken);
    check('12.4 Admin reactivate user returns 200',    r.status === 200,          'got ' + r.status);
    check('12.5 Status is now active',                 r.body.data && r.body.data.status === 'active');
  }
  {
    var lr = await req('POST', '/auth/login', { email: viewerEmail, password: 'Password1' });
    freshViewerToken = lr.body.data && lr.body.data.token;
    var r = await req('GET', '/records', null, freshViewerToken);
    check('12.6 Reactivated user can access API 200',  r.status === 200,          'got ' + r.status);
  }
  {
    var r = await req('DELETE', '/users/' + adminId, null, adminToken);
    check('12.7 Admin self-delete returns 400',        r.status === 400,          'got ' + r.status + ' adminId=' + adminId);
  }

  /* Write JSON report */
  var total  = results.length;
  var passed = results.filter(function(x) { return x.pass; }).length;
  var failed = results.filter(function(x) { return !x.pass; }).length;
  var report = { total: total, passed: passed, failed: failed, results: results };
  fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2), 'utf8');
  console.log('Report written to test_report.json');
  console.log('Total: ' + total + '  Passed: ' + passed + '  Failed: ' + failed);
  if (failed > 0) process.exitCode = 1;
}

run().catch(function(err) {
  console.log('CRASHED: ' + err.message + '\n' + err.stack);
  process.exit(1);
});
