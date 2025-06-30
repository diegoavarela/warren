/**
 * Dependency Injection Container
 * 
 * A powerful IoC container that provides:
 * - Constructor and property injection
 * - Singleton and transient lifecycles
 * - Lazy loading
 * - Circular dependency detection
 * - Type-safe injection
 */

import 'reflect-metadata';

/**
 * Service identifier type
 */
export type ServiceIdentifier<T = any> = string | symbol | { new(...args: any[]): T };

/**
 * Service lifecycle
 */
export enum ServiceLifecycle {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

/**
 * Service registration options
 */
export interface ServiceOptions {
  lifecycle?: ServiceLifecycle;
  factory?: () => any;
  value?: any;
  dependencies?: ServiceIdentifier[];
  tags?: string[];
}

/**
 * Service metadata
 */
interface ServiceMetadata {
  identifier: ServiceIdentifier;
  implementation?: any;
  options: ServiceOptions;
  instance?: any;
  creating?: boolean; // For circular dependency detection
}

/**
 * Decorator to mark a class as injectable
 */
export function Injectable(identifier?: ServiceIdentifier): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata('custom:injectable', true, target);
    if (identifier) {
      Reflect.defineMetadata('custom:identifier', identifier, target);
    }
    return target;
  };
}

/**
 * Decorator to inject a dependency into constructor parameter
 */
export function Inject(identifier: ServiceIdentifier): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingTokens = Reflect.getMetadata('custom:inject-tokens', target) || [];
    existingTokens[parameterIndex] = identifier;
    Reflect.defineMetadata('custom:inject-tokens', existingTokens, target);
  };
}

/**
 * Decorator to inject a dependency into property
 */
export function InjectProperty(identifier: ServiceIdentifier): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingProperties = Reflect.getMetadata('custom:inject-properties', target) || [];
    existingProperties.push({ propertyKey, identifier });
    Reflect.defineMetadata('custom:inject-properties', existingProperties, target);
  };
}

/**
 * Decorator to mark a method for post-construction initialization
 */
export function PostConstruct(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('custom:post-construct', propertyKey, target);
    return descriptor;
  };
}

/**
 * Main IoC Container
 */
export class Container {
  private services: Map<ServiceIdentifier, ServiceMetadata> = new Map();
  private scopedInstances: WeakMap<any, Map<ServiceIdentifier, any>> = new WeakMap();
  private parent?: Container;
  
  constructor(parent?: Container) {
    this.parent = parent;
  }
  
