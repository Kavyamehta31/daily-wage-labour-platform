import 'dotenv/config';
import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting Wage Backend Integration Tests ---');
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
  const contractorAEmail = `contractor_wage_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_wage_b_${timestamp}@example.com`;
  const password = 'Password123!';

  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // -------------------------------------------------------------
    // SETUP
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

    // Setup: Contractor A creates Site S1 and Worker W1 (Wage: 900.00)
    const siteA1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Industrial Park', location: 'Block C' }),
    });
    const siteA1Data = await siteA1Res.json();
    const site1Id = siteA1Data.site.id;

    const workerA1Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dinesh Kumar', role: 'Plumber', daily_wage: 900.00 }),
    });
    const workerA1Data = await workerA1Res.json();
    const worker1Id = workerA1Data.worker.id;

    // Assign Worker W1 to Site S1
    await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site1Id }),
    });

    // Setup: Contractor A creates Worker W2 (Zero Wage checking)
    const workerA2Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sunil Prasad', role: 'Helper', daily_wage: 0.00 }),
    });
    const workerA2Data = await workerA2Res.json();
    const worker2Id = workerA2Data.worker.id;

    // -------------------------------------------------------------
    // ASSERTION 1: unauthenticated wage request -> 401
    const unauthRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}`);
    assert(unauthRes.status === 401, '1. Unauthenticated request to worker summary returns 401');

    // ASSERTION 2: contractor can calculate wage for own worker
    const authWageRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(authWageRes.status === 200, '2. Authorized contractor can query own worker details');

    // ASSERTION 3: PRESENT calculation (1.0 x wage)
    // Mark PRESENT on 2026-08-01
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-01', status: 'PRESENT' }),
    });
    const presCalcRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-01&end_date=2026-08-01`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const presCalcData = await presCalcRes.json();
    assert(
      presCalcData.summary.present_days === 1 && presCalcData.summary.total_earnings === 900.00,
      '3. PRESENT attendance yields 1.0 x daily wage'
    );

    // ASSERTION 4: HALF_DAY calculation (0.5 x wage)
    // Mark HALF_DAY on 2026-08-02
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-02', status: 'HALF_DAY' }),
    });
    const halfCalcRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-02&end_date=2026-08-02`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const halfCalcData = await halfCalcRes.json();
    assert(
      halfCalcData.summary.half_day_days === 1 && halfCalcData.summary.total_earnings === 450.00,
      '4. HALF_DAY attendance yields 0.5 x daily wage'
    );

    // ASSERTION 5: ABSENT calculation (0 x wage)
    // Mark ABSENT on 2026-08-03
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-03', status: 'ABSENT' }),
    });
    const absCalcRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-03&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const absCalcData = await absCalcRes.json();
    assert(
      absCalcData.summary.absent_days === 1 && absCalcData.summary.total_earnings === 0.00,
      '5. ABSENT attendance yields 0.00 earnings'
    );

    // ASSERTION 6: mixed attendance calculation
    const mixedCalcRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-01&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const mixedCalcData = await mixedCalcRes.json();
    assert(
      mixedCalcData.summary.present_days === 1 &&
      mixedCalcData.summary.half_day_days === 1 &&
      mixedCalcData.summary.absent_days === 1 &&
      mixedCalcData.summary.total_earnings === 1350.00,
      '6. Mixed attendance sums correctly (1350.00)'
    );

    // ASSERTION 7: daily calculation
    const dailyCalcRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?period=daily&date=2026-08-02`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const dailyCalcData = await dailyCalcRes.json();
    assert(
      dailyCalcData.summary.start_date === '2026-08-02' &&
      dailyCalcData.summary.end_date === '2026-08-02' &&
      dailyCalcData.summary.total_earnings === 450.00,
      '7. "period=daily" isolates calculations for a single target date'
    );

    // ASSERTION 8: weekly calculation
    const weeklyCalcRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?period=weekly&date=2026-08-07`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const weeklyCalcData = await weeklyCalcRes.json();
    assert(
      weeklyCalcData.summary.start_date === '2026-08-01' &&
      weeklyCalcData.summary.end_date === '2026-08-07' &&
      weeklyCalcData.summary.total_earnings === 1350.00,
      '8. "period=weekly" encapsulates a 7-day range ending on target date'
    );

    // ASSERTION 9: date-range calculation
    const customRangeRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-01&end_date=2026-08-02`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const customRangeData = await customRangeRes.json();
    assert(
      customRangeData.summary.start_date === '2026-08-01' &&
      customRangeData.summary.end_date === '2026-08-02' &&
      customRangeData.summary.total_earnings === 1350.00,
      '9. Custom date range isolates requested boundaries (1350.00)'
    );

    // ASSERTION 10: worker with no attendance
    const emptyAttRes = await fetch(`${baseUrl}/wages/worker/${worker2Id}?start_date=2026-08-01&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const emptyAttData = await emptyAttRes.json();
    assert(
      emptyAttData.summary.total_attendance_records === 0 &&
      emptyAttData.summary.total_earnings === 0.00,
      '10. Querying worker with no attendance reports zero records/earnings'
    );

    // ASSERTION 11: worker with no payments
    assert(
      mixedCalcData.summary.payments_made === 0.00 &&
      mixedCalcData.summary.pending_dues === 1350.00,
      '11. Worker with zero payments matches calculated dues = earnings'
    );

    // ASSERTION 12: payment deduction from earnings
    // Seed a payment manually in PostgreSQL (payments_made = 500.00 on 2026-08-02)
    await pool.query(
      'INSERT INTO payments (worker_id, amount, payment_date) VALUES ($1, $2, $3)',
      [worker1Id, 500.00, '2026-08-02']
    );
    const payRes1 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-01&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const payData1 = await payRes1.json();
    assert(
      payData1.summary.payments_made === 500.00 &&
      payData1.summary.pending_dues === 850.00,
      '12. Payment amount correctly reduces pending dues'
    );

    // ASSERTION 13: pending dues calculation & negative dues prevention
    // Insert another payment of 1000.00 (Total 1500.00, exceeding 1350.00 earnings)
    await pool.query(
      'INSERT INTO payments (worker_id, amount, payment_date) VALUES ($1, $2, $3)',
      [worker1Id, 1000.00, '2026-08-02']
    );
    const payRes2 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-01&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const payData2 = await payRes2.json();
    assert(
      payData2.summary.payments_made === 1500.00 &&
      payData2.summary.pending_dues === 0.00,
      '13. Excess payments result in exactly 0.00 pending dues (preventing negative dues)'
    );

    // ASSERTION 14: another contractor cannot access worker wage data
    const crossRes = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-01&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossRes.status === 404, '14. Contractor B denied access to Contractor A worker wages (404)');

    // ASSERTION 15: invalid worker ID
    const invIdRes = await fetch(`${baseUrl}/wages/worker/notanumber`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(invIdRes.status === 400, '15. Invalid worker ID returns 400 Bad Request');

    // ASSERTION 16: invalid date/date range
    const invDateRes1 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-31`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const invDateRes2 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-31&end_date=2026-08-01`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const invDateRes3 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=invalid-date&end_date=2026-08-30`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(
      invDateRes1.status === 400 && invDateRes2.status === 400 && invDateRes3.status === 400,
      '16. Logical query parser rejects half-provided, inverted, or formatted-wrong ranges with 400'
    );

    // ASSERTION 17: verify calculation uses database daily_wage and attendance data rather than client-provided totals
    const contractorSummaryRes = await fetch(`${baseUrl}/wages/summary?start_date=2026-08-01&end_date=2026-08-03`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const contractorSummaryData = await contractorSummaryRes.json();
    
    // Workers returned should be w1 (Dinesh Kumar) and w2 (Sunil Prasad)
    const list = contractorSummaryData.summaries || [];
    const item1 = list.find(x => x.worker_id === worker1Id);
    const item2 = list.find(x => x.worker_id === worker2Id);

    assert(
      list.length >= 2 &&
      item1 && item1.total_earnings === 1350.00 && item1.payments_made === 1500.00 && item1.pending_dues === 0.00 &&
      item2 && item2.total_earnings === 0.00 && item2.payments_made === 0.00,
      '17. Contractor summary uses direct database daily wage & logs without any client inputs'
    );

    console.log(`\n--- Wage Test Summary: ${passed} Passed, ${failed} Failed ---`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution crash:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
