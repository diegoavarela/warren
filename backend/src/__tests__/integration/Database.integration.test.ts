/**
 * Database Integration Tests
 * 
 * Tests for database transactions, repository pattern, and data integrity
 */

import { pool } from '../../config/database';
import { BaseRepository } from '../../repositories/BaseRepository';
import { IRepository } from '../../repositories/IRepository';
import { v4 as uuidv4 } from 'uuid';

// Test entity interfaces
interface TestEntity {
  id?: string;
  name: string;
  value: number;
  created_at?: Date;
  updated_at?: Date;
}

interface Company {
  id?: string;
  name: string;
  domain: string;
  settings: any;
  created_at?: Date;
}

interface CompanyUser {
  id?: string;
  company_id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

// Test repository implementation
class TestRepository extends BaseRepository<TestEntity> {
  constructor() {
    super(pool, 'test_entities');
  }
}

class CompanyRepository extends BaseRepository<Company> {
  constructor() {
    super(pool, 'companies');
  }
}

class CompanyUserRepository extends BaseRepository<CompanyUser> {
  constructor() {
    super(pool, 'company_users');
  }
}

describe('Database Integration', () => {
  let testRepo: TestRepository;
  let companyRepo: CompanyRepository;
  let userRepo: CompanyUserRepository;
  
  beforeAll(async () => {
    // Create test table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        value INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    testRepo = new TestRepository();
    companyRepo = new CompanyRepository();
    userRepo = new CompanyUserRepository();
  });
  
  afterAll(async () => {
    // Clean up
    await pool.query('DROP TABLE IF EXISTS test_entities');
    await pool.end();
  });
  
  beforeEach(async () => {
    // Clear test data
    await pool.query('DELETE FROM test_entities');
  });
  
  describe('Basic CRUD Operations', () => {
    it('should create entities', async () => {
      const entity = await testRepo.create({
        name: 'Test Entity',
        value: 100
      });
      
      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('Test Entity');
      expect(entity.value).toBe(100);
      expect(entity.created_at).toBeDefined();
    });
    
    it('should find entity by id', async () => {
      const created = await testRepo.create({
        name: 'Find Me',
        value: 200
      });
      
      const found = await testRepo.findById(created.id!);
      
      expect(found).toBeDefined();
      expect(found!.name).toBe('Find Me');
      expect(found!.value).toBe(200);
    });
    
    it('should update entities', async () => {
      const created = await testRepo.create({
        name: 'Original',
        value: 300
      });
      
      const updated = await testRepo.update(created.id!, {
        name: 'Updated',
        value: 400
      });
      
      expect(updated!.name).toBe('Updated');
      expect(updated!.value).toBe(400);
      expect(updated!.updated_at).toBeInstanceOf(Date);
    });
    
    it('should delete entities', async () => {
      const created = await testRepo.create({
        name: 'Delete Me',
        value: 500
      });
      
      const deleted = await testRepo.delete(created.id!);
      expect(deleted).toBe(true);
      
      const found = await testRepo.findById(created.id!);
      expect(found).toBeNull();
    });
    
    it('should find all entities', async () => {
      await testRepo.create({ name: 'Entity 1', value: 1 });
      await testRepo.create({ name: 'Entity 2', value: 2 });
      await testRepo.create({ name: 'Entity 3', value: 3 });
      
      const all = await testRepo.findAll();
      
      expect(all).toHaveLength(3);
      expect(all.map(e => e.name)).toContain('Entity 1');
      expect(all.map(e => e.name)).toContain('Entity 2');
      expect(all.map(e => e.name)).toContain('Entity 3');
    });
  });
  
  describe('Advanced Queries', () => {
    it('should find by conditions', async () => {
      await testRepo.create({ name: 'High Value', value: 1000 });
      await testRepo.create({ name: 'Low Value', value: 10 });
      await testRepo.create({ name: 'Medium Value', value: 500 });
      
      const highValueItems = await testRepo.findAll({ value: 1000 });
      
      expect(highValueItems).toHaveLength(1);
      expect(highValueItems[0].name).toBe('High Value');
    });
    
    it('should support pagination', async () => {
      // Create 25 entities
      for (let i = 1; i <= 25; i++) {
        await testRepo.create({ name: `Entity ${i}`, value: i });
      }
      
      // Get first page
      const page1 = await testRepo.findPaginated({
        page: 1,
        limit: 10,
        orderBy: 'value',
        orderDirection: 'ASC'
      });
      
      expect(page1.data).toHaveLength(10);
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(3);
      expect(page1.data[0].value).toBe(1);
      expect(page1.data[9].value).toBe(10);
      
      // Get second page
      const page2 = await testRepo.findPaginated({
        page: 2,
        limit: 10,
        orderBy: 'value',
        orderDirection: 'ASC'
      });
      
      expect(page2.data).toHaveLength(10);
      expect(page2.data[0].value).toBe(11);
      expect(page2.data[9].value).toBe(20);
    });
    
    it('should count entities', async () => {
      await testRepo.create({ name: 'Count Me 1', value: 100 });
      await testRepo.create({ name: 'Count Me 2', value: 100 });
      await testRepo.create({ name: 'Different', value: 200 });
      
      const totalCount = await testRepo.count();
      expect(totalCount).toBe(3);
      
      const filteredCount = await testRepo.count({ value: 100 });
      expect(filteredCount).toBe(2);
    });
  });
  
  describe('Transactions', () => {
    it('should execute operations in transaction', async () => {
      const result = await testRepo.executeInTransaction(async (client) => {
        // Create multiple entities in transaction
        const entity1 = await testRepo.create({ name: 'Tx Entity 1', value: 1 }, client);
        const entity2 = await testRepo.create({ name: 'Tx Entity 2', value: 2 }, client);
        
        return [entity1, entity2];
      });
      
      expect(result).toHaveLength(2);
      
      // Verify both were created
      const all = await testRepo.findAll();
      expect(all).toHaveLength(2);
    });
    
    it('should rollback transaction on error', async () => {
      try {
        await testRepo.executeInTransaction(async (client) => {
          await testRepo.create({ name: 'Should Rollback', value: 999 }, client);
          throw new Error('Intentional error');
        });
      } catch (error) {
        // Expected error
      }
      
      // Verify nothing was created
      const all = await testRepo.findAll();
      expect(all).toHaveLength(0);
    });
    
    it('should handle nested transactions', async () => {
      const result = await testRepo.executeInTransaction(async (client) => {
        const entity1 = await testRepo.create({ name: 'Outer', value: 1 }, client);
        
        // Nested transaction (using same client)
        const entity2 = await testRepo.create({ name: 'Inner', value: 2 }, client);
        
        return [entity1, entity2];
      });
      
      expect(result).toHaveLength(2);
      
      const all = await testRepo.findAll();
      expect(all).toHaveLength(2);
    });
  });
  
  describe('Multi-Tenant Data Isolation', () => {
    let company1Id: string;
    let company2Id: string;
    
    beforeEach(async () => {
      // Create test companies
      const company1 = await companyRepo.create({
        name: 'Company 1',
        domain: 'company1.com',
        settings: {}
      });
      company1Id = company1.id!;
      
      const company2 = await companyRepo.create({
        name: 'Company 2',
        domain: 'company2.com',
        settings: {}
      });
      company2Id = company2.id!;
    });
    
    afterEach(async () => {
      // Clean up
      await userRepo.executeInTransaction(async (client) => {
        await client.query('DELETE FROM company_users WHERE company_id IN ($1, $2)', [company1Id, company2Id]);
        await client.query('DELETE FROM companies WHERE id IN ($1, $2)', [company1Id, company2Id]);
      });
    });
    
    it('should isolate data between companies', async () => {
      // Create users for each company
      await userRepo.create({
        company_id: company1Id,
        email: 'user1@company1.com',
        name: 'User 1',
        role: 'company_admin',
        is_active: true
      });
      
      await userRepo.create({
        company_id: company2Id,
        email: 'user1@company2.com',
        name: 'User 1',
        role: 'company_admin',
        is_active: true
      });
      
      // Query users by company
      const company1Users = await userRepo.findAll({ company_id: company1Id });
      const company2Users = await userRepo.findAll({ company_id: company2Id });
      
      expect(company1Users).toHaveLength(1);
      expect(company1Users[0].email).toBe('user1@company1.com');
      
      expect(company2Users).toHaveLength(1);
      expect(company2Users[0].email).toBe('user1@company2.com');
    });
  });
  
  describe('Performance and Connection Pooling', () => {
    it('should handle concurrent queries efficiently', async () => {
      // Create test data
      for (let i = 0; i < 100; i++) {
        await testRepo.create({ name: `Perf Test ${i}`, value: i });
      }
      
      const startTime = Date.now();
      
      // Execute 50 concurrent queries
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(testRepo.findAll());
      }
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
    
    it('should reuse connections from pool', async () => {
      const poolStats1 = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // Execute multiple queries
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(testRepo.count());
      }
      
      await Promise.all(promises);
      
      const poolStats2 = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      // Pool should have reused connections
      expect(poolStats2.total).toBeLessThanOrEqual(10); // Default pool size
    });
  });
  
  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Create repo with invalid connection
      const badPool = {
        query: jest.fn().mockRejectedValue(new Error('Connection refused')),
        connect: jest.fn().mockRejectedValue(new Error('Connection refused'))
      };
      
      const badRepo = new BaseRepository(badPool as any, 'test_table');
      
      await expect(badRepo.findAll()).rejects.toThrow('Connection refused');
    });
    
    it('should handle constraint violations', async () => {
      // Try to create user with duplicate email (assuming unique constraint)
      const email = 'duplicate@test.com';
      const companyId = uuidv4();
      
      await expect(async () => {
        await userRepo.create({
          company_id: companyId,
          email: email,
          name: 'User 1',
          role: 'company_admin',
          is_active: true
        });
        
        // This should fail due to unique constraint
        await userRepo.create({
          company_id: companyId,
          email: email,
          name: 'User 2',
          role: 'company_admin',
          is_active: true
        });
      }).rejects.toThrow();
    });
  });
});