import fs from 'fs';
import { z } from 'zod';
import User from '../models/User.js';
import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import Comment from '../models/Comment.js';
import AuditLog from '../models/AuditLog.js';
import Notification from '../models/Notification.js';
import DocumentAnnotation from '../models/DocumentAnnotation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { generateReferenceNumber } from '../utils/reference.js';
import { createAuditLog } from '../services/audit.service.js';
import { createNotification } from '../services/notification.service.js';
import { isDocumentManager, isSender, isCurrentHandler, canManageDocument, canAccessDocument, canAnnotateDocument } from '../utils/permissions.js';
import DocumentReview from '../models/DocumentReview.js';
import { sendDocumentSharedEmail, sendDocumentResubmittedEmail, sendDocumentReviewDispatchedEmail, sendDocumentForwardedEmail } from '../services/email.service.js';
import { resolveEmailsToUsers } from '../services/user.service.js';
import { canTransitionStatus, DOCUMENT_STATUS_TRANSITIONS } from '../utils/policies.js';
import { ensureDepartment, incrementDepartmentCount } from './department.controller.js';

const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createDocumentSchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().min(10).max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  dueDate: z.string().optional(),
  assignedUsers: z.union([z.array(z.string()), z.string()]).optional(),
  recipients: z.union([z.array(z.string()), z.string()]).optional(),
  department: z.string().trim().min(2, 'Department is required').max(100)
});

const statusSchema = z.object({
  status: z.enum(['SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RESUBMITTED']),
  comment: z.string().trim().max(1000).optional()
});

const commentSchema = z.object({
  message: z.string().trim().min(1).max(1500),
  visibility: z.enum(['ALL_INVOLVED', 'INTERNAL']).optional().default('ALL_INVOLVED')
});

const assignSchema = z.object({
  assignedUsers: z.array(z.string()).optional().default([]),
  recipients: z.array(z.string()).optional().default([])
});

const resubmitSchema = z.object({
  notes: z.string().trim().max(1000).optional().default('Resubmitted document')
});

const annotationSchema = z.object({
  versionId: z.string().trim().min(1),
  tool: z.enum(['highlight', 'strikethrough', 'comment', 'signature', 'sticky']),
  text: z.string().trim().max(2000).optional().default(''),
  color: z.enum(['yellow', 'pink', 'orange', 'red', 'green', 'blue', 'purple']).optional().default('yellow'),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100).optional(),
  height: z.number().min(0).max(100).optional()
});

const updateAnnotationSchema = z.object({
  text: z.string().trim().max(2000).optional(),
  color: z.enum(['yellow', 'pink', 'orange', 'red', 'green', 'blue', 'purple']).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  width: z.number().min(0).max(100).optional(),
  height: z.number().min(0).max(100).optional()
});

function normalizeArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => item?.trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildDocumentScopeFilter(user, status, search) {
  const filter = { isArchived: false };

  if (user.role !== 'ADMIN') {
    filter.$or = [
      { sender: user._id },
      { assignedUsers: user._id },
      { recipients: user._id },
      { currentHandler: user._id }
    ];
  }

  if (status) filter.currentStatus = status;
  if (search?.trim()) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { title: { $regex: escapeRegex(search.trim()), $options: 'i' } },
          { referenceNumber: { $regex: escapeRegex(search.trim()), $options: 'i' } },
          { description: { $regex: escapeRegex(search.trim()), $options: 'i' } }
        ]
      }
    ];
  }

  return filter;
}

async function hydrateDocument(documentId) {
  const document = await Document.findById(documentId)
    .populate('sender', 'fullName email department')
    .populate('assignedUsers', 'fullName email department')
    .populate('currentHandler', 'fullName email department')
    .populate('recipients', 'fullName email department')
    .populate('currentVersionId');

  const comments = await Comment.find({ documentId }).populate('author', 'fullName email role').sort({ createdAt: 1 });
  const versions = await DocumentVersion.find({ documentId }).populate('uploadedBy', 'fullName email').sort({ versionNumber: -1 });
  const reviews = await DocumentReview.find({ documentId }).populate('reviewerId', 'fullName email role department').sort({ createdAt: -1 });
  const audit = await AuditLog.find({ documentId }).populate('actor', 'fullName email role').sort({ createdAt: -1 }).limit(25);

  return { document, comments, versions, reviews, audit };
}

