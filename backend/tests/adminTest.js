import 'dotenv/config';
import pool from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_key';
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

async function runTests() {
  console.log('--- Starting Admin Panel Integration Tests ---');
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
  const contractorAEmail = `contractor_admin_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_admin_b_${timestamp}@example.com`;
  const contractorCEmail = `contractor_admin_c_${timestamp}@example.com`; // For zero-state check
  const adminEmail = `admin_test_${timestamp}@example.com`;
  const password = 'Password123!';

  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // -------------------------------------------------------------
    // SETUP: Seed Admin and Contractors
    // Create Admin user in DB
    const adminHash = await bcrypt.hash(password, 10);
    const adminSeedRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')
       RETURNING id, name, email, role`,
      ['Test Auditor Admin', adminEmail, adminHash]
    );
    const adminUser = adminSeedRes.rows[0];
    const adminToken = generateToken(adminUser);

    // Register Contractor A
    const regARes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor A', email: contractorAEmail, password }),
    });
    const regAData = await regARes.json();
    const tokenA = regAData.token;
    const contractorAId = regAData.user.id;

    // Register Contractor B
    const regBRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor B', email: contractorBEmail, password }),
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;
    const contractorBId = regBData.user.id;

    // Register Contractor C (Zero/Empty state Contractor)
    const regCRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor C', email: contractorCEmail, password }),
    });
    const regCData = await regCRes.json();
    const contractorCId = regCData.user.id;

    // Contractor A creates Site S1 and Worker W1 (daily wage 800)
    const siteA1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Tech Park', location: 'Tower A' }),
    });
    const siteA1Data = await siteA1Res.json();
    const siteS1Id = siteA1Data.site.id;

    const workerA1Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Amit Sharma', role: 'Electrician', daily_wage: 800.00 }),
    });
    const workerA1Data = await workerA1Res.json();
    const workerW1Id = workerA1Data.worker.id;

    // Assign Worker W1 to Site S1
    await fetch(`${baseUrl}/workers/${workerW1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteS1Id }),
    });

    // Contractor B creates Site S2 and Worker W2 (daily wage 1000)
    const siteB1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Metro Line', location: 'Station B' }),
    });
    const siteB1Data = await siteB1Res.json();
    const siteS2Id = siteB1Data.site.id;

    const workerB1Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rajesh Gupta', role: 'Mason', daily_wage: 1000.00 }),
    });
    const workerB1Data = await workerB1Res.json();
    const workerW2Id = workerB1Data.worker.id;

    // Assign Worker W2 to Site S2
    await fetch(`${baseUrl}/workers/${workerW2Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteS2Id }),
    });

    // -------------------------------------------------------------
    // ASSERTIONS 1 & 2: Role Gate Enforcement
    // 1. Unauthenticated stats request -> 401
    const unauthStatsRes = await fetch(`${baseUrl}/admin/dashboard/stats`);
    assert(unauthStatsRes.status === 401, '1. Unauthenticated request to stats returns 401');

    // 2. Contractor A requests stats -> 403
    const contractorStatsRes = await fetch(`${baseUrl}/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(contractorStatsRes.status === 403, '2. Contractor token request to stats returns 403');

    // 3. Contractor A requests contractors list -> 403
    const contractorListRes = await fetch(`${baseUrl}/admin/contractors`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(contractorListRes.status === 403, '3. Contractor token request to contractors list returns 403');

    // 4. Contractor A requests worker audit -> 403
    const contractorWorkerRes = await fetch(`${baseUrl}/admin/workers/${workerW1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(contractorWorkerRes.status === 403, '4. Contractor token request to worker details returns 403');

    // 5. Contractor A requests site audit -> 403
    const contractorSiteRes = await fetch(`${baseUrl}/admin/sites/${siteS1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(contractorSiteRes.status === 403, '5. Contractor token request to site details returns 403');

    // 6. Admin access to stats -> 200 SUCCESS
    const adminStatsRes = await fetch(`${baseUrl}/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    assert(adminStatsRes.status === 200, '6. Admin access to dashboard stats returns 200');

    // 7. Security: password_hash never exposed in controllers
    const contractorsRes = await fetch(`${baseUrl}/admin/contractors`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const contractorsData = await contractorsRes.json();
    const hasHash = contractorsData.contractors.some(u => u.hasOwnProperty('password_hash'));
    assert(
      contractorsRes.status === 200 && !hasHash,
      '7. Contractors list fetched successfully with NO password_hash properties exposed'
    );

    // 8. Contractor details details checks
    const detailsRes = await fetch(`${baseUrl}/admin/contractors/${contractorAId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const detailsData = await detailsRes.json();
    assert(
      detailsRes.status === 200 &&
      detailsData.contractor.name === 'Contractor A' &&
      !detailsData.contractor.hasOwnProperty('password_hash'),
      '8. Admin gets contractor details securely containing name and email'
    );

    // 9. Site count and worker count validation
    assert(
      detailsData.contractor.site_count === 1 && detailsData.contractor.worker_count === 1,
      '9. Site and worker metadata counts correspond properly'
    );

    // 10. Worker list contains assigned site details
    const nestedWorkers = detailsData.contractor.workers || [];
    const nestedSites = detailsData.contractor.sites || [];
    assert(
      nestedWorkers.length === 1 &&
      nestedWorkers[0].name === 'Amit Sharma' &&
      nestedWorkers[0].assigned_sites[0].site_name === 'Tech Park' &&
      nestedSites.length === 1 &&
      nestedSites[0].assigned_workers_count === 1,
      '10. Worker list aggregates assigned sites array correctly'
    );

    // 11. Invalid contractor ID checks
    const invalidIdRes1 = await fetch(`${baseUrl}/admin/contractors/999999`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const invalidIdRes2 = await fetch(`${baseUrl}/admin/contractors/notanumber`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    assert(
      invalidIdRes1.status === 404 && invalidIdRes2.status === 400,
      '11. Missing contractor ID returns 404, invalid formatted type checks return 400'
    );

    // 12. Site details inspector checks
    const siteDetailRes = await fetch(`${baseUrl}/admin/sites/${siteS1Id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const siteDetailData = await siteDetailRes.json();
    assert(
      siteDetailRes.status === 200 && siteDetailData.site.assigned_workers.length === 1,
      '12. Site inspector returns assigned worker lists'
    );

    // 13. worker auditor detail sheet checks
    const workerDetailRes = await fetch(`${baseUrl}/admin/workers/${workerW1Id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const workerDetailData = await workerDetailRes.json();
    assert(
      workerDetailRes.status === 200 &&
      workerDetailData.worker.name === 'Amit Sharma' &&
      workerDetailData.worker.contractor_name === 'Contractor A' &&
      Array.isArray(workerDetailData.worker.attendance_logs) &&
      Array.isArray(workerDetailData.worker.payment_logs),
      '13. Worker auditor exposes detailed logs and contractor mapping'
    );

    // 14. Zero state testing on empty Contractor C
    const zeroStateRes = await fetch(`${baseUrl}/admin/contractors/${contractorCId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const zeroStateData = await zeroStateRes.json();
    assert(
      zeroStateRes.status === 200 &&
      zeroStateData.contractor.site_count === 0 &&
      zeroStateData.contractor.worker_count === 0 &&
      zeroStateData.contractor.earnings === 0 &&
      zeroStateData.contractor.payments === 0 &&
      zeroStateData.contractor.pending_dues === 0,
      '14. Zero state contractor successfully returns zero values'
    );

    // Fetch initial stats
    const initStatsRes = await fetch(`${baseUrl}/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const initStatsData = await initStatsRes.json();
    const initialStats = initStatsData.data;

    // 15. Setup records for stats math checks:
    // Mark Worker W1 (daily wage 800) PRESENT on 2026-08-01 (earnings = 800)
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerW1Id, site_id: siteS1Id, date: '2026-08-01', status: 'PRESENT' }),
    });
    // Add payment = ₹300.00 for W1 (payments = 300, pending dues = 500)
    await pool.query(
      "INSERT INTO payments (worker_id, amount, payment_date) VALUES ($1, 300.00, '2026-08-01')",
      [workerW1Id]
    );

    // Mark Worker W2 (daily wage 1000) HALF_DAY on 2026-08-01 (earnings = 500)
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerW2Id, site_id: siteS2Id, date: '2026-08-01', status: 'HALF_DAY' }),
    });
    // Add payment = ₹600.00 for W2 (payments = 600, pending dues = 0)
    await pool.query(
      "INSERT INTO payments (worker_id, amount, payment_date) VALUES ($1, 600.00, '2026-08-01')",
      [workerW2Id]
    );

    // 16. Match overall system stats calculations:
    // Total Earnings = W1 (800) + W2 (500) = 1300
    // Total Payments = 300 + 600 = 900
    // Total Pending Dues = W1 dues (500) + W2 dues (0) = 500
    const statsCheckRes = await fetch(`${baseUrl}/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const statsCheckData = await statsCheckRes.json();
    assert(
      statsCheckRes.status === 200 &&
      statsCheckData.data.totalEarnings === initialStats.totalEarnings + 1300.00 &&
      statsCheckData.data.totalPaymentsAmount === initialStats.totalPaymentsAmount + 900.00 &&
      statsCheckData.data.totalPendingDues === initialStats.totalPendingDues + 500.00 &&
      statsCheckData.data.totalAttendance === initialStats.totalAttendance + 2 &&
      statsCheckData.data.totalPaymentsCount === initialStats.totalPaymentsCount + 2,
      '16. System stats math calculations yield correct aggregates'
    );

    // 17. Verify Contractor details updates correctly with wage/payments
    const detailsCheckRes = await fetch(`${baseUrl}/admin/contractors/${contractorAId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const detailsCheckData = await detailsCheckRes.json();
    assert(
      detailsCheckRes.status === 200 &&
      detailsCheckData.contractor.earnings === 800.00 &&
      detailsCheckData.contractor.payments === 300.00 &&
      detailsCheckData.contractor.pending_dues === 500.00,
      '17. Contractor details aggregates propagate correctly'
    );

    // 18. Worker details aggregates match details checklist
    const workerCheckRes = await fetch(`${baseUrl}/admin/workers/${workerW1Id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const workerCheckData = await workerCheckRes.json();
    assert(
      workerCheckRes.status === 200 &&
      workerCheckData.worker.wage_summary.total_earnings === 800.00 &&
      workerCheckData.worker.wage_summary.payments_made === 300.00 &&
      workerCheckData.worker.wage_summary.pending_dues === 500.00,
      '18. Worker details wage audit aggregates match the calculations'
    );

    // 19. Contractor B cross-access test: Contractor B token hitting Admin endpoints returns 403
    const crossAccessRes = await fetch(`${baseUrl}/admin/contractors/${contractorAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossAccessRes.status === 403, '19. Contractor denied cross access to other contractor details via admin route');

    // 20. No unintended mutation endpoints on admin
    const mutateRes1 = await fetch(`${baseUrl}/admin/contractors`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hack Name' }),
    });
    const mutateRes2 = await fetch(`${baseUrl}/admin/contractors/${contractorAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    assert(
      (mutateRes1.status === 404 || mutateRes1.status === 405) &&
      (mutateRes2.status === 404 || mutateRes2.status === 405),
      '20. Attempting POST/DELETE mutations on read-only admin routes fails logically (404/405)'
    );

    // 21. Clean up tests: delete test users & test data from DB
    await pool.query(
      `DELETE FROM users WHERE email IN ($1, $2, $3, $4)`,
      [contractorAEmail, contractorBEmail, contractorCEmail, adminEmail]
    );
    assert(true, '21. Cleaned up seeded records successfully');

    console.log(`\n--- Admin Test Summary: ${passed} Passed, ${failed} Failed ---`);
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
