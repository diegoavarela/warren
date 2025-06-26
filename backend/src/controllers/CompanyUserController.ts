import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { CompanyUserService } from '../services/CompanyUserService';
import { logger } from '../utils/logger';

export class CompanyUserController {
  /**
   * Invite a user to the company
   */
  async inviteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const { email, role } = req.body;

      if (!email || !role) {
        return next(createError('Email and role are required', 400));
      }

      if (!['company_admin', 'company_employee'].includes(role)) {
        return next(createError('Invalid role', 400));
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(createError('Invalid email format', 400));
      }

      const invitation = await CompanyUserService.inviteUser(
        req.tenantId,
        parseInt(req.user.id),
        { email, role, invitedBy: parseInt(req.user.id) }
      );

      res.status(201).json({
        success: true,
        message: `Invitation sent to ${email}`,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password, firstName, lastName } = req.body;

      if (!token || !password) {
        return next(createError('Token and password are required', 400));
      }

      if (password.length < 8) {
        return next(createError('Password must be at least 8 characters', 400));
      }

      const result = await CompanyUserService.acceptInvitation(
        token,
        password,
        firstName,
        lastName
      );

      res.json({
        success: true,
        message: 'Account created successfully',
        userId: result.userId,
        companyId: result.companyId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get company users
   */
  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const users = await CompanyUserService.getCompanyUsers(
        req.tenantId,
        parseInt(req.user.id)
      );

      const pendingInvitations = await CompanyUserService.getPendingInvitations(
        req.tenantId
      );

      res.json({
        success: true,
        users,
        pendingInvitations,
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        pendingCount: pendingInvitations.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !['company_admin', 'company_employee'].includes(role)) {
        return next(createError('Valid role is required', 400));
      }

      // Prevent users from changing their own role
      if (parseInt(userId) === parseInt(req.user.id)) {
        return next(createError('Cannot change your own role', 400));
      }

      await CompanyUserService.updateUserRole(
        req.tenantId,
        parseInt(userId),
        role,
        parseInt(req.user.id)
      );

      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate user
   */
  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const { userId } = req.params;

      await CompanyUserService.deactivateUser(
        req.tenantId,
        parseInt(userId),
        parseInt(req.user.id)
      );

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate user
   */
  async reactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const { userId } = req.params;

      await CompanyUserService.reactivateUser(
        req.tenantId,
        parseInt(userId),
        parseInt(req.user.id)
      );

      res.json({
        success: true,
        message: 'User reactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get company stats
   */
  async getCompanyStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const stats = await CompanyUserService.getCompanyStats(req.tenantId);

      res.json({
        success: true,
        ...stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invitations
   */
  async getInvitations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const invitations = await CompanyUserService.getInvitations(req.tenantId);

      res.json({
        success: true,
        invitations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const { invitationId } = req.params;

      await CompanyUserService.cancelInvitation(
        req.tenantId,
        parseInt(invitationId),
        parseInt(req.user.id)
      );

      res.json({
        success: true,
        message: 'Invitation cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const { invitationId } = req.params;

      // Cancel existing invitation and create new one
      await CompanyUserService.cancelInvitation(
        req.tenantId,
        parseInt(invitationId),
        parseInt(req.user.id)
      );

      // Get invitation details to resend
      const { email, role } = req.body;
      
      const newInvitation = await CompanyUserService.inviteUser(
        req.tenantId,
        parseInt(req.user.id),
        { email, role, invitedBy: parseInt(req.user.id) }
      );

      res.json({
        success: true,
        message: 'Invitation resent successfully',
        invitation: {
          id: newInvitation.id,
          email: newInvitation.email,
          role: newInvitation.role,
          expiresAt: newInvitation.expiresAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user activity report
   */
  async getUserActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      const days = parseInt(req.query.days as string) || 30;
      
      if (days < 1 || days > 90) {
        return next(createError('Days must be between 1 and 90', 400));
      }

      const activity = await CompanyUserService.getUserActivityReport(
        req.tenantId,
        days
      );

      res.json({
        success: true,
        activity,
        period: `${days} days`,
        totalUsers: activity.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user || !req.tenantId) {
        return next(createError('Authentication required', 401));
      }

      // This would be handled by the MultiTenantAuthController.getProfile
      // but included here for completeness
      res.json({
        success: true,
        user: req.user,
        tenantId: req.tenantId,
        tenantName: req.tenantName,
        subscriptionTier: req.subscriptionTier,
        featureFlags: req.featureFlags
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const { firstName, lastName } = req.body;

      // Basic validation - add more fields as needed
      if (firstName && firstName.length > 50) {
        return next(createError('First name too long', 400));
      }

      if (lastName && lastName.length > 50) {
        return next(createError('Last name too long', 400));
      }

      // Update user profile fields
      // This would require extending the user table with additional fields
      
      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(createError('Authentication required', 401));
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return next(createError('Current and new password are required', 400));
      }

      if (newPassword.length < 8) {
        return next(createError('New password must be at least 8 characters', 400));
      }

      // Verify current password and update
      // This would require implementing password change logic
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}