import { Router } from 'express';
import {
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications
} from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/', listNotifications);
router.get('/summary', getNotificationSummary);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);
router.delete('/', deleteAllNotifications);

export default router;
