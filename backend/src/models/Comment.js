import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ['ALL_INVOLVED', 'INTERNAL'], default: 'ALL_INVOLVED' }
  },
  { timestamps: true }
);

commentSchema.index({ documentId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
