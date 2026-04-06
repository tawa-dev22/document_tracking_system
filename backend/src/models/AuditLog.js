import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

auditLogSchema.index({ documentId: 1, action: 1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
