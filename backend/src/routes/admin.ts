import { Router } from 'express';
import { AuthRequest, auth } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { UserService, CreateUserData } from '../services/UserService';
import { logger } from '../utils/logger';

const router = Router();

// Middleware to check admin role
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(createError('Admin access required', 403));
  }
  next();
};

// Get all users (admin only)
router.get('/users', auth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const users = UserService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

// Create new user (admin only)
router.post('/users', auth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const userData: CreateUserData = req.body;
    
    // Validate required fields
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
      return next(createError('Missing required fields', 400));
    }

    // Validate email domain
    if (!UserService.validateEmail(userData.email)) {
      return next(createError('Email must be from vort-ex.com domain', 400));
    }

    const newUser = await UserService.createUser(userData);
    
    // Remove sensitive data from response
    const { encryptedData, ...safeUser } = newUser;

    logger.info(`Admin ${req.user?.email} created user: ${newUser.email}`);

    res.status(201).json({
      success: true,
      data: safeUser,
      message: 'User created successfully'
    });
  } catch (error: any) {
    next(createError(error.message, 400));
  }
});

// Update user (admin only)
router.put('/users/:id', auth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const updateData: Partial<CreateUserData> = req.body;

    // Validate email domain if provided
    if (updateData.email && !UserService.validateEmail(updateData.email)) {
      return next(createError('Email must be from vort-ex.com domain', 400));
    }

    const updatedUser = await UserService.updateUser(id, updateData);
    if (!updatedUser) {
      return next(createError('User not found', 404));
    }

    // Remove sensitive data from response
    const { encryptedData, ...safeUser } = updatedUser;

    logger.info(`Admin ${req.user?.email} updated user: ${updatedUser.email}`);

    res.json({
      success: true,
      data: safeUser,
      message: 'User updated successfully'
    });
  } catch (error: any) {
    next(createError(error.message, 400));
  }
});

// Delete user (admin only)
router.delete('/users/:id', auth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user?.id === id) {
      return next(createError('Cannot delete your own account', 400));
    }

    const success = UserService.deleteUser(id);
    if (!success) {
      return next(createError('User not found', 404));
    }

    logger.info(`Admin ${req.user?.email} deleted user with ID: ${id}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (admin only)
router.get('/users/:id', auth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const user = UserService.getUserById(id);
    
    if (!user) {
      return next(createError('User not found', 404));
    }

    // Remove sensitive data from response
    const { encryptedData, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    next(error);
  }
});

// Admin dashboard stats
router.get('/stats', auth, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const users = UserService.getAllUsers();
    
    const stats = {
      totalUsers: users.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      regularUsers: users.filter(u => u.role === 'user').length,
      activeUsers: users.filter(u => u.isActive).length,
      recentLogins: users.filter(u => {
        if (!u.lastLogin) return false;
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return u.lastLogin > dayAgo;
      }).length,
      departments: [...new Set(users.map(u => u.department).filter(Boolean))]
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };