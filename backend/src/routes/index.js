import { Router } from 'express';
import authRoutes from './auth.routes.js';
import documentRoutes from './document.routes.js';
import notificationRoutes from './notification.routes.js';
import departmentRoutes from './department.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/departments', departmentRoutes);
router.use('/admin', adminRoutes);

export default router;
