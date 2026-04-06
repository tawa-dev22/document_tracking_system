import mongoose from 'mongoose';

const refreshSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    refreshTokenHash: { type: String, required: true, index: true },
    tokenVersion: { type: Number, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    deviceInfo: {
      browser: { type: String },
      os: { type: String },
      device: { type: String }
    },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    revokedReason: { type: String }
  },
  { timestamps: true }
);

// Index for session limit checks and cleanup
refreshSessionSchema.index({ userId: 1, revokedAt: 1, lastUsedAt: -1 });
refreshSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

// Helper to check if session is active
refreshSessionSchema.methods.isActive = function() {
  return !this.revokedAt && this.expiresAt > new Date();
};

export default mongoose.model('RefreshSession', refreshSessionSchema);
