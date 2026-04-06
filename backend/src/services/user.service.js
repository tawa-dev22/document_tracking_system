import User from '../models/User.js';
import Document from '../models/Document.js';
import AuditLog from '../models/AuditLog.js';

/**
 * Resolves a list of emails to registered user objects.
 * Returns a map of email -> user object.
 */
export async function resolveEmailsToUsers(emails) {
  if (!emails || !emails.length) return new Map();
  
  const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase().trim()))];
  const users = await User.find({ email: { $in: uniqueEmails } });
  
  const emailMap = new Map();
  users.forEach(user => {
    emailMap.set(user.email.toLowerCase(), user);
  });
  
  return emailMap;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Moves any externally shared documents for an email into the registered user's recipients list.
 * This ensures previously shared records appear in dashboard immediately after account activation.
 */
export async function claimSharedDocumentsForUser(user) {
  if (!user?._id || !user?.email) return;

  const normalizedEmail = user.email.toLowerCase().trim();
  const exactEmailPattern = new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i');

  await Document.updateMany(
    { externalRecipients: { $regex: exactEmailPattern } },
    {
      $addToSet: { recipients: user._id },
      $pull: { externalRecipients: { $regex: exactEmailPattern } }
    }
  );

  await AuditLog.updateMany(
    {
      action: 'DOCUMENT_SHARED_ACCESS',
      'newValue.targetEmail': { $regex: exactEmailPattern }
    },
    {
      $set: {
        'newValue.targetName': user.fullName,
        'newValue.isRegistered': true
      }
    }
  );
}
