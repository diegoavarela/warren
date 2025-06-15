import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  department?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  encryptedData?: string; // For sensitive data storage
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  department?: string;
}

// In-memory user store (in production, this would be a database)
let users: User[] = [
  {
    id: '1',
    email: 'admin@vort-ex.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'IT',
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date()
  },
  {
    id: '2',
    email: 'demo@warren.vortex.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    department: 'Demo',
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date()
  }
];

// In-memory password store (encrypted)
let userPasswords: Map<string, string> = new Map();
userPasswords.set('1', bcrypt.hashSync('vortex123', 10));
userPasswords.set('2', bcrypt.hashSync('WarrenDemo2024!', 10));

export class UserService {
  private static encryptionKey = process.env.ENCRYPTION_KEY || 'warren-encryption-key-2025';

  static validateEmail(email: string): boolean {
    // Allow vort-ex.com domain and the demo email
    const emailRegex = /^[^\s@]+@vort-ex\.com$/;
    const isDemoEmail = email === 'demo@warren.vortex.com';
    return emailRegex.test(email) || isDemoEmail;
  }

  static async authenticateUser(email: string, password: string): Promise<User | null> {
    // Check admin credentials first (backward compatibility)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@vort-ex.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'vortex123';

    if (email === adminEmail && password === adminPassword) {
      const adminUser = users.find(u => u.email === adminEmail) || {
        id: '1',
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin' as const,
        department: 'IT',
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      // Update last login
      adminUser.lastLogin = new Date();
      return adminUser;
    }

    // Check demo account (special handling)
    if (email === 'demo@warren.vortex.com' && password === 'WarrenDemo2024!') {
      const demoUser = users.find(u => u.email === 'demo@warren.vortex.com');
      if (demoUser) {
        demoUser.lastLogin = new Date();
        return demoUser;
      }
    }

    // Check registered users
    const user = users.find(u => u.email === email && u.isActive);
    if (!user) {
      return null;
    }

    const hashedPassword = userPasswords.get(user.id);
    if (!hashedPassword) {
      return null;
    }

    const isValid = await bcrypt.compare(password, hashedPassword);
    if (!isValid) {
      return null;
    }

    // Update last login
    user.lastLogin = new Date();
    logger.info(`User authenticated: ${email}`);
    
    return user;
  }

  static async createUser(userData: CreateUserData): Promise<User> {
    // Validate email domain
    if (!this.validateEmail(userData.email)) {
      throw new Error('Email must be from vort-ex.com domain');
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate unique ID
    const id = crypto.randomUUID();

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const newUser: User = {
      id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      department: userData.department,
      isActive: true,
      createdAt: new Date()
    };

    // Store user and password
    users.push(newUser);
    userPasswords.set(id, hashedPassword);

    logger.info(`User created: ${userData.email}`);
    return newUser;
  }

  static getAllUsers(): User[] {
    return users.filter(u => u.isActive);
  }

  static getUserById(id: string): User | null {
    return users.find(u => u.id === id && u.isActive) || null;
  }

  static async updateUser(id: string, updateData: Partial<CreateUserData>): Promise<User | null> {
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate email if being updated
    if (updateData.email && !this.validateEmail(updateData.email)) {
      throw new Error('Email must be from vort-ex.com domain');
    }

    // Check for email conflicts
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = users.find(u => u.email === updateData.email && u.id !== id);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
    }

    // Update user data
    if (updateData.email) user.email = updateData.email;
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.role) user.role = updateData.role;
    if (updateData.department !== undefined) user.department = updateData.department;

    // Update password if provided
    if (updateData.password) {
      const hashedPassword = await bcrypt.hash(updateData.password, 10);
      userPasswords.set(id, hashedPassword);
    }

    logger.info(`User updated: ${user.email}`);
    return user;
  }

  static deleteUser(id: string): boolean {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return false;
    }

    // Soft delete - mark as inactive
    users[userIndex].isActive = false;
    
    logger.info(`User deactivated: ${users[userIndex].email}`);
    return true;
  }

  static encryptSensitiveData(data: any): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decryptSensitiveData(encryptedData: string): any {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to decrypt sensitive data:', error);
      return null;
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = users.find(u => u.id === userId && u.isActive);
    if (!user) {
      throw new Error('User not found');
    }

    const hashedPassword = userPasswords.get(userId);
    if (!hashedPassword) {
      throw new Error('User password not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and store new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    userPasswords.set(userId, newHashedPassword);

    logger.info(`Password changed for user: ${user.email}`);
    return true;
  }
}