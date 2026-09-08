import 'dotenv/config';
import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting Attendance Backend Integration Tests ---');
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.log('Skipping DB-dependent integration tests: PostgreSQL database connection offline.');
    process.exit(0);
  }

  const timestamp = Date.now();
  const contractorAEmail = `contractor_att_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_att_b_${timestamp}@example.com`;
  const password = 'Password123!';

  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // Register Contractor A
    const regARes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor A', email: contractorAEmail, password }),
    });
    const regAData = await regARes.json();
    const tokenA = regAData.token;

    // Register Contractor B
    const regBRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor B', email: contractorBEmail, password }),
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;

    // Setup: Contractor A creates Site S1 and Worker W1, and assigns W1 to S1
    const siteA1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Metro Plaza', location: 'City Center' }),
    });
    const siteA1Data = await siteA1Res.json();
    const site1Id = siteA1Data.site.id;

    const workerA1Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Amit Sharma', role: 'Mason', daily_wage: 900.00 }),
    });
    const workerA1Data = await workerA1Res.json();
    const worker1Id = workerA1Data.worker.id;

    // Assign Worker W1 to Site S1
    await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site1Id }),
    });

    // 1. Unauthenticated attendance request -> 401
    const unauthRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-31', status: 'PRESENT' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated attendance request returns 401 Unauthorized');

    // 2. Mark PRESENT attendance
    const presRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-31', status: 'PRESENT' }),
    });
    const presData = await presRes.json();
    assert(presRes.status === 200 && presData.attendance.status === 'PRESENT', 'Mark PRESENT attendance (200 OK)');
    const attId1 = presData.attendance.id;

    // 3. Mark ABSENT attendance
    const absRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-09-01', status: 'ABSENT' }),
    });
    const absData = await absRes.json();
    assert(absRes.status === 200 && absData.attendance.status === 'ABSENT', 'Mark ABSENT attendance (200 OK)');

    // 4. Mark HALF_DAY attendance
    const halfRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-09-02', status: 'HALF_DAY' }),
    });
    const halfData = await halfRes.json();
    assert(halfRes.status === 200 && halfData.attendance.status === 'HALF_DAY', 'Mark HALF_DAY attendance (200 OK)');

    // 5. Update existing attendance record for the same worker/site/date (upsert correction)
    const updateAttRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-09-01', status: 'PRESENT' }),
    });
    const updateAttData = await updateAttRes.json();
    assert(
      updateAttRes.status === 200 && updateAttData.attendance.status === 'PRESENT',
      'Upsert updates existing attendance status for same worker/site/date to PRESENT'
    );

    // 6. Prevent attendance for an unassigned worker/site combination
    const siteA2Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Unassigned Site B', location: 'North' }),
    });
    const siteA2Data = await siteA2Res.json();
    const site2Id = siteA2Data.site.id;

    const unassignedAttRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site2Id, date: '2026-08-31', status: 'PRESENT' }),
    });
    assert(
      unassignedAttRes.status === 400,
      'Reject attendance for unassigned worker/site combination (400 Bad Request)'
    );

    // 7. List contractor's attendance
    const listAttRes = await fetch(`${baseUrl}/attendance`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const listAttData = await listAttRes.json();
    assert(
      listAttRes.status === 200 && listAttData.attendance.length >= 3,
      'List contractor attendance returns records array'
    );

    // 8. Retrieve worker attendance history
    const workerHistRes = await fetch(`${baseUrl}/attendance/worker/${worker1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const workerHistData = await workerHistRes.json();
    assert(
      workerHistRes.status === 200 && workerHistData.history.length >= 3,
      'Retrieve worker attendance history (ordered by date DESC)'
    );

    // 9. Retrieve site attendance
    const siteAttRes = await fetch(`${baseUrl}/attendance/site/${site1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const siteAttData = await siteAttRes.json();
    assert(
      siteAttRes.status === 200 && siteAttData.attendance.length >= 3,
      'Retrieve site attendance records'
    );

    // 10. Reject another contractor accessing attendance
    const crossWorkerHistRes = await fetch(`${baseUrl}/attendance/worker/${worker1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossWorkerHistRes.status === 404, 'Contractor B denied access to Contractor A worker attendance history (404 Not Found)');

    const crossSiteAttRes = await fetch(`${baseUrl}/attendance/site/${site1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossSiteAttRes.status === 404, 'Contractor B denied access to Contractor A site attendance (404 Not Found)');

    // 11. Reject another contractor modifying attendance
    const crossMarkRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-31', status: 'ABSENT' }),
    });
    assert(crossMarkRes.status === 404, 'Contractor B denied marking attendance for Contractor A worker/site (404 Not Found)');

    const crossDelRes = await fetch(`${baseUrl}/attendance/${attId1}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossDelRes.status === 404, 'Contractor B denied deleting Contractor A attendance record (404 Not Found)');

    // 12. Reject invalid status
    const invalidStatusRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-09-05', status: 'OVERTIME' }),
    });
    assert(invalidStatusRes.status === 400, 'Reject invalid attendance status "OVERTIME" (400 Bad Request)');

    // 13. Reject missing required fields
    const missingFieldRes = await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id }),
    });
    assert(missingFieldRes.status === 400, 'Reject missing required fields (400 Bad Request)');

    // 14. Verify records persist in PostgreSQL
    const persistCheckRes = await fetch(`${baseUrl}/attendance/${attId1}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const persistCheckData = await persistCheckRes.json();
    assert(
      persistCheckRes.status === 200 && persistCheckData.attendance.id === attId1,
      'Attendance record persists in PostgreSQL database'
    );

    console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await pool.end();
  }
}

runTests();
