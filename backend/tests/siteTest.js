import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting Contractor Site Management Integration Tests ---');
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
  const contractorAEmail = `contractor_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_b_${timestamp}@example.com`;
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

    // 1. Test unauthenticated site creation rejection
    const unauthRes = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Unauth Site' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated site creation returns 401 Unauthorized');

    // 2. Test site creation validation (missing site_name)
    const invalidRes = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: '', location: 'Somewhere' }),
    });
    assert(invalidRes.status === 400, 'Creation with empty site_name returns 400 Bad Request');

    // 3. Contractor A creates Site A1 & Site A2
    const siteA1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Metro Station', location: 'Downtown' }),
    });
    const siteA1Data = await siteA1Res.json();
    assert(siteA1Res.status === 201 && siteA1Data.site.site_name === 'Metro Station', 'Contractor A creates Site A1 (201 Created)');
    const siteA1Id = siteA1Data.site.id;

    const siteA2Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Flyover Project', location: 'Uptown' }),
    });
    const siteA2Data = await siteA2Res.json();
    assert(siteA2Res.status === 201, 'Contractor A creates Site A2 (201 Created)');
    const siteA2Id = siteA2Data.site.id;

    // 4. Contractor B creates Site B1
    const siteB1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Residential Tower', location: 'Eastside' }),
    });
    const siteB1Data = await siteB1Res.json();
    assert(siteB1Res.status === 201, 'Contractor B creates Site B1 (201 Created)');

    // 5. Test listing only authenticated contractor's sites
    const listARes = await fetch(`${baseUrl}/sites`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const listAData = await listARes.json();
    assert(
      listARes.status === 200 &&
      listAData.sites.length === 2 &&
      listAData.sites.every(s => s.contractor_id === regAData.user.id),
      'Contractor A lists only their own sites (2 sites returned)'
    );

    const listBRes = await fetch(`${baseUrl}/sites`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    const listBData = await listBRes.json();
    assert(
      listBRes.status === 200 &&
      listBData.sites.length === 1 &&
      listBData.sites[0].contractor_id === regBData.user.id,
      'Contractor B lists only their own sites (1 site returned)'
    );

    // 6. Test getting own site
    const getA1Res = await fetch(`${baseUrl}/sites/${siteA1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const getA1Data = await getA1Res.json();
    assert(getA1Res.status === 200 && getA1Data.site.id === siteA1Id, 'Contractor A fetches own Site A1');

    // 7. Test preventing access to another contractor's site
    const getCrossRes = await fetch(`${baseUrl}/sites/${siteA1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(getCrossRes.status === 404, 'Contractor B denied access to Contractor A site on GET (404 Not Found)');

    const putCrossRes = await fetch(`${baseUrl}/sites/${siteA1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Hacked Site Name' }),
    });
    assert(putCrossRes.status === 404, 'Contractor B denied modification of Contractor A site on PUT (404 Not Found)');

    const delCrossRes = await fetch(`${baseUrl}/sites/${siteA1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(delCrossRes.status === 404, 'Contractor B denied deletion of Contractor A site on DELETE (404 Not Found)');

    // 8. Test updating own site
    const updateA1Res = await fetch(`${baseUrl}/sites/${siteA1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Metro Station Phase 2', location: 'Central City' }),
    });
    const updateA1Data = await updateA1Res.json();
    assert(
      updateA1Res.status === 200 &&
      updateA1Data.site.site_name === 'Metro Station Phase 2' &&
      updateA1Data.site.location === 'Central City',
      'Contractor A updates own Site A1'
    );

    // 9. Test deleting own site
    const delA2Res = await fetch(`${baseUrl}/sites/${siteA2Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(delA2Res.status === 200, 'Contractor A deletes own Site A2');

    const verifyDelRes = await fetch(`${baseUrl}/sites/${siteA2Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(verifyDelRes.status === 404, 'Deleted Site A2 is no longer accessible');

    console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await pool.end();
  }
}

runTests();
