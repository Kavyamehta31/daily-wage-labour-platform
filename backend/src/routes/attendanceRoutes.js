import express from 'express';
import {
  markAttendance,
  getAttendance,
  getWorkerAttendanceHistory,
  getSiteAttendance,
  getAttendanceById,
  deleteAttendance,
} from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Protect all attendance routes with JWT authentication and role authorization
router.use(authenticateToken);
router.use(authorize('CONTRACTOR', 'ADMIN'));

router.post('/', markAttendance);
router.get('/', getAttendance);
router.get('/worker/:workerId', getWorkerAttendanceHistory);
router.get('/site/:siteId', getSiteAttendance);
router.get('/:id', getAttendanceById);
router.delete('/:id', deleteAttendance);

export default router;
