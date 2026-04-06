import AuditLog from '../models/AuditLog.js';

export async function createAuditLog({ 
  documentId = null, 
  actor, 
  action, 
  previousValue = null, 
  newValue = null, 
  req = null, 
  metadata = null,
  ip = null,
  ua = null
}) {
  await AuditLog.create({
    documentId,
    actor,
    action,
    previousValue,
    newValue,
    metadata,
    ipAddress: ip || req?.ip || '0.0.0.0',
    userAgent: ua || req?.headers?.['user-agent'] || 'System'
  });
}
