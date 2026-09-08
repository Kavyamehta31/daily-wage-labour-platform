import express from 'express';
import {
  exportAttendanceCsv,
  exportWagesCsv,
  exportPaymentsCsv,
} from '../controllers/exportController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All export routes require authentication and are contractor-isolated by req.user.id
router.use(authenticateToken);

router.get('/attendance', exportAttendanceCsv);
router.get('/wages', exportWagesCsv);
router.get('/payments', exportPaymentsCsv);

export default router;
