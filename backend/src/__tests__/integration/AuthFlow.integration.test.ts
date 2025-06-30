/**
 * Authentication Flow Integration Tests
 * 
 * End-to-end tests for multi-tenant authentication
 */

import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../testApp';
import { Container } from '../../core/Container';
import * as bcrypt from 'bcryptjs';
import { pool } from '../../config/database';

describe('Multi-Tenant Authentication Flow', () => {
  let app: Application;
  let container: Container;
  let testCompanyId: string;
  let testUserId: string;
  
  beforeAll(async () => {
    container = Container.getInstance();
    app = await createApp();
    
    // Create test company
    const companyResult = await pool.query(
      `INSERT INTO companies (name, domain, settings) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      ['Test Company', 'test-company.com', JSON.stringify({ features: ['all'] })]
    );
    testCompanyId = companyResult.rows[0].id;
    
    // Create test users
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    // Company admin
    const adminResult = await pool.query(
      `INSERT INTO company_users (company_id, email, password, role, name, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [testCompanyId, 'admin@test-company.com', hashedPassword, 'company_admin', 'Test Admin', true]
    );
    testUserId = adminResult.rows[0].id;
    
    // Regular employee
    await pool.query(
      `INSERT INTO company_users (company_id, email, password, role, name, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testCompanyId, 'employee@test-company.com', hashedPassword, 'company_employee', 'Test Employee', true]
    );
    
    // Inactive user
    await pool.query(
      `INSERT INTO company_users (company_id, email, password, role, name, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testCompanyId, 'inactive@test-company.com', hashedPassword, 'company_employee', 'Inactive User', false]
    );
  });
  
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM company_users WHERE company_id = $1', [testCompanyId]);
    await pool.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
    await pool.end();
    container.reset();
  });
  
  describe('POST /api/auth/login', () => {
    it('should successfully login company admin', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test-company.com',
          password: 'TestPassword123!'
        })
        .expect(200);
      
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('admin@test-company.com');
      expect(response.body.user.role).toBe('company_admin');
      expect(response.body.user.companyId).toBe(testCompanyId);
      expect(response.body.user.companyName).toBe('Test Company');
    });
    
    it('should successfully login company employee', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@test-company.com',
          password: 'TestPassword123!'
        })
        .expect(200);
      
      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('company_employee');
    });
    
    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test-company.com',
          password: 'WrongPassword'
        })
        .expect(401);
      
      expect(response.body.message).toContain('Invalid credentials');
    });
    
    it('should reject inactive users', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@test-company.com',
          password: 'TestPassword123!'
        })
        .expect(401);
      
      expect(response.body.message).toContain('Account is inactive');
    });
    
    it('should reject non-existent users', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test-company.com',
          password: 'TestPassword123!'
        })
        .expect(401);
      
      expect(response.body.message).toContain('Invalid credentials');
    });
    
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!'
        })
        .expect(400);
      
      expect(response.body.message).toContain('Invalid email');
    });
    
    it('should rate limit login attempts', async () => {
      // Make multiple failed login attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'admin@test-company.com',
              password: 'WrongPassword'
            })
        );
      }
      
      const results = await Promise.all(attempts);
      
      // Later attempts should be rate limited
      const rateLimited = results.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
  
  describe('Protected Routes', () => {
    let adminToken: string;
    let employeeToken: string;
    
    beforeAll(async () => {
      // Get tokens
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test-company.com',
          password: 'TestPassword123!'
        });
      adminToken = adminLogin.body.token;
      
      const employeeLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'employee@test-company.com',
          password: 'TestPassword123!'
        });
      employeeToken = employeeLogin.body.token;
    });
    
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/pnl/data')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toBeDefined();
    });
    
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/pnl/data')
        .expect(401);
      
      expect(response.body.message).toContain('No token provided');
    });
    
    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/pnl/data')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.message).toContain('Invalid token');
    });
    
    it('should enforce role-based access control', async () => {
      // Employee should not access admin routes
      const response = await request(app)
        .get('/api/company-users')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
      
      expect(response.body.message).toContain('Access denied');
    });
    
    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/api/company-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toBeDefined();
    });
  });
  
  describe('Session Management', () => {
    it('should expire tokens after expiry time', async () => {
      // Create token with short expiry
      const jwt = require('jsonwebtoken');
      const shortToken = jwt.sign(
        { 
          userId: testUserId,
          email: 'admin@test-company.com',
          companyId: testCompanyId,
          role: 'company_admin'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1ms' }
      );
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const response = await request(app)
        .get('/api/pnl/data')
        .set('Authorization', `Bearer ${shortToken}`)
        .expect(401);
      
      expect(response.body.message).toContain('Token expired');
    });
    
    it('should handle concurrent requests with same token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test-company.com',
          password: 'TestPassword123!'
        });
      
      const token = loginResponse.body.token;
      
      // Make concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/pnl/data')
            .set('Authorization', `Bearer ${token}`)
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });
    });
  });
  
  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'admin@test-company.com'
        })
        .expect(200);
      
      expect(response.body.message).toContain('Password reset email sent');
    });
    
    it('should not reveal if email exists', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@test-company.com'
        })
        .expect(200);
      
      // Same response for security
      expect(response.body.message).toContain('Password reset email sent');
    });
  });
  
  describe('Company Isolation', () => {
    let otherCompanyId: string;
    let otherCompanyToken: string;
    
    beforeAll(async () => {
      // Create another company
      const companyResult = await pool.query(
        `INSERT INTO companies (name, domain, settings) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        ['Other Company', 'other-company.com', JSON.stringify({ features: ['basic'] })]
      );
      otherCompanyId = companyResult.rows[0].id;
      
      // Create user in other company
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await pool.query(
        `INSERT INTO company_users (company_id, email, password, role, name, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [otherCompanyId, 'admin@other-company.com', hashedPassword, 'company_admin', 'Other Admin', true]
      );
      
      // Get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@other-company.com',
          password: 'Password123!'
        });
      otherCompanyToken = loginResponse.body.token;
    });
    
    afterAll(async () => {
      await pool.query('DELETE FROM company_users WHERE company_id = $1', [otherCompanyId]);
      await pool.query('DELETE FROM companies WHERE id = $1', [otherCompanyId]);
    });
    
    it('should isolate data between companies', async () => {
      // Get admin token for first company
      const firstCompanyLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test-company.com',
          password: 'TestPassword123!'
        });
      const firstCompanyToken = firstCompanyLogin.body.token;
      
      // First company should only see its users
      const firstCompanyUsers = await request(app)
        .get('/api/company-users')
        .set('Authorization', `Bearer ${firstCompanyToken}`)
        .expect(200);
      
      // Other company should only see its users
      const otherCompanyUsers = await request(app)
        .get('/api/company-users')
        .set('Authorization', `Bearer ${otherCompanyToken}`)
        .expect(200);
      
      // Verify isolation
      const firstEmails = firstCompanyUsers.body.map((u: any) => u.email);
      const otherEmails = otherCompanyUsers.body.map((u: any) => u.email);
      
      expect(firstEmails).toContain('admin@test-company.com');
      expect(firstEmails).not.toContain('admin@other-company.com');
      
      expect(otherEmails).toContain('admin@other-company.com');
      expect(otherEmails).not.toContain('admin@test-company.com');
    });
  });
});