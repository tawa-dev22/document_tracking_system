import Document from '../models/Document.js';
import { ApiError } from '../utils/ApiError.js';
import { canAccessDocument, canUpdateWorkflow, isDocumentManager } from '../utils/permissions.js';

export async function requireDocumentAccess(req, _res, next) {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new ApiError(404, 'Document not found'));
  if (!canAccessDocument(req.user, document)) return next(new ApiError(403, 'Access denied'));
  req.document = document;
  next();
}

export async function requireWorkflowAccess(req, _res, next) {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new ApiError(404, 'Document not found'));
  if (!canUpdateWorkflow(req.user, document)) return next(new ApiError(403, 'Workflow access denied'));
  req.document = document;
  next();
}

export async function requireDocumentManager(req, _res, next) {
  const document = await Document.findById(req.params.id);
  if (!document) return next(new ApiError(404, 'Document not found'));
  if (!isDocumentManager(req.user, document)) return next(new ApiError(403, 'Document management access denied'));
  req.document = document;
  next();
}
