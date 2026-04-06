import cron from 'node-cron';
import Document from '../models/Document.js';
import { createNotification } from './notification.service.js';

export function initReminderCron(io) {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[Reminder Service] Checking for pending documents...');
    try {
      const now = new Date();
      const pendingDocs = await Document.find({
        currentStatus: { $in: ['SUBMITTED', 'RESUBMITTED'] }
      })
        .limit(500)
        .lean();

      for (const doc of pendingDocs) {
        const lastReminded = doc.lastReminderAt ? new Date(doc.lastReminderAt) : null;
        let shouldRemind = false;

        if (doc.priority === 'HIGH') {
          // Every 15 minutes for HIGH priority
          if (!lastReminded || (now - lastReminded) >= 15 * 60 * 1000) {
            shouldRemind = true;
          }
        } else {
          // Every 24 hours for others
          if (!lastReminded || (now - lastReminded) >= 24 * 60 * 60 * 1000) {
            shouldRemind = true;
          }
        }

        if (shouldRemind) {
          const notifyUsers = [...new Set([doc.sender, ...doc.assignedUsers, ...doc.recipients])].map(String);

          await createNotification(io, {
            userIds: notifyUsers,
            documentId: doc._id,
            type: 'DOCUMENT_REMINDER',
            title: `Reminder: ${doc.title}`,
            message: `This ${doc.priority} priority document is still pending action. Reference: ${doc.referenceNumber}`
          });

          await Document.updateOne({ _id: doc._id }, { $set: { lastReminderAt: now } });
          console.log(`[Reminder Service] Sent reminder for doc: ${doc.referenceNumber}`);
        }
      }
    } catch (error) {
      console.error('[Reminder Service] Error in cron job:', error);
    }
  });
}
