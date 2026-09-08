import express from 'express';
import {
  getStats,
  getContractors,
  getContractorById,
  getWorkerById,
  getSiteById
} from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth middleware to all admin routes
router.use(authenticateToken);
router.use(authorize('ADMIN'));

router.get('/dashboard/stats', getStats);
router.get('/contractors', getContractors);
router.get('/contractors/:id', getContractorById);
router.get('/workers/:id', getWorkerById);
router.get('/sites/:id', getSiteById);

export default router;
