import pool from '../config/db.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (str) => {
  return typeof str === 'string' && DATE_REGEX.test(str) && !isNaN(Date.parse(str));
};

export const recordPayment = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const { worker_id, amount, payment_date } = req.body;

    // 1. Validation bounds
    if (worker_id === undefined || amount === undefined || !payment_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: worker_id, amount, payment_date are required.'
      });
    }

    const workerId = parseInt(worker_id, 10);
    if (isNaN(workerId)) {
      return res.status(400).json({
        status: 'error',
        message: 'worker_id must be a valid integer.'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'amount must be numeric and greater than 0.'
      });
    }

    if (!isValidDate(payment_date)) {
      return res.status(400).json({
        status: 'error',
        message: 'payment_date must be a valid date in YYYY-MM-DD format.'
      });
    }

    // 2. Contractor ownership validation
    const workerCheck = await pool.query(
      'SELECT contractor_id FROM workers WHERE id = $1',
      [workerId]
    );

    if (workerCheck.rows.length === 0 || workerCheck.rows[0].contractor_id !== contractorId) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found or unauthorized.'
      });
    }

    // 3. PostgreSQL dynamic insert
    const insertRes = await pool.query(
      `INSERT INTO payments (worker_id, amount, payment_date)
       VALUES ($1, $2::NUMERIC(10, 2), $3)
       RETURNING id, worker_id, amount::FLOAT, payment_date::text, created_at`,
      [workerId, amountNum, payment_date]
    );

    return res.status(201).json({
      status: 'success',
      payment: insertRes.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const contractorId = req.user.id;

    const result = await pool.query(
      `SELECT 
         p.id, 
         p.worker_id, 
         p.amount::FLOAT as amount, 
         p.payment_date::text, 
         p.created_at, 
         w.name as worker_name, 
         w.role as worker_role 
       FROM payments p 
       JOIN workers w ON p.worker_id = w.id 
       WHERE w.contractor_id = $1 
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [contractorId]
    );

    return res.status(200).json({
      status: 'success',
      payments: result.rows
    });

  } catch (error) {
    next(error);
  }
};

export const getWorkerPaymentHistory = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const workerId = parseInt(req.params.workerId, 10);

    if (isNaN(workerId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid worker ID.'
      });
    }

    // Verify worker exists and belongs to the contractor
    const workerCheck = await pool.query(
      'SELECT contractor_id FROM workers WHERE id = $1',
      [workerId]
    );

    if (workerCheck.rows.length === 0 || workerCheck.rows[0].contractor_id !== contractorId) {
      return res.status(404).json({
        status: 'error',
        message: 'Worker not found or unauthorized.'
      });
    }

    const result = await pool.query(
      `SELECT 
         p.id, 
         p.worker_id, 
         p.amount::FLOAT as amount, 
         p.payment_date::text, 
         p.created_at, 
         w.name as worker_name, 
         w.role as worker_role 
       FROM payments p 
       JOIN workers w ON p.worker_id = w.id 
       WHERE p.worker_id = $1 
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [workerId]
    );

    return res.status(200).json({
      status: 'success',
      payments: result.rows
    });

  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const paymentId = parseInt(req.params.id, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment ID.'
      });
    }

    const result = await pool.query(
      `SELECT 
         p.id, 
         p.worker_id, 
         p.amount::FLOAT as amount, 
         p.payment_date::text, 
         p.created_at, 
         w.contractor_id 
       FROM payments p 
       JOIN workers w ON p.worker_id = w.id 
       WHERE p.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0 || result.rows[0].contractor_id !== contractorId) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found or unauthorized.'
      });
    }

    const payment = result.rows[0];
    delete payment.contractor_id; // omit internal config property

    return res.status(200).json({
      status: 'success',
      payment
    });

  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const paymentId = parseInt(req.params.id, 10);
    const { amount, payment_date } = req.body;

    if (isNaN(paymentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment ID.'
      });
    }

    // Verify payment ownership
    const checkRes = await pool.query(
      `SELECT p.id, w.contractor_id 
       FROM payments p 
       JOIN workers w ON p.worker_id = w.id 
       WHERE p.id = $1`,
      [paymentId]
    );

    if (checkRes.rows.length === 0 || checkRes.rows[0].contractor_id !== contractorId) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found or unauthorized.'
      });
    }

    // Validate inputs
    if (amount === undefined || !payment_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: amount, payment_date.'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'amount must be numeric and greater than 0.'
      });
    }

    if (!isValidDate(payment_date)) {
      return res.status(400).json({
        status: 'error',
        message: 'payment_date must be valid format YYYY-MM-DD.'
      });
    }

    // Update payment
    const updateRes = await pool.query(
      `UPDATE payments 
       SET amount = $1::NUMERIC(10, 2), payment_date = $2 
       WHERE id = $3 
       RETURNING id, worker_id, amount::FLOAT, payment_date::text, created_at`,
      [amountNum, payment_date, paymentId]
    );

    return res.status(200).json({
      status: 'success',
      payment: updateRes.rows[0]
    });

  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    const contractorId = req.user.id;
    const paymentId = parseInt(req.params.id, 10);

    if (isNaN(paymentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment ID.'
      });
    }

    // Verify ownership
    const checkRes = await pool.query(
      `SELECT p.id, w.contractor_id 
       FROM payments p 
       JOIN workers w ON p.worker_id = w.id 
       WHERE p.id = $1`,
      [paymentId]
    );

    if (checkRes.rows.length === 0 || checkRes.rows[0].contractor_id !== contractorId) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment not found or unauthorized.'
      });
    }

    // Delete record
    await pool.query('DELETE FROM payments WHERE id = $1', [paymentId]);

    return res.status(200).json({
      status: 'success',
      message: 'Payment successfully deleted.'
    });

  } catch (error) {
    next(error);
  }
};
