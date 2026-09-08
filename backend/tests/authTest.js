import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting Authentication System Integration Tests ---');
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

  const testEmail = `test_contractor_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const port = process.env.PORT || 5000;
  const baseUrl = `http://localhost:${port}/api/auth`;

  try {
    // 1. Test contractor registration
    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Contractor', email: testEmail, password: testPassword }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Contractor Registration returns 201 Created');
    assert(regData.token && regData.user.role === 'CONTRACTOR', 'Registration returns JWT token & CONTRACTOR role');
    assert(!regData.user.password_hash, 'Password hash is NOT exposed in response');

    // 2. Test duplicate email rejection
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Duplicate User', email: testEmail, password: testPassword }),
    });
    assert(dupRes.status === 400, 'Duplicate email registration rejected with HTTP 400');

    // 3. Test login with correct credentials
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login with correct credentials returns 200 OK');
    assert(loginData.token, 'Login returns valid token');
    const contractorToken = loginData.token;

    // 4. Test incorrect password
    const badPassRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' }),
    });
    const badPassData = await badPassRes.json();
    assert(badPassRes.status === 401, 'Login with wrong password returns 401 Unauthorized');
    assert(badPassData.message === 'Invalid email or password.', 'Generic error message returned without revealing account existence');

    // 5. Test protected route with no token
    const noTokenRes = await fetch(`${baseUrl}/me`);
    assert(noTokenRes.status === 401, 'Protected route without token returns 401 Unauthorized');

    // 6. Test protected route with invalid token
    const invalidTokenRes = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': 'Bearer invalid.jwt.token' },
    });
    assert(invalidTokenRes.status === 401, 'Protected route with invalid token returns 401 Unauthorized');

    // 7. Test protected route with valid token
    const validMeRes = await fetch(`${baseUrl}/me`, {
      headers: { 'Authorization': `Bearer ${contractorToken}` },
    });
    const meData = await validMeRes.json();
    assert(validMeRes.status === 200 && meData.user.email === testEmail, 'Protected route /me returns authenticated user details');

    console.log(`\n--- Test Summary: ${passed} Passed, ${failed} Failed ---`);
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    await pool.end();
  }
}

runTests();
