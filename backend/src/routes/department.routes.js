import { Router } from 'express';
import { listDepartments, getDepartmentStats } from '../controllers/department.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', requireAuth, listDepartments);
router.get('/stats', requireAuth, getDepartmentStats);

export default router;
