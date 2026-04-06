import { Router } from 'express';
import {
  addComment,
  assignUsers,
  createDocument,
  createAnnotation,
  deleteAnnotation,
  downloadDocumentVersion,
  previewDocumentVersion,
  getAuditTrail,
  getDocumentById,
  getDocumentStats,
  getStatusPolicy,
  getActivityFeed,
  listDocuments,
  listAnnotations,
  resubmitDocument,
  dispatchReview,
  updateDocumentStatus,
  updateAnnotation
} from '../controllers/document.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireDocumentAccess, requireDocumentManager, requireWorkflowAccess } from '../middleware/documentAccess.middleware.js';
import { uploadSingleDocument } from '../middleware/upload.middleware.js';

const router = Router();
router.use(requireAuth);
router.get('/status-policy', getStatusPolicy);
router.get('/activity', getActivityFeed);
router.get('/stats', getDocumentStats);
router.get('/', listDocuments);
router.post('/', uploadSingleDocument, createDocument);
router.get('/:id', requireDocumentAccess, getDocumentById);
router.get('/:id/annotations', requireDocumentAccess, listAnnotations);
router.post('/:id/annotations', requireDocumentManager, createAnnotation);
router.patch('/:id/annotations/:annotationId', requireDocumentAccess, updateAnnotation);
router.delete('/:id/annotations/:annotationId', requireDocumentAccess, deleteAnnotation);
router.get('/:id/audit', requireDocumentAccess, getAuditTrail);
router.patch('/:id/status', requireWorkflowAccess, updateDocumentStatus);
router.post('/:id/comments', requireWorkflowAccess, addComment);
router.post('/:id/assign', requireDocumentManager, assignUsers);
router.post('/:id/resubmit', requireDocumentAccess, uploadSingleDocument, resubmitDocument);
router.post('/:id/dispatch-review', requireDocumentManager, dispatchReview);
router.get('/:id/download/:versionId', requireDocumentAccess, downloadDocumentVersion);
router.get('/:id/preview/:versionId', requireDocumentAccess, previewDocumentVersion);

export default router;
