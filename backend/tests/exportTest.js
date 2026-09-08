import 'dotenv/config';
import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting CSV Export Integration Tests ---');
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
  const contractorAEmail = `contractor_exp_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_exp_b_${timestamp}@example.com`;
  const contractorCEmail = `contractor_exp_c_${timestamp}@example.com`; // Zero state
  const password = 'Password123!';

  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Register Contractor A
    const regARes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor A', email: contractorAEmail, password }),
    });
    const regAData = await regARes.json();
    const tokenA = regAData.token;

    // 2. Register Contractor B
    const regBRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor B', email: contractorBEmail, password }),
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;

    // 3. Register Contractor C (Zero state)
    const regCRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor C', email: contractorCEmail, password }),
    });
    const regCData = await regCRes.json();
    const tokenC = regCData.token;

    // ASSERTION 1: Unauthenticated requests return 401
    const unauthAtt = await fetch(`${baseUrl}/export/attendance`);
    const unauthWage = await fetch(`${baseUrl}/export/wages`);
    const unauthPay = await fetch(`${baseUrl}/export/payments`);
    assert(
      unauthAtt.status === 401 && unauthWage.status === 401 && unauthPay.status === 401,
      '1. Unauthenticated requests to all export endpoints return 401'
    );

    // Setup Contractor A Data:
    // Site A
    const siteARes = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Metro Hub A', location: 'Downtown' }),
    });
    const siteAData = await siteARes.json();
    const siteAId = siteAData.site.id;

    // Worker A: Daily wage 700.00
    const workerARes = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rohan Kumar', role: 'Mason', daily_wage: 700 }),
    });
    const workerAData = await workerARes.json();
    const workerAId = workerAData.worker.id;

    // Assign Worker A to Site A
    await fetch(`${baseUrl}/workers/${workerAId}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteAId }),
    });

    // Mark 3 attendance records for Worker A
    // Date 1: PRESENT (700)
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerAId, site_id: siteAId, date: '2026-08-10', status: 'PRESENT' }),
    });
    // Date 2: HALF_DAY (350)
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerAId, site_id: siteAId, date: '2026-08-11', status: 'HALF_DAY' }),
    });
    // Date 3: ABSENT (0)
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerAId, site_id: siteAId, date: '2026-08-12', status: 'ABSENT' }),
    });

    // Record Payment for Worker A: 400.00 on 2026-08-11
    await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerAId, amount: 400.00, payment_date: '2026-08-11' }),
    });

    // Setup Contractor B Data:
    const siteBRes = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Skyline Tower B', location: 'Uptown' }),
    });
    const siteBData = await siteBRes.json();
    const siteBId = siteBData.site.id;

    const workerBRes = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vikram Singh', role: 'Electrician', daily_wage: 900 }),
    });
    const workerBData = await workerBRes.json();
    const workerBId = workerBData.worker.id;

    await fetch(`${baseUrl}/workers/${workerBId}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteBId }),
    });

    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerBId, site_id: siteBId, date: '2026-08-10', status: 'PRESENT' }),
    });

    await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerBId, amount: 900.00, payment_date: '2026-08-10' }),
    });

    // ASSERTION 2: Attendance Muster Roll Export for Contractor A
    const expAttARes = await fetch(`${baseUrl}/export/attendance`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const attACsv = await expAttARes.text();
    const attALines = attACsv.trim().split(/\r?\n/);
    assert(
      expAttARes.status === 200 &&
      expAttARes.headers.get('content-type').includes('text/csv') &&
      attALines[0] === 'Worker Name,Site Name,Date,Attendance Status,Daily Wage',
      '2. Attendance Muster Roll CSV has correct status 200, Content-Type text/csv, and header line'
    );

    // ASSERTION 3: Contractor A attendance CSV data accuracy & isolation
    assert(
      attALines.length === 4 && // 1 header + 3 attendance rows
      attACsv.includes('Rohan Kumar') &&
      attACsv.includes('Metro Hub A') &&
      attACsv.includes('PRESENT') &&
      attACsv.includes('HALF_DAY') &&
      attACsv.includes('ABSENT') &&
      !attACsv.includes('Vikram Singh') &&
      !attACsv.includes('Skyline Tower B'),
      '3. Contractor A attendance CSV contains all own worker logs and strictly isolates Contractor B data'
    );

    // ASSERTION 4: Contractor B attendance CSV isolation
    const expAttBRes = await fetch(`${baseUrl}/export/attendance`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    const attBCsv = await expAttBRes.text();
    assert(
      attBCsv.includes('Vikram Singh') &&
      attBCsv.includes('Skyline Tower B') &&
      !attBCsv.includes('Rohan Kumar') &&
      !attBCsv.includes('Metro Hub A'),
      '4. Contractor B attendance CSV strictly isolates Contractor A data'
    );

    // ASSERTION 5: Wage Report Export for Contractor A (with custom date range matching attendance)
    const expWageARes = await fetch(`${baseUrl}/export/wages?start_date=2026-08-10&end_date=2026-08-12`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const wageACsv = await expWageARes.text();
    const wageALines = wageACsv.trim().split(/\r?\n/);
    assert(
      expWageARes.status === 200 &&
      wageALines[0] === 'Worker Name,Period Start,Period End,Present Days,Half Days,Absent Days,Total Earnings,Paid,Pending Dues',
      '5. Wage Report CSV has correct status 200 and required header columns'
    );

    // ASSERTION 6: Wage calculation consistency in CSV export
    // Rohan Kumar: 1 Present, 1 Half Day, 1 Absent
    // Earnings: 1*700 + 0.5*700 + 0 = 1050.00
    // Paid: 400.00
    // Pending Dues: 1050.00 - 400.00 = 650.00
    const expectedWageRow = 'Rohan Kumar,2026-08-10,2026-08-12,1,1,1,1050.00,400.00,650.00';
    assert(
      wageALines[1] === expectedWageRow && !wageACsv.includes('Vikram Singh'),
      '6. Wage CSV output matches authoritative calculations: Earnings 1050.00, Paid 400.00, Pending Dues 650.00'
    );

    // ASSERTION 7: Contractor B wage report isolation & zero pending dues check
    const expWageBRes = await fetch(`${baseUrl}/export/wages?start_date=2026-08-10&end_date=2026-08-12`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    const wageBCsv = await expWageBRes.text();
    const expectedWageBRow = 'Vikram Singh,2026-08-10,2026-08-12,1,0,0,900.00,900.00,0.00';
    assert(
      wageBCsv.includes(expectedWageBRow) && !wageBCsv.includes('Rohan Kumar'),
      '7. Contractor B wage CSV matches authoritative calculations (900.00 earned, 900.00 paid, 0.00 dues) with contractor isolation'
    );

    // ASSERTION 8: Payment Report Export for Contractor A
    const expPayARes = await fetch(`${baseUrl}/export/payments`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const payACsv = await expPayARes.text();
    const payALines = payACsv.trim().split(/\r?\n/);
    assert(
      expPayARes.status === 200 &&
      payALines[0] === 'Worker Name,Payment Date,Amount',
      '8. Payment Report CSV has correct status 200 and required header columns'
    );

    // ASSERTION 9: Payment data accuracy & isolation
    assert(
      payALines.length === 2 &&
      payALines[1] === 'Rohan Kumar,2026-08-11,400.00' &&
      !payACsv.includes('Vikram Singh'),
      '9. Payment CSV reports Contractor A payment (400.00) and excludes Contractor B payments'
    );

    // ASSERTION 10: Empty results handling (Contractor C has 0 sites, 0 workers, 0 attendance, 0 payments)
    const expAttCRes = await fetch(`${baseUrl}/export/attendance`, {
      headers: { 'Authorization': `Bearer ${tokenC}` },
    });
    const expWageCRes = await fetch(`${baseUrl}/export/wages`, {
      headers: { 'Authorization': `Bearer ${tokenC}` },
    });
    const expPayCRes = await fetch(`${baseUrl}/export/payments`, {
      headers: { 'Authorization': `Bearer ${tokenC}` },
    });
    const attCCsv = await expAttCRes.text();
    const wageCCsv = await expWageCRes.text();
    const payCCsv = await expPayCRes.text();

    assert(
      expAttCRes.status === 200 &&
      attCCsv.trim() === 'Worker Name,Site Name,Date,Attendance Status,Daily Wage' &&
      expWageCRes.status === 200 &&
      wageCCsv.trim() === 'Worker Name,Period Start,Period End,Present Days,Half Days,Absent Days,Total Earnings,Paid,Pending Dues' &&
      expPayCRes.status === 200 &&
      payCCsv.trim() === 'Worker Name,Payment Date,Amount',
      '10. Empty dataset exports return 200 with headers only, without throwing errors or null references'
    );

    // ASSERTION 11: Value Escaping Test (special characters, commas in names)
    // Create site with comma: "Phase 1, Sector 9"
    const siteSpecialRes = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Phase 1, Sector 9', location: 'City Center' }),
    });
    const siteSpecialData = await siteSpecialRes.json();
    const siteSpecialId = siteSpecialData.site.id;

    // Create worker with comma in name: "Kumar, Rajesh"
    const workerSpecialRes = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Kumar, Rajesh', role: 'Painter', daily_wage: 550 }),
    });
    const workerSpecialData = await workerSpecialRes.json();
    const workerSpecialId = workerSpecialData.worker.id;

    await fetch(`${baseUrl}/workers/${workerSpecialId}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteSpecialId }),
    });

    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerSpecialId, site_id: siteSpecialId, date: '2026-08-15', status: 'PRESENT' }),
    });

    const expAttSpecialRes = await fetch(`${baseUrl}/export/attendance?site_id=${siteSpecialId}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const attSpecialCsv = await expAttSpecialRes.text();
    assert(
      attSpecialCsv.includes('"Kumar, Rajesh"') && attSpecialCsv.includes('"Phase 1, Sector 9"'),
      '11. Special characters (commas) in worker and site names are safely escaped with quotes according to RFC 4180'
    );

    // ASSERTION 12: Clean up test data
    await pool.query(
      `DELETE FROM users WHERE email IN ($1, $2, $3)`,
      [contractorAEmail, contractorBEmail, contractorCEmail]
    );
    assert(true, '12. Cleaned up seeded export test records successfully');

    console.log(`\n--- Export Test Summary: ${passed} Passed, ${failed} Failed ---`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Export test execution crash:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