export const createDocument = asyncHandler(async (req, res) => {
  const parsed = createDocumentSchema.parse({
    ...req.body,
    assignedUsers: normalizeArray(req.body.assignedUsers),
    recipients: normalizeArray(req.body.recipients)
  });
  if (!req.file) throw new ApiError(400, 'Document file is required');

  const assignedEmails = normalizeArray(parsed.assignedUsers);
  const recipientEmails = normalizeArray(parsed.recipients);
  const allEmails = [...new Set([...assignedEmails, ...recipientEmails])];
  const userMap = await resolveEmailsToUsers(allEmails);

  const assignedUsers = [];
  assignedEmails.forEach(email => {
    const user = userMap.get(email.toLowerCase());
    if (user && String(user._id) !== String(req.user._id)) {
      assignedUsers.push(user._id);
    }
  });

  const recipients = [];
  const externalRecipients = [];
  recipientEmails.forEach(email => {
    const user = userMap.get(email.toLowerCase());
    if (user) {
      if (String(user._id) !== String(req.user._id)) {
        recipients.push(user._id);
      }
    } else {
      externalRecipients.push(email.trim());
    }
  });

  const document = await Document.create({
    title: parsed.title,
    description: parsed.description,
    referenceNumber: generateReferenceNumber(),
    sender: req.user._id,
    priority: parsed.priority,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
    assignedUsers,
    recipients,
    externalRecipients,
    department: parsed.department,
    submittedAt: new Date(),
    currentHandler: recipients[0] || null
  });

  await ensureDepartment(parsed.department);
  await incrementDepartmentCount(parsed.department);

  const version = await DocumentVersion.create({
    documentId: document._id,
    versionNumber: 1,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    storagePath: req.file.path,
    uploadedBy: req.user._id,
    notes: 'Initial submission'
  });

  document.currentVersionId = version._id;
  await document.save();

  const senderEmail = req.user.email.toLowerCase();
  const allOtherEmails = allEmails.filter(e => e.toLowerCase() !== senderEmail);

  await createAuditLog({
    documentId: document._id,
    actor: req.user._id,
    action: 'DOCUMENT_CREATED',
    newValue: { status: document.currentStatus },
    req,
    metadata: { referenceNumber: document.referenceNumber }
  });

  const notifyIds = [...new Set([...assignedUsers, ...recipients])];
  if (notifyIds.length) {
    await createNotification(req.io, {
      userIds: notifyIds,
      documentId: document._id,
      type: 'DOCUMENT_RECEIVED',
      title: 'Document received',
      message: `${req.user.fullName} shared ${document.title} with you. You now have document-management privileges on this document.`
    });
  }

  // Chain of custody logging for tracing
  for (const email of allOtherEmails) {
    const user = userMap.get(email.toLowerCase());
    await createAuditLog({
      documentId: document._id,
      actor: req.user._id,
      action: 'DOCUMENT_SHARED_ACCESS',
      newValue: { targetEmail: email, targetName: user?.fullName || 'External Recipient', isRegistered: !!user },
      req
    });
  }

  if (allOtherEmails.length > 0) {
    for (const email of allOtherEmails) {
      const user = userMap.get(email.toLowerCase());
      await sendDocumentSharedEmail({ 
        to: email, 
        documentTitle: document.title, 
        senderName: req.user.fullName,
        isRegistered: !!user,
        documentId: document._id
      });
    }
  }

  res.status(201).json({ success: true, message: 'Document submitted successfully', data: document });
});

