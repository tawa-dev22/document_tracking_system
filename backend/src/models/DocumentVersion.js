import mongoose from 'mongoose';

const documentVersionSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    versionNumber: { type: Number, required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storagePath: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

documentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
documentVersionSchema.index({ documentId: 1, createdAt: -1 });

export default mongoose.model('DocumentVersion', documentVersionSchema);
