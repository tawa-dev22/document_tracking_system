import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { env } from './env.js';
import { createAuditLog } from '../services/audit.service.js';

/**
 * @desc Seed initial system administrator if none exists
 * Ensures the system has a root account upon first startup using .env credentials.
 * This is an idempotent function.
 */
export async function seedInitialAdmin() {
  try {
    // 1. Check if an admin already exists to prevent duplication
    const adminExists = await User.findOne({ role: 'ADMIN' });
    
    if (adminExists) {
      // Admin already exists, skip seeding
      // Security measure: delete sensitive env variable from process memory
      if (process.env.ADMIN_PASSWORD) delete process.env.ADMIN_PASSWORD;
      return;
    }

    // 2. Validate mandatory seeding credentials from environment
    const { name, email, password } = env.adminSeed;

    if (!name || !email || !password) {
      console.warn('[SEED] Admin seeding skipped: Missing ADMIN_NAME, ADMIN_EMAIL, or ADMIN_PASSWORD in .env');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
       console.error('[SEED] Admin seeding failed: Invalid email format configured in .env');
       return;
    }

    console.log(`[SEED] No administrator found. Initializing seeding for: ${email}`);

    // 3. Hash the initial password securely
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create the root administrator account
    const admin = await User.create({
      fullName: name,
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      role: 'ADMIN',
      department: 'IT & Systems', // Default department for initial admin
      grade: 'MASTER',           // Default grade
      employeeId: 'SYS-ADMIN-01', // Standard identifier for root admin
      accountStatus: 'ACTIVE',
      emailVerified: true,       // Pre-verify provided email
      permissions: ['ALL'],       // Grant master permissions
      lastPasswordChangeAt: null // Indicates the admin has not yet changed their password
    });

    // 5. Log the creation in the audit trail for transparency
    await createAuditLog({
      actor: admin._id, // The admin creates themselves in this context
      action: 'SYSTEM_INITIALIZATION_ADMIN_CREATED',
      newValue: { 
        email: admin.email, 
        role: 'ADMIN',
        reason: 'Automated initial system seeding'
      }
    });

    console.log(`[SEED] Initial administrator "${name}" created successfully.`);
    console.log(`[SEED] IMPORTANT: Please rotate the password after first login.`);

    // Security measure: delete sensitive env variable from process memory to prevent accidental logging later
    if (process.env.ADMIN_PASSWORD) delete process.env.ADMIN_PASSWORD;

  } catch (error) {
    console.error('[SEED] Critical error during administrator seeding:', error.message);
    // We don't throw here to avoid blocking server startup, but we log the error clearly
  }
}

