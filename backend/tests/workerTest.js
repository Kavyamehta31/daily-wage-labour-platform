import 'dotenv/config';
import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting Worker Management Integration Tests ---');
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
  const contractorAEmail = `contractor_w_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_w_b_${timestamp}@example.com`;
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
    const userAId = regAData.user.id;

    // Register Contractor B
    const regBRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Contractor B', email: contractorBEmail, password }),
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.token;

    // 1. Unauthenticated worker access -> 401
    const unauthRes = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauth Worker', role: 'Mason', daily_wage: 500 }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated worker creation returns 401 Unauthorized');

    // 2. Create worker & 3. Verify worker ownership set from authenticated contractor
    const createW1Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ram Kumar', role: 'Mason', daily_wage: 750.00 }),
    });
    const createW1Data = await createW1Res.json();
    assert(createW1Res.status === 201, 'Contractor A creates Worker W1 (201 Created)');
    assert(createW1Data.worker.contractor_id === userAId, 'Worker W1 contractor_id set strictly from authenticated user');
    const worker1Id = createW1Data.worker.id;

    // Contractor B creates Worker W2
    const createW2Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suresh Singh', role: 'Electrician', daily_wage: 850.00 }),
    });
    const createW2Data = await createW2Res.json();
    assert(createW2Res.status === 201, 'Contractor B creates Worker W2 (201 Created)');
    const worker2Id = createW2Data.worker.id;

    // 4. List only own workers
    const listARes = await fetch(`${baseUrl}/workers`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const listAData = await listARes.json();
    assert(
      listARes.status === 200 &&
      listAData.workers.some(w => w.id === worker1Id) &&
      !listAData.workers.some(w => w.id === worker2Id),
      'Contractor A lists only their own workers (W1 present, W2 absent)'
    );

    // 5. Get own worker
    const getW1Res = await fetch(`${baseUrl}/workers/${worker1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const getW1Data = await getW1Res.json();
    assert(getW1Res.status === 200 && getW1Data.worker.name === 'Ram Kumar', 'Contractor A fetches own Worker W1 details');

    // 6. Update own worker
    const updateW1Res = await fetch(`${baseUrl}/workers/${worker1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_wage: 800.00 }),
    });
    const updateW1Data = await updateW1Res.json();
    assert(
      updateW1Res.status === 200 && Number(updateW1Data.worker.daily_wage) === 800.00,
      'Contractor A updates own Worker W1 daily_wage'
    );

    // 7. Delete own worker
    const createW3Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Temp Worker', role: 'Labourer', daily_wage: 500.00 }),
    });
    const createW3Data = await createW3Res.json();
    const worker3Id = createW3Data.worker.id;

    const delW3Res = await fetch(`${baseUrl}/workers/${worker3Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(delW3Res.status === 200, 'Contractor A deletes own Worker W3');

    const getW3DeletedRes = await fetch(`${baseUrl}/workers/${worker3Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(getW3DeletedRes.status === 404, 'Deleted Worker W3 is no longer accessible');

    // 8. Reject another contractor accessing a worker
    const crossGetRes = await fetch(`${baseUrl}/workers/${worker1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossGetRes.status === 404, 'Contractor B denied access to Contractor A worker on GET (404 Not Found)');

    // 9. Reject another contractor updating/deleting a worker
    const crossPutRes = await fetch(`${baseUrl}/workers/${worker1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_wage: 1000.00 }),
    });
    assert(crossPutRes.status === 404, 'Contractor B denied update of Contractor A worker on PUT (404 Not Found)');

    const crossDelRes = await fetch(`${baseUrl}/workers/${worker1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossDelRes.status === 404, 'Contractor B denied deletion of Contractor A worker on DELETE (404 Not Found)');

    // 10. Assign own worker to own site
    // Contractor A creates Site S1
    const siteA1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Central Plaza Site', location: 'Downtown' }),
    });
    const siteA1Data = await siteA1Res.json();
    const site1Id = siteA1Data.site.id;

    const assignRes = await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site1Id }),
    });
    const assignData = await assignRes.json();
    assert(assignRes.status === 201 && assignData.assignment.site_id === site1Id, 'Contractor A assigns own Worker W1 to own Site S1 (201 Created)');

    // 11. Prevent duplicate assignment
    const dupAssignRes = await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site1Id }),
    });
    assert(dupAssignRes.status === 400, 'Duplicate worker-site assignment rejected with HTTP 400');

    // 12. Reject assignment to another contractor's site
    // Contractor B creates Site S2
    const siteB1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Eastside Park Site', location: 'Eastside' }),
    });
    const siteB1Data = await siteB1Res.json();
    const site2Id = siteB1Data.site.id;

    const assignOtherSiteRes = await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site2Id }),
    });
    assert(assignOtherSiteRes.status === 404, 'Contractor A denied assignment to Contractor B site (404 Not Found)');

    // 13. Reject assigning another contractor's worker
    const assignOtherWorkerRes = await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site2Id }),
    });
    assert(assignOtherWorkerRes.status === 404, 'Contractor B denied assigning Contractor A worker (404 Not Found)');

    // 14. Verify assigned-site data is isolated
    const getWorkerSitesRes = await fetch(`${baseUrl}/workers/${worker1Id}/sites`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const workerSitesData = await getWorkerSitesRes.json();
    assert(
      getWorkerSitesRes.status === 200 &&
      workerSitesData.sites.length === 1 &&
      workerSitesData.sites[0].id === site1Id,
      'Contractor A fetches Worker W1 assigned sites (Site S1 returned)'
    );

    const crossWorkerSitesRes = await fetch(`${baseUrl}/workers/${worker1Id}/sites`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossWorkerSitesRes.status === 404, 'Contractor B denied fetching Worker W1 assigned sites (404 Not Found)');

    console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await pool.end();
  }
}

runTests();
