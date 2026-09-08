import 'dotenv/config';
import pool from '../src/config/db.js';

async function runTests() {
  console.log('--- Starting Payment Backend Integration Tests ---');
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
  const contractorAEmail = `contractor_pay_a_${timestamp}@example.com`;
  const contractorBEmail = `contractor_pay_b_${timestamp}@example.com`;
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

    // Setup: Contractor A creates Site S1 and Worker W1 (Wage: 800.00)
    const siteA1Res = await fetch(`${baseUrl}/sites`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_name: 'Site S1', location: 'Location A' }),
    });
    const siteA1Data = await siteA1Res.json();
    const site1Id = siteA1Data.site.id;

    const workerA1Res = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Worker A1', role: 'Mason', daily_wage: 800.00 }),
    });
    const workerA1Data = await workerA1Res.json();
    const worker1Id = workerA1Data.worker.id;

    // Assign Worker W1 to Site S1
    await fetch(`${baseUrl}/workers/${worker1Id}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: site1Id }),
    });

    // Mark Dinesh PRESENT on 2026-08-31
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-31', status: 'PRESENT' }),
    });
    // Mark Dinesh HALF_DAY on 2026-08-30
    await fetch(`${baseUrl}/attendance`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, site_id: site1Id, date: '2026-08-30', status: 'HALF_DAY' }),
    });

    // -------------------------------------------------------------
    // ASSERTION 1: Unauthenticated create payment -> 401
    const unauthCreate = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, amount: 300, payment_date: '2026-08-31' }),
    });
    assert(unauthCreate.status === 401, '1. Unauthenticated create payment returns 401');

    // ASSERTION 2: Unauthenticated payment history -> 401
    const unauthHistory = await fetch(`${baseUrl}/payments`);
    assert(unauthHistory.status === 401, '2. Unauthenticated payment history returns 401');

    // ASSERTION 3: Create valid payment -> 201
    const validCreateRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, amount: 300, payment_date: '2026-08-31' }),
    });
    const validCreateData = await validCreateRes.json();
    assert(
      validCreateRes.status === 201 &&
      validCreateData.status === 'success' &&
      validCreateData.payment.amount === 300 &&
      validCreateData.payment.payment_date === '2026-08-31',
      '3. Create valid payment returns 201 & payment instance'
    );
    const paymentA1Id = validCreateData.payment.id;

    // ASSERTION 4: Reject missing worker_id -> 400
    const errMissingWorker = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 300, payment_date: '2026-08-31' }),
    });
    assert(errMissingWorker.status === 400, '4. Reject missing worker_id with 400');

    // ASSERTION 5: Reject missing amount -> 400
    const errMissingAmount = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, payment_date: '2026-08-31' }),
    });
    assert(errMissingAmount.status === 400, '5. Reject missing amount with 400');

    // ASSERTION 6: Reject zero amount -> 400
    const errZeroAmount = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, amount: 0, payment_date: '2026-08-31' }),
    });
    assert(errZeroAmount.status === 400, '6. Reject zero amount with 400');

    // ASSERTION 7: Reject negative amount -> 400
    const errNegAmount = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, amount: -50, payment_date: '2026-08-31' }),
    });
    assert(errNegAmount.status === 400, '7. Reject negative amount with 400');

    // ASSERTION 8: Reject invalid payment date -> 400
    const errDate = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, amount: 300, payment_date: 'invalid-date' }),
    });
    assert(errDate.status === 400, '8. Reject invalid payment date with 400');

    // ASSERTION 9: Contractor A can create payment for own worker (Already verified in #3)
    assert(paymentA1Id !== undefined, '9. Contractor can create payment for owned worker');

    // ASSERTION 10: Contractor can retrieve payment history
    const historyRes = await fetch(`${baseUrl}/payments`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const historyData = await historyRes.json();
    assert(
      historyRes.status === 200 &&
      historyData.payments.length >= 1 &&
      historyData.payments[0].worker_name === 'Worker A1',
      '10. Contractor can retrieve payment history containing worker display properties'
    );

    // ASSERTION 11: Contractor can retrieve worker payment history
    const workerHistoryRes = await fetch(`${baseUrl}/payments/worker/${worker1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const workerHistoryData = await workerHistoryRes.json();
    assert(
      workerHistoryRes.status === 200 &&
      workerHistoryData.payments.length >= 1,
      '11. Contractor can retrieve worker-specific payment history'
    );

    // ASSERTION 12: Contractor can retrieve own payment by ID
    const payGetRes = await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const payGetData = await payGetRes.json();
    assert(
      payGetRes.status === 200 &&
      payGetData.payment.id === paymentA1Id,
      '12. Contractor A can fetch own payment record by ID'
    );

    // ASSERTION 13: Contractor can update own payment
    const updateRes = await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500, payment_date: '2026-08-31' }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 &&
      updateData.payment.amount === 500,
      '13. Contractor can update own payment details'
    );

    // ASSERTION 14: Contractor can delete own payment (Tested later, after verifying dues persistence)
    // We preserve the payment for now to verify wage calculations affectations, then delete it.

    // ASSERTION 15: Contractor B cannot create payment for Contractor A worker -> 404 Consistently
    const crossCreateRes = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: worker1Id, amount: 200, payment_date: '2026-08-31' }),
    });
    assert(crossCreateRes.status === 404, '15. Contractor B denied creating payment for Contractor A worker (404)');

    // ASSERTION 16: Contractor B cannot read Contractor A payment -> 404
    const crossReadRes = await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossReadRes.status === 404, '16. Contractor B denied reading Contractor A payment (404)');

    // ASSERTION 17: Contractor B cannot update Contractor A payment -> 404
    const crossUpdateRes = await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 600, payment_date: '2026-08-31' }),
    });
    assert(crossUpdateRes.status === 404, '17. Contractor B denied updating Contractor A payment (404)');

    // ASSERTION 18: Contractor B cannot delete Contractor A payment -> 404
    const crossDeleteRes = await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    assert(crossDeleteRes.status === 404, '18. Contractor B denied deleting Contractor A payment (404)');

    // ASSERTION 19: Verify payment persistence in PostgreSQL
    const pgCheck = await pool.query('SELECT amount FROM payments WHERE id = $1', [paymentA1Id]);
    assert(
      pgCheck.rows.length === 1 &&
      parseFloat(pgCheck.rows[0].amount) === 500.00,
      '19. Verified payment records successfully persist inside PostgreSQL'
    );

    // ASSERTION 20: Verify wage/pending-dues calculation remains correct after payment is recorded
    // Currently, Dinesh has total earnings = 1200 (PRESENT 800 + HALF_DAY 400), and payment is 500.
    const wageRes1 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-30&end_date=2026-08-31`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const wageData1 = await wageRes1.json();
    assert(
      wageRes1.status === 200 &&
      wageData1.summary.payments_made === 500.00 &&
      wageData1.summary.pending_dues === 700.00,
      '20. Dynamic wages calculation correctly incorporates payment sum and tracks dues (700.00)'
    );

    // ASSERTION 21: Verify updating a payment changes the amount used by wage pending-dues calculation
    await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 900, payment_date: '2026-08-31' }),
    });
    const wageRes2 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-30&end_date=2026-08-31`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const wageData2 = await wageRes2.json();
    assert(
      wageData2.summary.payments_made === 900.00 &&
      wageData2.summary.pending_dues === 300.00,
      '21. Updating payment amount propagates to wages summary pending dues (300.00)'
    );

    // ASSERTION 14 (DEFERRED): Contractor can delete own payment
    const deleteRes = await fetch(`${baseUrl}/payments/${paymentA1Id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    assert(deleteRes.status === 200, '14. Contractor can delete own payment');

    // ASSERTION 22: Verify deleting a payment restores the corresponding pending-dues calculation
    const wageRes3 = await fetch(`${baseUrl}/wages/worker/${worker1Id}?start_date=2026-08-30&end_date=2026-08-31`, {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const wageData3 = await wageRes3.json();
    assert(
      wageData3.summary.payments_made === 0.00 &&
      wageData3.summary.pending_dues === 1200.00,
      '22. Deleting payment restores original pending dues (1200.00)'
    );

    console.log(`\n--- Payment Test Summary ---`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Integration tests crash:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
