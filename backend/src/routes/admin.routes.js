import { Router } from 'express';
import {
  getDashboardStats,
  getUsers,
  updateUser,
  getDocuments,
  getAuditLogs,
  getCommunicationRecord
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Global Admin Middleware
router.use(requireAuth);
router.use(requireAdmin);

// Dashboard Statistics
router.get('/stats', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.put('/users/:userId', updateUser);

// Document Management
router.get('/documents', getDocuments);

// System Audit Logs
router.get('/logs', getAuditLogs);

// Controlled Communication Audit
router.get('/audit/communication/:documentId', getCommunicationRecord);

export default router;
