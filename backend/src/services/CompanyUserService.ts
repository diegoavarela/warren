import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../config/database';
import { emailService } from './EmailService';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

interface CreateUserInput {
  email: string;
  role: 'company_admin' | 'company_employee';
  invitedBy: number;
}

interface UserInvitation {
  id: number;
  email: string;
  companyId: string;
  role: string;
  invitedBy: number;
  invitationToken: string;
  expiresAt: Date;
}

export class CompanyUserService {
  /**
   * Invite a new user to the company
   */
  static async inviteUser(
    companyId: string,
    inviterUserId: number,
    userData: CreateUserInput
  ): Promise<UserInvitation> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate email domain
      const isValidDomain = await this.validateEmailDomain(userData.email, companyId);
      if (!isValidDomain) {
        throw createError('Email domain not allowed for this company', 400);
      }

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        throw createError('User with this email already exists', 409);
      }

      // Check if invitation already exists
      const existingInvitation = await client.query(
        'SELECT id FROM user_invitations WHERE email = $1 AND company_id = $2',
        [userData.email, companyId]
      );

      if (existingInvitation.rows.length > 0) {
        throw createError('Invitation already sent to this email', 409);
      }

      // Check user limit
      const limitCheck = await this.checkUserLimit(companyId, client);
      if (!limitCheck.canAddUser) {
        throw createError(
          `User limit reached. Current plan allows ${limitCheck.userLimit} users.`,
          403
        );
      }

      // Get inviter details
      const inviterResult = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [inviterUserId]
      );
      const inviterName = inviterResult.rows[0].email.split('@')[0];

      // Get company name
      const companyResult = await client.query(
        'SELECT name FROM companies WHERE id = $1',
        [companyId]
      );
      const companyName = companyResult.rows[0].name;

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation
      const invitationResult = await client.query(
        `INSERT INTO user_invitations 
         (email, company_id, role, invited_by, invitation_token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userData.email, companyId, userData.role, inviterUserId, invitationToken, expiresAt]
      );

      const invitation = invitationResult.rows[0];

      // Send invitation email
      await emailService.sendInvitation(
        userData.email,
        inviterName,
        companyName,
        invitationToken,
        userData.role
      );

      // Log audit event
      await this.logAuditEvent(
        inviterUserId,
        companyId,
        'user.invited',
        'invitation',
        invitation.id,
        { email: userData.email, role: userData.role },
        client
      );

      await client.query('COMMIT');

      logger.info(`User invited: ${userData.email} to company ${companyId}`);

      return {
        id: invitation.id,
        email: invitation.email,
        companyId: invitation.company_id,
        role: invitation.role,
        invitedBy: invitation.invited_by,
        invitationToken: invitation.invitation_token,
        expiresAt: invitation.expires_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Accept invitation and create user account
   */
  static async acceptInvitation(
    invitationToken: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ userId: number; companyId: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get invitation
      const invitationResult = await client.query(
        `SELECT * FROM user_invitations 
         WHERE invitation_token = $1 AND expires_at > NOW()`,
        [invitationToken]
      );

      if (invitationResult.rows.length === 0) {
        throw createError('Invalid or expired invitation', 400);
      }

      const invitation = invitationResult.rows[0];

      // Check if already accepted
      if (invitation.accepted_at) {
        throw createError('Invitation already accepted', 400);
      }

      // Check user limit again
      const limitCheck = await this.checkUserLimit(invitation.company_id, client);
      if (!limitCheck.canAddUser) {
        throw createError('Company has reached user limit', 403);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const userResult = await client.query(
        `INSERT INTO users 
         (email, password_hash, company_id, role, email_verified, 
          invited_by, accepted_at, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, $5, NOW(), true, NOW(), NOW())
         RETURNING id`,
        [
          invitation.email,
          passwordHash,
          invitation.company_id,
          invitation.role,
          invitation.invited_by
        ]
      );

      const userId = userResult.rows[0].id;

      // Mark invitation as accepted
      await client.query(
        'UPDATE user_invitations SET accepted_at = NOW() WHERE id = $1',
        [invitation.id]
      );

      // Log audit event
      await this.logAuditEvent(
        userId,
        invitation.company_id,
        'user.created',
        'user',
        userId,
        { email: invitation.email, role: invitation.role },
        client
      );

      await client.query('COMMIT');

      logger.info(`User created from invitation: ${invitation.email}`);

      return {
        userId,
        companyId: invitation.company_id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get company users
   */
  static async getCompanyUsers(companyId: string, requestingUserId: number) {
    // Platform admins can see all users across all companies
    if (companyId === 'platform') {
      const result = await pool.query(
        `SELECT 
          u.id, u.email, u.role, u.is_active, u.is_2fa_enabled,
          u.created_at, u.last_login, u.email_verified,
          u.company_id, c.name as company_name,
          inviter.email as invited_by_email
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         LEFT JOIN users inviter ON u.invited_by = inviter.id
         ORDER BY u.created_at DESC`
      );
      
      return result.rows.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        is2FAEnabled: user.is_2fa_enabled,
        emailVerified: user.email_verified,
        companyId: user.company_id,
        companyName: user.company_name,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        invitedByEmail: user.invited_by_email
      }));
    }

    // Regular company users see only their company's users
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.role, u.is_active, u.is_2fa_enabled,
        u.created_at, u.last_login, u.email_verified,
        inviter.email as invited_by_email
       FROM users u
       LEFT JOIN users inviter ON u.invited_by = inviter.id
       WHERE u.company_id = $1
       ORDER BY u.created_at DESC`,
      [companyId]
    );

    return result.rows.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      is2FAEnabled: user.is_2fa_enabled,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      invitedBy: user.invited_by_email
    }));
  }

  /**
   * Update user role
   */
  static async updateUserRole(
    companyId: string,
    userId: number,
    newRole: 'company_admin' | 'company_employee',
    updatedBy: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify user belongs to company
      const userCheck = await client.query(
        'SELECT role FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );

      if (userCheck.rows.length === 0) {
        throw createError('User not found in company', 404);
      }

      const oldRole = userCheck.rows[0].role;

      // Update role
      await client.query(
        'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
        [newRole, userId]
      );

      // Log audit event
      await this.logAuditEvent(
        updatedBy,
        companyId,
        'user.role_updated',
        'user',
        userId,
        { oldRole, newRole },
        client
      );

      await client.query('COMMIT');

      logger.info(`User role updated: ${userId} from ${oldRole} to ${newRole}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(
    companyId: string,
    userId: number,
    deactivatedBy: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify user belongs to company
      const userCheck = await client.query(
        'SELECT email FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );

      if (userCheck.rows.length === 0) {
        throw createError('User not found in company', 404);
      }

      // Prevent self-deactivation
      if (userId === deactivatedBy) {
        throw createError('Cannot deactivate your own account', 400);
      }

      // Deactivate user
      await client.query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      // Invalidate all user sessions
      await client.query(
        'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );

      // Log audit event
      await this.logAuditEvent(
        deactivatedBy,
        companyId,
        'user.deactivated',
        'user',
        userId,
        { email: userCheck.rows[0].email },
        client
      );

      await client.query('COMMIT');

      logger.info(`User deactivated: ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reactivate user
   */
  static async reactivateUser(
    companyId: string,
    userId: number,
    reactivatedBy: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check user limit before reactivating
      const limitCheck = await this.checkUserLimit(companyId, client);
      if (!limitCheck.canAddUser) {
        throw createError(
          `Cannot reactivate user. User limit (${limitCheck.userLimit}) reached.`,
          403
        );
      }

      // Verify user belongs to company
      const userCheck = await client.query(
        'SELECT email FROM users WHERE id = $1 AND company_id = $2',
        [userId, companyId]
      );

      if (userCheck.rows.length === 0) {
        throw createError('User not found in company', 404);
      }

      // Reactivate user
      await client.query(
        'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      // Log audit event
      await this.logAuditEvent(
        reactivatedBy,
        companyId,
        'user.reactivated',
        'user',
        userId,
        { email: userCheck.rows[0].email },
        client
      );

      await client.query('COMMIT');

      logger.info(`User reactivated: ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pending invitations
   */
  static async getPendingInvitations(companyId: string) {
    // Platform admins can see all pending invitations across all companies
    if (companyId === 'platform') {
      const result = await pool.query(
        `SELECT 
          i.id, i.email, i.role, i.created_at,
          i.expires_at, i.company_id, c.name as company_name,
          u.email as invited_by_email
         FROM user_invitations i
         JOIN users u ON i.invited_by = u.id
         LEFT JOIN companies c ON i.company_id = c.id
         WHERE i.accepted_at IS NULL 
           AND i.expires_at > NOW()
         ORDER BY i.created_at DESC`
      );
      
      return result.rows.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        companyId: inv.company_id,
        companyName: inv.company_name,
        createdAt: inv.created_at,
        expiresAt: inv.expires_at,
        invitedByEmail: inv.invited_by_email
      }));
    }

    // Regular company users see only their company's invitations
    const result = await pool.query(
      `SELECT 
        i.id, i.email, i.role, i.created_at,
        i.expires_at, u.email as invited_by_email
       FROM user_invitations i
       JOIN users u ON i.invited_by = u.id
       WHERE i.company_id = $1 
         AND i.accepted_at IS NULL 
         AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [companyId]
    );

    return result.rows.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
      invitedBy: inv.invited_by_email
    }));
  }

  /**
   * Cancel invitation
   */
  static async cancelInvitation(
    companyId: string,
    invitationId: number,
    cancelledBy: number
  ): Promise<void> {
    const result = await pool.query(
      'DELETE FROM user_invitations WHERE id = $1 AND company_id = $2 RETURNING email',
      [invitationId, companyId]
    );

    if (result.rows.length === 0) {
      throw createError('Invitation not found', 404);
    }

    await this.logAuditEvent(
      cancelledBy,
      companyId,
      'invitation.cancelled',
      'invitation',
      invitationId,
      { email: result.rows[0].email }
    );

    logger.info(`Invitation cancelled: ${invitationId}`);
  }

  /**
   * Validate email domain
   */
  private static async validateEmailDomain(
    email: string,
    companyId: string
  ): Promise<boolean> {
    const domain = email.split('@')[1];

    // Check blocked domains
    const blockedResult = await pool.query(
      'SELECT 1 FROM blocked_email_domains WHERE domain = $1',
      [domain]
    );

    if (blockedResult.rows.length > 0) {
      return false;
    }

    // Check allowed domains for company
    const allowedResult = await pool.query(
      'SELECT allowed_email_domains FROM companies WHERE id = $1',
      [companyId]
    );

    const allowedDomains = allowedResult.rows[0]?.allowed_email_domains || [];
    
    // If no domains specified, allow any corporate domain
    if (allowedDomains.length === 0) {
      return true;
    }

    return allowedDomains.includes(domain);
  }

  /**
   * Check user limit
   */
  private static async checkUserLimit(
    companyId: string,
    client?: any
  ): Promise<{ canAddUser: boolean; userLimit: number; currentUsers: number }> {
    const conn = client || pool;
    
    const result = await conn.query(
      `SELECT 
        c.user_limit,
        c.subscription_tier,
        COUNT(u.id) as current_users
       FROM companies c
       LEFT JOIN users u ON c.id = u.company_id AND u.is_active = true
       WHERE c.id = $1
       GROUP BY c.id, c.user_limit, c.subscription_tier`,
      [companyId]
    );

    const { user_limit, subscription_tier, current_users } = result.rows[0];
    const currentCount = parseInt(current_users);

    // Enterprise has unlimited users
    if (subscription_tier === 'enterprise') {
      return { canAddUser: true, userLimit: -1, currentUsers: currentCount };
    }

    return {
      canAddUser: currentCount < user_limit,
      userLimit: user_limit,
      currentUsers: currentCount
    };
  }

  /**
   * Get company statistics
   */
  static async getCompanyStats(companyId: string) {
    const result = await pool.query(
      `SELECT 
        c.subscription_tier,
        c.user_limit,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.is_active = true) as active_users,
        COUNT(DISTINCT ui.id) FILTER (WHERE ui.accepted_at IS NULL AND ui.expires_at > NOW()) as pending_invitations
      FROM companies c
      LEFT JOIN users u ON c.id = u.company_id
      LEFT JOIN user_invitations ui ON c.id = ui.company_id
      WHERE c.id = $1
      GROUP BY c.id, c.subscription_tier, c.user_limit`,
      [companyId]
    );

    return result.rows[0] || {
      subscription_tier: 'basic',
      user_limit: 5,
      total_users: 0,
      active_users: 0,
      pending_invitations: 0
    };
  }

  /**
   * Get invitations
   */
  static async getInvitations(companyId: string) {
    const result = await pool.query(
      `SELECT 
        ui.id,
        ui.email,
        ui.role,
        ui.created_at,
        ui.expires_at,
        ui.accepted_at,
        u.email as invited_by_email
      FROM user_invitations ui
      LEFT JOIN users u ON ui.invited_by = u.id
      WHERE ui.company_id = $1
      ORDER BY ui.created_at DESC`,
      [companyId]
    );

    return result.rows;
  }

  /**
   * Log audit event
   */
  private static async logAuditEvent(
    userId: number,
    companyId: string,
    action: string,
    entityType: string,
    entityId: number,
    details: any,
    client?: any
  ): Promise<void> {
    const conn = client || pool;
    
    await conn.query(
      `INSERT INTO audit_logs 
       (user_id, company_id, action, entity_type, entity_id, new_values, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, companyId, action, entityType, entityId, JSON.stringify(details)]
    );
  }

  /**
   * Get user activity report
   */
  static async getUserActivityReport(companyId: string, days: number = 30) {
    const result = await pool.query(
      `SELECT 
        u.email,
        u.role,
        u.last_login,
        COUNT(DISTINCT al.id) as actions_count,
        COUNT(DISTINCT DATE(al.created_at)) as active_days
       FROM users u
       LEFT JOIN audit_logs al ON u.id = al.user_id 
         AND al.created_at > NOW() - INTERVAL '${days} days'
       WHERE u.company_id = $1 AND u.is_active = true
       GROUP BY u.id, u.email, u.role, u.last_login
       ORDER BY actions_count DESC`,
      [companyId]
    );

    return result.rows;
  }
}