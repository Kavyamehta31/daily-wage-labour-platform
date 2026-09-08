import express from 'express';
import {
  createSite,
  getSites,
  getSiteById,
  updateSite,
  deleteSite,
} from '../controllers/siteController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// All site endpoints require authentication and contractor/admin authorization
router.use(authenticateToken);
router.use(authorize('CONTRACTOR', 'ADMIN'));

router.post('/', createSite);
router.get('/', getSites);
router.get('/:id', getSiteById);
router.put('/:id', updateSite);
router.delete('/:id', deleteSite);

export default router;
