import User from '../models/User.js';
import Document from '../models/Document.js';
import AuditLog from '../models/AuditLog.js';
import Comment from '../models/Comment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { createAuditLog } from '../services/audit.service.js';
import bcrypt from 'bcryptjs';
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc Get high-level system dashboard statistics
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    userStats,
    documentStats,
    recentActivity
  ] = await Promise.all([
    // User Stats
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$accountStatus', 'ACTIVE'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$accountStatus', 'SUSPENDED'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$accountStatus', 'PENDING_VERIFICATION'] }, 1, 0] } }
        }
      }
    ]),
    // Document Stats
    Document.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      }
    ]),
    // Recent Activity (Last 10 logs)
    AuditLog.find()
      .populate('actor', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(10)
  ]);

  const docStatsFormatted = documentStats.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      users: userStats[0] || { total: 0, active: 0, suspended: 0, pending: 0 },
      documents: docStatsFormatted,
      activity: recentActivity
    }
  });
});

/**
 * @desc Search and Paginate all users
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role, status, department } = req.query;
  const parsedPage = Math.max(1, Number.parseInt(String(page), 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(String(limit), 10) || 20));
  const filter = {};

  if (search) {
    const safeSearch = escapeRegex(String(search).trim());
    filter.$or = [
      { fullName: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { employeeId: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  if (role) filter.role = role;
  if (status) filter.accountStatus = status;
  if (department) filter.department = department;

  const users = await User.find(filter)
    .select('-passwordHash -refreshTokenHash')
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .skip((parsedPage - 1) * parsedLimit)
    .exec();

  const count = await User.countDocuments(filter);

  res.json({
    success: true,
    users,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    totalRecords: count
  });
});

/**
 * @desc Manage user status and roles
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, accountStatus, department, grade, password } = req.body;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const previousValue = {
    role: user.role,
    accountStatus: user.accountStatus,
    department: user.department,
    grade: user.grade
  };

  if (role) user.role = role;
  if (accountStatus) user.accountStatus = accountStatus;
  if (department) user.department = department;
  if (grade) user.grade = grade;

  if (password) {
    if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.lastPasswordChangeAt = new Date();
    // Invalidate existing tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  await user.save();

  await createAuditLog({
    actor: req.user._id,
    action: 'ADMIN_USER_UPDATED',
    newValue: { role, accountStatus, department, grade, passwordChanged: !!password },
    previousValue,
    metadata: { targetUserId: user._id },
    req
  });

  res.json({
    success: true,
    message: `User ${user.fullName} updated successfully`,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      department: user.department,
      grade: user.grade
    }
  });
});

/**
 * @desc Search and Paginate all documents
 */
export const getDocuments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', status, department } = req.query;
  const parsedPage = Math.max(1, Number.parseInt(String(page), 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number.parseInt(String(limit), 10) || 20));
  const filter = {};

  if (search) {
    const safeSearch = escapeRegex(String(search).trim());
    filter.$or = [
      { title: { $regex: safeSearch, $options: 'i' } },
      { referenceNumber: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  if (status) filter.currentStatus = status;
  if (department) filter.department = department;

  const documents = await Document.find(filter)
    .populate('sender', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .skip((parsedPage - 1) * parsedLimit)
    .exec();

  const count = await Document.countDocuments(filter);

  res.json({
    success: true,
    documents,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage
  });
});

/**
 * @desc Get all audit logs
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, actorId } = req.query;
  const parsedPage = Math.max(1, Number.parseInt(String(page), 10) || 1);
  const parsedLimit = Math.min(200, Math.max(1, Number.parseInt(String(limit), 10) || 50));
  const filter = {};

  if (action) filter.action = action;
  if (actorId) filter.actor = actorId;

  const logs = await AuditLog.find(filter)
    .populate('actor', 'fullName email')
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .skip((parsedPage - 1) * parsedLimit)
    .exec();

  const count = await AuditLog.countDocuments(filter);

  res.json({
    success: true,
    logs,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage
  });
});

/**
 * @desc Controlled communication record access
 */
export const getCommunicationRecord = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { reason } = req.query;

  if (!reason) {
    throw new ApiError(400, 'A valid reason is required for accessing restricted communication records');
  }

  const comments = await Comment.find({ documentId })
    .populate('author', 'fullName role department')
    .sort({ createdAt: 1 });

  // LOG SENSITIVE ACCESS
  await createAuditLog({
    actor: req.user._id,
    action: 'ADMIN_SENSITIVE_COMMUNICATION_ACCESS',
    metadata: { 
      documentId, 
      accessReason: reason,
      type: 'DOCUMENT_COMMENTS_AUDIT'
    },
    req
  });

  res.json({
    success: true,
    comments
  });
});