  /**
   * Register a service
   */
  register<T>(
    identifier: ServiceIdentifier<T>,
    implementation?: new(...args: any[]) => T,
    options: ServiceOptions = {}
  ): this {
    const metadata: ServiceMetadata = {
      identifier,
      implementation,
      options: {
        lifecycle: ServiceLifecycle.SINGLETON,
        ...options
      }
    };
    
    this.services.set(identifier, metadata);
    return this;
  }
  
  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    identifier: ServiceIdentifier<T>,
    implementation?: new(...args: any[]) => T
  ): this {
    return this.register(identifier, implementation, { 
      lifecycle: ServiceLifecycle.SINGLETON 
    });
  }
  
  /**
   * Register a transient service
   */
  registerTransient<T>(
    identifier: ServiceIdentifier<T>,
    implementation?: new(...args: any[]) => T
  ): this {
    return this.register(identifier, implementation, { 
      lifecycle: ServiceLifecycle.TRANSIENT 
    });
  }
  
  /**
   * Register a scoped service
   */
  registerScoped<T>(
    identifier: ServiceIdentifier<T>,
    implementation?: new(...args: any[]) => T
  ): this {
    return this.register(identifier, implementation, { 
      lifecycle: ServiceLifecycle.SCOPED 
    });
  }
  
  /**
   * Register a factory
   */
  registerFactory<T>(
    identifier: ServiceIdentifier<T>,
    factory: () => T,
    options: ServiceOptions = {}
  ): this {
    return this.register(identifier, undefined, { 
      ...options, 
      factory 
    });
  }
  
  /**
   * Register a value
   */
  registerValue<T>(
    identifier: ServiceIdentifier<T>,
    value: T
  ): this {
    return this.register(identifier, undefined, { 
      value,
      lifecycle: ServiceLifecycle.SINGLETON 
    });
  }
  
  /**
   * Resolve a service
   */
  resolve<T>(identifier: ServiceIdentifier<T>, scope?: any): T {
    const metadata = this.getServiceMetadata(identifier);
    
    if (!metadata) {
      if (this.parent) {
        return this.parent.resolve(identifier, scope);
      }
      throw new Error(`Service not registered: ${this.getIdentifierName(identifier)}`);
    }
    
    // Check for circular dependencies
    if (metadata.creating) {
      throw new Error(`Circular dependency detected: ${this.getIdentifierName(identifier)}`);
    }
    
    switch (metadata.options.lifecycle) {
      case ServiceLifecycle.SINGLETON:
        return this.resolveSingleton(metadata);
      
      case ServiceLifecycle.TRANSIENT:
        return this.resolveTransient(metadata);
      
      case ServiceLifecycle.SCOPED:
        return this.resolveScoped(metadata, scope);
      
      default:
        throw new Error(`Unknown lifecycle: ${metadata.options.lifecycle}`);
    }
  }
  
  /**
   * Resolve all services with a specific tag
   */
  resolveByTag<T>(tag: string): T[] {
    const services: T[] = [];
    
    this.services.forEach((metadata, identifier) => {
      if (metadata.options.tags?.includes(tag)) {
        services.push(this.resolve(identifier));
      }
    });
    
    if (this.parent) {
      services.push(...this.parent.resolveByTag<T>(tag));
    }
    
    return services;
  }
  
  /**
   * Check if a service is registered
   */
  has(identifier: ServiceIdentifier): boolean {
    return this.services.has(identifier) || (this.parent?.has(identifier) ?? false);
  }
  
  /**
   * Create a child container
   */
  createChild(): Container {
    return new Container(this);
  }
  
  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.scopedInstances = new WeakMap();
  }
  
  /**
   * Resolve singleton service
   */
  private resolveSingleton<T>(metadata: ServiceMetadata): T {
    if (metadata.instance) {
      return metadata.instance;
    }
    
    metadata.instance = this.createInstance(metadata);
    return metadata.instance;
  }
  
  /**
   * Resolve transient service
   */
  private resolveTransient<T>(metadata: ServiceMetadata): T {
    return this.createInstance(metadata);
  }
  
  /**
   * Resolve scoped service
   */
  private resolveScoped<T>(metadata: ServiceMetadata, scope: any): T {
    if (!scope) {
      throw new Error('Scope is required for scoped services');
    }
    
    let scopeMap = this.scopedInstances.get(scope);
    if (!scopeMap) {
      scopeMap = new Map();
      this.scopedInstances.set(scope, scopeMap);
    }
    
    let instance = scopeMap.get(metadata.identifier);
    if (!instance) {
      instance = this.createInstance(metadata);
      scopeMap.set(metadata.identifier, instance);
    }
    
    return instance;
  }
  
  /**
   * Create an instance
   */
  private createInstance<T>(metadata: ServiceMetadata): T {
    metadata.creating = true;
    
    try {
      let instance: T;
      
      if (metadata.options.value !== undefined) {
        instance = metadata.options.value;
      } else if (metadata.options.factory) {
        instance = metadata.options.factory();
      } else if (metadata.implementation) {
        instance = this.constructInstance(metadata.implementation);
      } else {
        throw new Error(`No implementation for: ${this.getIdentifierName(metadata.identifier)}`);
      }
      
      // Apply property injection
      this.injectProperties(instance);
      
      // Call post-construct method
      this.callPostConstruct(instance);
      
      return instance;
    } finally {
      metadata.creating = false;
    }
  }
  
  /**
   * Construct an instance with dependency injection
   */
  private constructInstance<T>(constructor: new(...args: any[]) => T): T {
    // Get constructor parameter types
    const paramTypes = Reflect.getMetadata('design:paramtypes', constructor) || [];
    const injectTokens = Reflect.getMetadata('custom:inject-tokens', constructor) || [];
    
    // Resolve dependencies
    const dependencies = paramTypes.map((type: any, index: number) => {
      const token = injectTokens[index] || type;
      
      // Skip primitive types
      if (this.isPrimitive(type)) {
        throw new Error(`Cannot inject primitive type at index ${index} in ${constructor.name}`);
      }
      
      return this.resolve(token);
    });
    
    return new constructor(...dependencies);
  }
  
  /**
   * Inject properties
   */
  private injectProperties(instance: any): void {
    const properties = Reflect.getMetadata('custom:inject-properties', instance) || [];
    
    properties.forEach(({ propertyKey, identifier }: any) => {
      instance[propertyKey] = this.resolve(identifier);
    });
  }
  
  /**
   * Call post-construct method
   */
  private callPostConstruct(instance: any): void {
    const methodName = Reflect.getMetadata('custom:post-construct', instance);
    
    if (methodName && typeof instance[methodName] === 'function') {
      instance[methodName]();
    }
  }
  
  /**
   * Get service metadata
   */
  private getServiceMetadata(identifier: ServiceIdentifier): ServiceMetadata | undefined {
    return this.services.get(identifier);
  }
  
  /**
   * Get identifier name for error messages
   */
  private getIdentifierName(identifier: ServiceIdentifier): string {
    if (typeof identifier === 'string') return identifier;
    if (typeof identifier === 'symbol') return identifier.toString();
    if (typeof identifier === 'function') return identifier.name;
    return String(identifier);
  }
  
  /**
   * Check if type is primitive
   */
  private isPrimitive(type: any): boolean {
    return type === String || 
           type === Number || 
           type === Boolean || 
           type === Object || 
           type === Array ||
           type === undefined;
  }
}

/**
 * Default container instance
 */
export const container = new Container();

/**
 * Service identifiers
 */
export const SERVICES = {
  // Core services
  Logger: Symbol('Logger'),
  Config: Symbol('Config'),
  Database: Symbol('Database'),
  Cache: Symbol('Cache'),
  
  // Parser services
  ParserService: Symbol('ParserService'),
  ExcelParser: Symbol('ExcelParser'),
  PDFParser: Symbol('PDFParser'),
  CSVParser: Symbol('CSVParser'),
  
  // Business services
  CompanyService: Symbol('CompanyService'),
  UserService: Symbol('UserService'),
  FileService: Symbol('FileService'),
  EmailService: Symbol('EmailService'),
  
  // Repositories
  CompanyRepository: Symbol('CompanyRepository'),
  UserRepository: Symbol('UserRepository'),
  FileRepository: Symbol('FileRepository'),
  
  // Middleware
  AuthMiddleware: Symbol('AuthMiddleware'),
  ValidationMiddleware: Symbol('ValidationMiddleware'),
  ErrorMiddleware: Symbol('ErrorMiddleware')
};