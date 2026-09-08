import express from 'express';
import {
  createWorker,
  getWorkers,
  getWorkerById,
  updateWorker,
  deleteWorker,
  assignWorkerToSite,
  getWorkerAssignedSites,
} from '../controllers/workerController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Protect all worker endpoints with authentication and role authorization
router.use(authenticateToken);
router.use(authorize('CONTRACTOR', 'ADMIN'));

router.post('/', createWorker);
router.get('/', getWorkers);
router.get('/:id', getWorkerById);
router.put('/:id', updateWorker);
router.delete('/:id', deleteWorker);

// Site assignment endpoints
router.post('/:id/assignments', assignWorkerToSite);
router.get('/:id/sites', getWorkerAssignedSites);

export default router;
