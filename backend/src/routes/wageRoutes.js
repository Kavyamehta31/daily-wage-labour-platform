import express from 'express';
import { getWorkerWageSummary, getContractorWagesSummary } from '../controllers/wageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply authorization mechanisms
router.use(authenticateToken);
router.use(authorize('CONTRACTOR', 'ADMIN'));

router.get('/summary', getContractorWagesSummary);
router.get('/worker/:workerId', getWorkerWageSummary);

export default router;
