import { Router } from 'express';
import {
  forgotPassword,
  getStatusPolicies,
  listSessions,
  login,
  logout,
  logoutAllDevices,
  me,
  refresh,
  register,
  resendVerificationOtp,
  resetPassword,
  revokeSession,
  verifyEmailOtp,
  verifyResetOtp,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  authLimiter,
  registerLimiter,
  resendLimiter,
  resetRequestLimiter,
  verifyLimiter
} from '../middleware/security.middleware.js';

const router = Router();

router.get('/status-policies', getStatusPolicies);

router.post('/register', registerLimiter, register);
router.post('/verify-email', verifyLimiter, verifyEmailOtp);
router.post('/resend-verification-otp', resendLimiter, resendVerificationOtp);

router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.post('/forgot-password', resetRequestLimiter, forgotPassword);
router.post('/verify-reset-otp', verifyLimiter, verifyResetOtp);
router.post('/reset-password', resetPassword);

router.get('/me', requireAuth, me);
router.put('/profile', requireAuth, updateProfile);
router.post('/change-password', requireAuth, changePassword);

// Session Management
router.get('/sessions', requireAuth, listSessions);
router.post('/sessions/logout-all', requireAuth, logoutAllDevices);
router.delete('/sessions/revoke/:sessionId', requireAuth, revokeSession);

export default router;
