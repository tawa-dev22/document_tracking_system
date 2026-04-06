import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: notifications });
});

export const getNotificationSummary = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  const types = await Notification.aggregate([
    { $match: { userId: req.user._id, isRead: false } },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);

  res.json({ success: true, data: { unreadCount, types } });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
  if (!notification) throw new ApiError(404, 'Notification not found');
  notification.isRead = true;
  await notification.save();

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  req.io.to(`user:${req.user._id.toString()}`).emit('notification:summary', { unreadCount });
  res.json({ success: true, message: 'Notification marked as read', data: { notification, unreadCount } });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  req.io.to(`user:${req.user._id.toString()}`).emit('notification:summary', { unreadCount: 0 });
  res.json({ success: true, message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!notification) throw new ApiError(404, 'Notification not found');

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  req.io.to(`user:${req.user._id.toString()}`).emit('notification:summary', { unreadCount });
  res.json({ success: true, message: 'Notification deleted', data: { unreadCount } });
});

export const deleteAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  req.io.to(`user:${req.user._id.toString()}`).emit('notification:summary', { unreadCount: 0 });
  res.json({ success: true, message: 'All notifications cleared' });
});
