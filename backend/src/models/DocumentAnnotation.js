import mongoose from 'mongoose';

const documentAnnotationSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion', required: true, index: true },
    tool: {
      type: String,
      enum: ['highlight', 'strikethrough', 'comment', 'signature', 'sticky'],
      required: true
    },
    text: { type: String, trim: true, default: '' },
    color: { type: String, default: 'yellow' },
    x: { type: Number, required: true, min: 0, max: 100 },
    y: { type: Number, required: true, min: 0, max: 100 },
    width: { type: Number, min: 0, max: 100 },
    height: { type: Number, min: 0, max: 100 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

documentAnnotationSchema.index({ documentId: 1, versionId: 1, createdAt: 1 });
documentAnnotationSchema.index(
  { documentId: 1, createdBy: 1, tool: 1 },
  { unique: true, partialFilterExpression: { tool: 'sticky' } }
);

export default mongoose.model('DocumentAnnotation', documentAnnotationSchema);