export const listDocuments = asyncHandler(async (req, res) => {
  const { status, search = '', page: pageRaw, limit: limitRaw } = req.query;
  const page = Math.max(1, Number.parseInt(String(pageRaw), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(limitRaw), 10) || 50));
  const filter = buildDocumentScopeFilter(req.user, status, search);

  const [total, documents] = await Promise.all([
    Document.countDocuments(filter),
    Document.find(filter)
      .populate('sender', 'fullName email department')
      .populate('assignedUsers', 'fullName email department')
      .populate('recipients', 'fullName email department')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
  ]);

  res.json({
    success: true,
    data: documents,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit))
    },
    statusPolicy: DOCUMENT_STATUS_TRANSITIONS
  });
});

export const getDocumentStats = asyncHandler(async (req, res) => {
  const filter = buildDocumentScopeFilter(req.user, undefined, undefined);
  const grouped = await Document.aggregate([
    { $match: filter },
    { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
  ]);
  const byStatus = Object.fromEntries(grouped.map((g) => [g._id, g.count]));
  const total = grouped.reduce((s, g) => s + g.count, 0);

  res.json({
    success: true,
    data: {
      total,
      byStatus,
      inProgress: byStatus.IN_PROGRESS || 0,
      approved: byStatus.APPROVED || 0,
      rejected: byStatus.REJECTED || 0
    }
  });
});

export const getDocumentById = asyncHandler(async (req, res) => {
  const { document, comments, versions, reviews, audit } = await hydrateDocument(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found');

  res.json({
    success: true,
    data: {
      document,
      comments,
      versions,
      reviews,
      audit,
      permissions: {
        isSender: isSender(req.user, document),
        isCurrentHandler: isCurrentHandler(req.user, document),
        canManageDocument: canManageDocument(req.user, document),
        canResubmit: isSender(req.user, document)
      }
    }
  });
});

export const updateDocumentStatus = asyncHandler(async (req, res) => {
  const { status, comment } = statusSchema.parse(req.body);
  const document = req.document;

  if (!canManageDocument(req.user, document)) {
    throw new ApiError(403, 'Document state transitions are restricted to the primary handler or registry recipients.');
  }

  const previousStatus = document.currentStatus;

  if (previousStatus === status) {
    throw new ApiError(400, 'Document is already in that status');
  }

  if (!canTransitionStatus(previousStatus, status)) {
    throw new ApiError(400, `Invalid transition from ${previousStatus} to ${status}`);
  }

  document.currentStatus = status;
  document.lastActionAt = new Date();
  await document.save();

  // Create an independent review record for this manager
  const review = await DocumentReview.create({
    documentId: document._id,
    reviewerId: req.user._id,
    status: status,
    comment: comment || ''
  });

  // Time Tracking Logic
  const now = new Date();
  
  // 1. Handle In-Progress Start
  if (status === 'IN_PROGRESS' && !document.inProgressStartedAt) {
    document.inProgressStartedAt = now;
  }

  // 2. Handle Finalization (Stop timers)
  if (['APPROVED', 'REJECTED'].includes(status)) {
    document.finalizedAt = now;
    
    // Calculate total duration
    const submissionDate = document.submittedAt || document.createdAt;
    document.totalProcessingTime = now.getTime() - submissionDate.getTime();

    // Calculate In-Progress duration if it was ever started
    if (document.inProgressStartedAt) {
      document.inProgressEndedAt = now;
      document.inProgressDuration = now.getTime() - document.inProgressStartedAt.getTime();
    }
  }

  await document.save();

  if (comment) {
    await Comment.create({
      documentId: document._id,
      author: req.user._id,
      message: comment,
      visibility: 'ALL_INVOLVED'
    });
  }

  await createAuditLog({
    documentId: document._id,
    actor: req.user._id,
    action: 'STATUS_CHANGED',
    previousValue: { status: previousStatus },
    newValue: { status },
    req
  });

  const notifyUsers = [document.sender, ...document.assignedUsers, ...document.recipients].map(String);
  await createNotification(req.io, {
    userIds: notifyUsers,
    documentId: document._id,
    type: 'DOCUMENT_STATUS_UPDATED',
    title: 'Document status updated',
    message: `${document.title} moved from ${previousStatus.replaceAll('_', ' ')} to ${status.replaceAll('_', ' ')}.`
  });

  req.io.to(`document:${document._id.toString()}`).emit('document:statusChanged', {
    documentId: document._id,
    status,
    previousStatus
  });

  res.json({ success: true, message: 'Document status updated successfully', data: { documentId: document._id, previousStatus, currentStatus: status } });
});

export const addComment = asyncHandler(async (req, res) => {
  const data = commentSchema.parse(req.body);
  const document = req.document;

  if (!canManageDocument(req.user, document)) {
    throw new ApiError(403, 'Contribution to the document narrative is restricted to active handlers or registry recipients.');
  }

  const comment = await Comment.create({
    documentId: req.document._id,
    author: req.user._id,
    message: data.message,
    visibility: data.visibility
  });
  const populated = await comment.populate('author', 'fullName email role');

  await createAuditLog({ documentId: req.document._id, actor: req.user._id, action: 'COMMENT_ADDED', newValue: { message: data.message }, req });

  const notifyUsers = [req.document.sender, ...req.document.assignedUsers, ...req.document.recipients].map(String);
  await createNotification(req.io, {
    userIds: notifyUsers,
    documentId: req.document._id,
    type: 'DOCUMENT_COMMENT_ADDED',
    title: 'New document comment',
    message: `${req.user.fullName} added a comment on ${req.document.title}.`
  });

  req.io.to(`document:${req.document._id.toString()}`).emit('document:commentAdded', populated);

  res.status(201).json({ success: true, message: 'Comment added successfully', data: populated });
});

export const assignUsers = asyncHandler(async (req, res) => {
  const data = assignSchema.parse(req.body);
  const document = req.document;

  const assignedEmails = normalizeArray(data.assignedUsers);
  const recipientEmails = normalizeArray(data.recipients);
  const allNewEmails = [...new Set([...assignedEmails, ...recipientEmails])];
  const userMap = await resolveEmailsToUsers(allNewEmails);

  const senderId = String(document.sender._id || document.sender);
  const newAssignedIds = [];
  assignedEmails.forEach(email => {
    const user = userMap.get(email.toLowerCase());
    if (user && String(user._id) !== senderId) {
       newAssignedIds.push(String(user._id));
    }
  });

  const newRecipientIds = [];
  const newExternalEmails = [];
  recipientEmails.forEach(email => {
    const user = userMap.get(email.toLowerCase());
    if (user) {
      if (String(user._id) !== senderId) {
        newRecipientIds.push(String(user._id));
      }
    } else {
      newExternalEmails.push(email.trim());
    }
  });

  const assignedUsers = [...new Set([...document.assignedUsers.map(String), ...newAssignedIds])];
  const recipients = [...new Set([...document.recipients.map(String), ...newRecipientIds])];
  const externalRecipients = [...new Set([...(document.externalRecipients || []), ...newExternalEmails])];

  document.assignedUsers = assignedUsers;
  document.recipients = recipients;
  document.externalRecipients = externalRecipients;

  // Transition the current handler if new Registry Recipients are assigned
  if (newRecipientIds.length > 0) {
    document.currentHandler = newRecipientIds[0];
  }

  await document.save();

  const newRecipientDetails = [];
  const allNewIds = [...newAssignedIds, ...newRecipientIds];

  for (const userId of allNewIds) {
    const user = await User.findById(userId).select('fullName email');
    if (user) {
       newRecipientDetails.push({ fullName: user.fullName, email: user.email });
    }
  }

  await createAuditLog({
    documentId: document._id,
    actor: req.user._id,
    action: 'DOCUMENT_FORWARDED',
    newValue: { recipients: newRecipientDetails },
    req,
    metadata: { forwardTimestamp: new Date() }
  });

  const notifyIds = [...new Set([...newAssignedIds, ...newRecipientIds])];
  if (notifyIds.length) {
    await createNotification(req.io, {
      userIds: notifyIds,
      documentId: document._id,
      type: 'DOCUMENT_RECEIVED',
      title: 'Document access granted',
      message: `You have been added to ${document.title} and can manage it like the PemSec for this document.`
    });

    // Also notify the original sender about the forwarding
    if (String(document.sender) !== String(req.user._id)) {
      await createNotification(req.io, {
        userIds: [String(document.sender)],
        documentId: document._id,
        type: 'DOCUMENT_FORWARDED',
        title: 'Document forwarded',
        message: `Your document "${document.title}" has been forwarded to new reviewers for assessment.`
      });
    }
  }

  const senderEmail = req.user.email.toLowerCase();
  const allNewOtherEmails = allNewEmails.filter(e => e.toLowerCase() !== senderEmail);

  // Tracing logs for new additions
  for (const email of allNewOtherEmails) {
    const user = userMap.get(email.toLowerCase());
    await createAuditLog({
      documentId: document._id,
      actor: req.user._id,
      action: 'DOCUMENT_SHARED_ACCESS',
      newValue: { targetEmail: email, targetName: user?.fullName || 'External Recipient', isRegistered: !!user },
      req
    });
  }

  // Notify new recipients via email
  if (allNewOtherEmails.length > 0) {
    for (const email of allNewOtherEmails) {
      const user = userMap.get(email.toLowerCase());
      await sendDocumentSharedEmail({ 
        to: email, 
        documentTitle: document.title, 
        senderName: req.user.fullName,
        isRegistered: !!user,
        documentId: document._id
      });
    }
  }

  // Notify original sender via email about forwarding (if not the one forwarding)
  const populatedSender = await User.findById(document.sender).select('email fullName');
  if (populatedSender && populatedSender.email.toLowerCase() !== senderEmail) {
    await sendDocumentForwardedEmail({
      to: populatedSender.email,
      documentTitle: document.title,
      forwardedByName: req.user.fullName,
      recipientNames: newRecipientDetails.map(r => r.fullName).join(', '),
      documentId: document._id
    });
  }

  res.json({ success: true, message: 'Document access updated successfully', data: document });
});

export const resubmitDocument = asyncHandler(async (req, res) => {
  const { notes } = resubmitSchema.parse(req.body);
  if (!req.file) throw new ApiError(400, 'Document file is required');

  const document = req.document;
  const canResubmit = isSender(req.user, document);
  if (!canResubmit) {
    throw new ApiError(403, 'Only the original document owner (sender) can upload new versions.');
  }
  const latestVersion = await DocumentVersion.findOne({ documentId: document._id }).sort({ versionNumber: -1 });
  const version = await DocumentVersion.create({
    documentId: document._id,
    versionNumber: (latestVersion?.versionNumber || 0) + 1,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    storagePath: req.file.path,
    uploadedBy: req.user._id,
    notes
  });

  const previousStatus = document.currentStatus;
  document.currentVersionId = version._id;
  document.currentStatus = 'RESUBMITTED';
  document.lastActionAt = new Date();
  await document.save();

  await createAuditLog({
    documentId: document._id,
    actor: req.user._id,
    action: 'DOCUMENT_RESUBMITTED',
    previousValue: { status: previousStatus },
    newValue: { status: 'RESUBMITTED', versionNumber: version.versionNumber },
    req
  });

  const notifyUsers = [document.sender, ...document.assignedUsers, ...document.recipients].map(String);
  await createNotification(req.io, {
    userIds: notifyUsers,
    documentId: document._id,
    type: 'DOCUMENT_RESUBMITTED',
    title: 'Document resubmitted',
    message: `${req.user.fullName} uploaded a new version of ${document.title}.`
  });

  // Also send emails to all stakeholders
  const populatedDoc = await Document.findById(document._id).populate('sender assignedUsers recipients', 'email');
  const emailsToNotify = [
    populatedDoc.sender?.email,
    ...populatedDoc.assignedUsers.map(u => u.email),
    ...populatedDoc.recipients.map(u => u.email),
    ...(populatedDoc.externalRecipients || [])
  ].filter(Boolean);

  const uniqueEmails = [...new Set(emailsToNotify)];
  const currentUserEmail = req.user.email.toLowerCase();

  for (const email of uniqueEmails) {
    if (email.toLowerCase() !== currentUserEmail) {
      await sendDocumentResubmittedEmail({
        to: email,
        documentTitle: document.title,
        senderName: req.user.fullName,
        versionNumber: version.versionNumber,
        notes,
        documentId: document._id
      });
    }
  }

  res.json({ success: true, message: 'Document resubmitted successfully', data: version });
});

export const dispatchReview = asyncHandler(async (req, res) => {
  const { notes } = z.object({ notes: z.string().trim().max(1000).optional().default('Reviewed document') }).parse(req.body);
  const document = req.document;

  await createAuditLog({
    documentId: document._id,
    actor: req.user._id,
    action: 'DOCUMENT_REVIEWED',
    newValue: { notes },
    req
  });

  const notifyUsers = [document.sender, ...document.assignedUsers, ...document.recipients].map(String);
  await createNotification(req.io, {
    userIds: notifyUsers,
    documentId: document._id,
    type: 'DOCUMENT_REVIEWED',
    title: 'Document review completed',
    message: `${req.user.fullName} completed reviewing ${document.title}.`
  });

  const populatedDoc = await Document.findById(document._id).populate('sender assignedUsers recipients', 'email');
  const emailsToNotify = [
    populatedDoc.sender?.email,
    ...populatedDoc.assignedUsers.map(u => u.email),
    ...populatedDoc.recipients.map(u => u.email),
    ...(populatedDoc.externalRecipients || [])
  ].filter(Boolean);

  const uniqueEmails = [...new Set(emailsToNotify)];
  const currentUserEmail = req.user.email.toLowerCase();

  for (const email of uniqueEmails) {
    if (email.toLowerCase() !== currentUserEmail) {
      await sendDocumentReviewDispatchedEmail({
        to: email,
        documentTitle: document.title,
        senderName: req.user.fullName,
        notes,
        documentId: document._id
      });
    }
  }

  res.json({ success: true, message: 'Review dispatched successfully' });
});

export const downloadDocumentVersion = asyncHandler(async (req, res) => {
  const version = await DocumentVersion.findOne({ _id: req.params.versionId, documentId: req.params.id });
  if (!version) throw new ApiError(404, 'Document version not found');
  if (!fs.existsSync(version.storagePath)) throw new ApiError(404, 'Stored document file not found');

  await createAuditLog({ documentId: req.params.id, actor: req.user._id, action: 'DOCUMENT_DOWNLOADED', newValue: { versionId: version._id }, req });
  res.download(version.storagePath, version.originalName);
});

export const previewDocumentVersion = asyncHandler(async (req, res) => {
  const version = await DocumentVersion.findOne({ _id: req.params.versionId, documentId: req.params.id });
  if (!version) throw new ApiError(404, 'Document version not found');
  if (!fs.existsSync(version.storagePath)) throw new ApiError(404, 'Stored document file not found');

  await createAuditLog({
    documentId: req.params.id,
    actor: req.user._id,
    action: 'DOCUMENT_PREVIEWED',
    newValue: { versionId: version._id },
    req
  });

  const encodedName = encodeURIComponent(version.originalName);
  res.setHeader('Content-Type', version.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedName}`);
  res.sendFile(version.storagePath, { headers: { 'Cache-Control': 'private, max-age=60' } });
});

export const getAuditTrail = asyncHandler(async (req, res) => {
  const audit = await AuditLog.find({ documentId: req.params.id }).populate('actor', 'fullName email role').sort({ createdAt: -1 });
  res.json({ success: true, data: audit });
});

export const getStatusPolicy = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: DOCUMENT_STATUS_TRANSITIONS });
});

export const listAnnotations = asyncHandler(async (req, res) => {
  const versionId = String(req.query.versionId || '');
  if (!versionId) throw new ApiError(400, 'versionId is required');

  const version = await DocumentVersion.findOne({ _id: versionId, documentId: req.params.id }).select('_id');
  if (!version) throw new ApiError(404, 'Document version not found');

  const annotations = await DocumentAnnotation.find({
    documentId: req.params.id,
    versionId
  })
    .populate('createdBy', 'fullName email role')
    .sort({ createdAt: 1 });

  res.json({ success: true, data: annotations });
});

export const createAnnotation = asyncHandler(async (req, res) => {
  const payload = annotationSchema.parse(req.body);
  const document = await Document.findById(req.params.id);
  if (!document) throw new ApiError(404, 'Document not found');

  if (!canAnnotateDocument(req.user, document)) {
    throw new ApiError(403, 'A handler or a registered recipient of this document is required to add annotations.');
  }

  const version = await DocumentVersion.findOne({ _id: payload.versionId, documentId: req.params.id }).select('_id');
  if (!version) throw new ApiError(404, 'Document version not found');

  if (payload.tool === 'sticky') {
    const existingSticky = await DocumentAnnotation.findOne({
      documentId: req.params.id,
      createdBy: req.user._id,
      tool: 'sticky'
    }).select('_id');
    if (existingSticky) {
      throw new ApiError(409, 'You already have an active sticky note on this document');
    }
  }

  const annotation = await DocumentAnnotation.create({
    documentId: req.params.id,
    versionId: payload.versionId,
    tool: payload.tool,
    text: payload.text,
    color: payload.color,
    x: payload.x,
    y: payload.y,
    width: payload.width,
    height: payload.height,
    createdBy: req.user._id
  });

  const populated = await annotation.populate('createdBy', 'fullName email role');

  req.io.to(`document:${req.params.id}`).emit('document:annotationAdded', populated);

  res.status(201).json({ success: true, data: populated });
});

export const deleteAnnotation = asyncHandler(async (req, res) => {
  const annotation = await DocumentAnnotation.findOne({ _id: req.params.annotationId, documentId: req.params.id });
  if (!annotation) throw new ApiError(404, 'Annotation not found');

  const document = await Document.findById(req.params.id).select('currentHandler sender');
  const isOwner = String(annotation.createdBy) === String(req.user._id);
  const isElevated = canAnnotateDocument(req.user, document);

  const canDelete = isOwner || isElevated;
  if (!canDelete) throw new ApiError(403, 'You do not have permission to remove this assessment');

  await annotation.deleteOne();
  req.io.to(`document:${req.params.id}`).emit('document:annotationDeleted', {
    annotationId: req.params.annotationId,
    versionId: String(annotation.versionId)
  });

  res.json({ success: true, message: 'Annotation removed' });
});

export const updateAnnotation = asyncHandler(async (req, res) => {
  const payload = updateAnnotationSchema.parse(req.body);
  const annotation = await DocumentAnnotation.findOne({
    _id: req.params.annotationId,
    documentId: req.params.id
  });
  
  if (!annotation) throw new ApiError(404, 'Annotation not found');

  const document = await Document.findById(req.params.id).select('currentHandler sender');
  const isOwner = String(annotation.createdBy) === String(req.user._id);
  const isElevated = canAnnotateDocument(req.user, document);

  const canEdit = isOwner || isElevated;
  if (!canEdit) throw new ApiError(403, 'You do not have permission to update this assessment');

  if (payload.text !== undefined) annotation.text = payload.text;
  if (payload.color !== undefined) annotation.color = payload.color;
  if (payload.x !== undefined) annotation.x = payload.x;
  if (payload.y !== undefined) annotation.y = payload.y;
  if (payload.width !== undefined) annotation.width = payload.width;
  if (payload.height !== undefined) annotation.height = payload.height;

  await annotation.save();
  const populated = await annotation.populate('createdBy', 'fullName email role');
  
  req.io.to(`document:${req.params.id}`).emit('document:annotationUpdated', populated);
  res.json({ success: true, data: populated });
});

export const getActivityFeed = asyncHandler(async (req, res) => {
  const scopeFilter = buildDocumentScopeFilter(req.user, undefined, undefined);
  const userDocs = await Document.find(scopeFilter).select('_id').lean();
  const docIds = userDocs.map((d) => d._id);

  if (docIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const feed = await AuditLog.find({ documentId: { $in: docIds } })
    .populate('actor', 'fullName email role')
    .populate('documentId', 'title referenceNumber')
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({ success: true, data: feed });
});
