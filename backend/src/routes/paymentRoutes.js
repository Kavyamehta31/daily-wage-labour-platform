import express from 'express';
import {
  recordPayment,
  getPaymentHistory,
  getWorkerPaymentHistory,
  getPaymentById,
  updatePayment,
  deletePayment
} from '../controllers/paymentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authenticateToken);
router.use(authorize('CONTRACTOR', 'ADMIN'));

router.post('/', recordPayment);
router.get('/', getPaymentHistory);
router.get('/worker/:workerId', getWorkerPaymentHistory);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

export default router;
