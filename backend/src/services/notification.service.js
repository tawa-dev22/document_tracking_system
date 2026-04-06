import Notification from '../models/Notification.js';

export async function createNotification(io, { userIds, documentId = null, type, title, message, metadata = null }) {
  const uniqueUserIds = [...new Set(userIds.map(String))];
  if (!uniqueUserIds.length) return [];

  const notifications = await Notification.insertMany(
    uniqueUserIds.map((userId) => ({ userId, documentId, type, title, message, metadata }))
  );

  const unreadCounts = await Notification.aggregate([
    { $match: { userId: { $in: uniqueUserIds }, isRead: false } },
    { $group: { _id: '$userId', unreadCount: { $sum: 1 } } }
  ]);
  const unreadMap = new Map(unreadCounts.map((item) => [String(item._id), item.unreadCount]));

  for (const notification of notifications) {
    const userId = String(notification.userId);
    io.to(`user:${userId}`).emit('notification:new', notification);
    io.to(`user:${userId}`).emit('notification:summary', { unreadCount: unreadMap.get(userId) || 0 });
  }

  return notifications;
}
