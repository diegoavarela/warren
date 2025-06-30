/**
 * Dependency Injection Container Integration Tests
 * 
 * Tests for the complete DI container with real service dependencies
 */

import { Container } from '../../core/Container';
import { Injectable } from '../../core/decorators';
import { ParserService } from '../../parser/ParserService';
import { FileUploadService } from '../../services/FileUploadService';
import { FinancialDataAggregator } from '../../services/FinancialDataAggregator';
import { ConfigurationServiceDB } from '../../services/ConfigurationServiceDB';
import { EmailService } from '../../services/EmailService';
import { CompanyUserService } from '../../services/CompanyUserService';

// Test interfaces
interface ITestService {
  getName(): string;
}

interface IDependentService {
  getServiceName(): string;
}

// Test implementations
@Injectable()
class TestService implements ITestService {
  getName() {
    return 'TestService';
  }
}

@Injectable()
class DependentService implements IDependentService {
  constructor(private testService: ITestService) {}
  
  getServiceName() {
    return `DependentService using ${this.testService.getName()}`;
  }
}

@Injectable()
class CircularServiceA {
  constructor(public serviceB?: any) {}
}

@Injectable()
class CircularServiceB {
  constructor(public serviceA?: CircularServiceA) {}
}

describe('DI Container Integration', () => {
  let container: Container;
  
  beforeEach(() => {
    container = new Container();
  });
  
  afterEach(() => {
    container.reset();
  });
  
  describe('Basic Registration and Resolution', () => {
    it('should register and resolve simple services', () => {
      container.register<ITestService>('ITestService', TestService);
      
      const instance = container.resolve<ITestService>('ITestService');
      
      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getName()).toBe('TestService');
    });
    
    it('should resolve services with dependencies', () => {
      container.register<ITestService>('ITestService', TestService);
      container.register<IDependentService>('IDependentService', DependentService);
      
      const instance = container.resolve<IDependentService>('IDependentService');
      
      expect(instance).toBeInstanceOf(DependentService);
      expect(instance.getServiceName()).toBe('DependentService using TestService');
    });
    
    it('should support different lifecycles', () => {
      // Singleton
      container.register<ITestService>('SingletonService', TestService, 'singleton');
      const singleton1 = container.resolve<ITestService>('SingletonService');
      const singleton2 = container.resolve<ITestService>('SingletonService');
      expect(singleton1).toBe(singleton2);
      
      // Transient
      container.register<ITestService>('TransientService', TestService, 'transient');
      const transient1 = container.resolve<ITestService>('TransientService');
      const transient2 = container.resolve<ITestService>('TransientService');
      expect(transient1).not.toBe(transient2);
    });
  });
  
  describe('Real Service Integration', () => {
    it('should bootstrap parser service with all dependencies', () => {
      // Register all required services
      container.register('ParserService', ParserService);
      container.register('ConfigurationServiceDB', ConfigurationServiceDB);
      
      const parserService = container.resolve<ParserService>('ParserService');
      
      expect(parserService).toBeInstanceOf(ParserService);
      expect(parserService.getAvailableParsers()).toBeDefined();
      expect(parserService.getAvailablePlugins()).toBeDefined();
    });
    
    it('should bootstrap file upload service', () => {
      container.register('FileUploadService', FileUploadService);
      container.register('ParserService', ParserService);
      container.register('FinancialDataAggregator', FinancialDataAggregator);
      container.register('ConfigurationServiceDB', ConfigurationServiceDB);
      
      const uploadService = container.resolve<FileUploadService>('FileUploadService');
      
      expect(uploadService).toBeInstanceOf(FileUploadService);
    });
    
    it('should handle complex service dependencies', () => {
      // Register all services
      container.register('EmailService', EmailService);
      container.register('CompanyUserService', CompanyUserService);
      container.register('ConfigurationServiceDB', ConfigurationServiceDB);
      
      const userService = container.resolve<CompanyUserService>('CompanyUserService');
      
      expect(userService).toBeInstanceOf(CompanyUserService);
    });
  });
  
  describe('Error Handling', () => {
    it('should throw error for unregistered services', () => {
      expect(() => {
        container.resolve('UnregisteredService');
      }).toThrow('Service UnregisteredService not registered');
    });
    
    it('should detect circular dependencies', () => {
      container.register('CircularServiceA', CircularServiceA);
      container.register('CircularServiceB', CircularServiceB);
      
      expect(() => {
        container.resolve('CircularServiceA');
      }).toThrow(/Circular dependency detected/);
    });
    
    it('should handle missing dependencies gracefully', () => {
      container.register('DependentService', DependentService);
      
      expect(() => {
        container.resolve('DependentService');
      }).toThrow(/Service .* not registered/);
    });
  });
  
  describe('Factory Functions', () => {
    it('should support factory registration', () => {
      let counter = 0;
      
      container.registerFactory<ITestService>('FactoryService', () => {
        counter++;
        return new TestService();
      });
      
      const instance1 = container.resolve<ITestService>('FactoryService');
      const instance2 = container.resolve<ITestService>('FactoryService');
      
      expect(instance1).toBeInstanceOf(TestService);
      expect(instance2).toBeInstanceOf(TestService);
      expect(counter).toBe(2); // Factory called twice
    });
    
    it('should support singleton factories', () => {
      let counter = 0;
      
      container.registerFactory<ITestService>(
        'SingletonFactory',
        () => {
          counter++;
          return new TestService();
        },
        'singleton'
      );
      
      const instance1 = container.resolve<ITestService>('SingletonFactory');
      const instance2 = container.resolve<ITestService>('SingletonFactory');
      
      expect(instance1).toBe(instance2);
      expect(counter).toBe(1); // Factory called once
    });
  });
  
  describe('Scoped Containers', () => {
    it('should create scoped containers', () => {
      container.register<ITestService>('ScopedService', TestService, 'scoped');
      
      const scope1 = container.createScope();
      const scope2 = container.createScope();
      
      const instance1a = scope1.resolve<ITestService>('ScopedService');
      const instance1b = scope1.resolve<ITestService>('ScopedService');
      const instance2 = scope2.resolve<ITestService>('ScopedService');
      
      expect(instance1a).toBe(instance1b); // Same instance in same scope
      expect(instance1a).not.toBe(instance2); // Different instance in different scope
    });
    
    it('should inherit parent registrations', () => {
      container.register<ITestService>('ParentService', TestService);
      
      const scope = container.createScope();
      const instance = scope.resolve<ITestService>('ParentService');
      
      expect(instance).toBeInstanceOf(TestService);
    });
  });
  
  describe('Metadata and Introspection', () => {
    it('should list all registered services', () => {
      container.register('Service1', TestService);
      container.register('Service2', DependentService);
      container.register('Service3', TestService);
      
      const services = container.getRegisteredServices();
      
      expect(services).toContain('Service1');
      expect(services).toContain('Service2');
      expect(services).toContain('Service3');
    });
    
    it('should check if service is registered', () => {
      container.register('TestService', TestService);
      
      expect(container.has('TestService')).toBe(true);
      expect(container.has('UnregisteredService')).toBe(false);
    });
  });
  
  describe('Performance', () => {
    it('should handle many registrations efficiently', () => {
      const startTime = Date.now();
      
      // Register 1000 services
      for (let i = 0; i < 1000; i++) {
        container.register(`Service${i}`, TestService);
      }
      
      const registrationTime = Date.now() - startTime;
      expect(registrationTime).toBeLessThan(100); // Should be fast
      
      // Resolve 1000 services
      const resolveStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        container.resolve(`Service${i}`);
      }
      
      const resolutionTime = Date.now() - resolveStartTime;
      expect(resolutionTime).toBeLessThan(100); // Should be fast
    });
    
    it('should cache singleton instances efficiently', () => {
      container.register('SingletonService', TestService, 'singleton');
      
      const startTime = Date.now();
      
      // Resolve same singleton 10000 times
      for (let i = 0; i < 10000; i++) {
        container.resolve('SingletonService');
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should be very fast due to caching
    });
  });
  
  describe('Thread Safety Simulation', () => {
    it('should handle concurrent resolutions', async () => {
      container.register('ConcurrentService', TestService, 'singleton');
      
      // Simulate concurrent access
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise(resolve => {
            setTimeout(() => {
              const instance = container.resolve('ConcurrentService');
              resolve(instance);
            }, Math.random() * 10);
          })
        );
      }
      
      const instances = await Promise.all(promises);
      
      // All should be the same singleton instance
      const firstInstance = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(firstInstance);
      });
    });
  });
});