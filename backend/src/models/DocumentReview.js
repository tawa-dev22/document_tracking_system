import mongoose from 'mongoose';

const documentReviewSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['SUBMITTED', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'RESUBMITTED'],
      required: true
    },
    comment: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

documentReviewSchema.index({ documentId: 1, createdAt: -1 });
documentReviewSchema.index({ reviewerId: 1 });

export default mongoose.model('DocumentReview', documentReviewSchema);
