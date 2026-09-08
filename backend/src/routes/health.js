import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.get('/health', async (req, res) => {
  let dbStatus = 'DISCONNECTED';
  let dbDetails = null;

  try {
    const dbResult = await pool.query('SELECT 1 as health_check');
    if (dbResult.rows && dbResult.rows.length > 0) {
      dbStatus = 'CONNECTED';
    }
  } catch (error) {
    dbStatus = 'DISCONNECTED';
    dbDetails = error.message;
  }

  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      api: 'ONLINE',
      database: dbStatus,
      ...(dbDetails && { databaseError: dbDetails })
    }
  });
});

export default router;
