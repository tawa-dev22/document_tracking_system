import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    referenceNumber: { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true, trim: true, default: 'Unassigned' },
    currentStatus: {
      type: String,
      enum: ['SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RESUBMITTED'],
      default: 'SUBMITTED'
    },
    currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion' },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    currentHandler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    externalRecipients: [{ type: String }],
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    dueDate: { type: Date },
    isArchived: { type: Boolean, default: false },
    lastActionAt: { type: Date, default: Date.now },
    lastReminderAt: { type: Date, default: null },
    
    // Processing Time Tracking
    submittedAt: { type: Date, default: Date.now },
    finalizedAt: { type: Date, default: null },
    totalProcessingTime: { type: Number, default: 0 },
    inProgressStartedAt: { type: Date, default: null },
    inProgressEndedAt: { type: Date, default: null },
    inProgressDuration: { type: Number, default: 0 }
  },
  { timestamps: true }
);

documentSchema.index({ sender: 1 });
documentSchema.index({ isArchived: 1, updatedAt: -1 });
documentSchema.index({ currentStatus: 1, createdAt: -1 });
documentSchema.index({ assignedUsers: 1 });
documentSchema.index({ recipients: 1 });
documentSchema.index({ title: 'text', referenceNumber: 'text', description: 'text' });

export default mongoose.model('Document', documentSchema);
