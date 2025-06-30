/**
 * Controller Decorators
 * 
 * TypeScript decorators for Express controllers with dependency injection
 */

import { Request, Response, NextFunction, Router } from 'express';
import { container, ServiceIdentifier } from '../Container';

/**
 * Route method types
 */
export type RouteMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

/**
 * Middleware function type
 */
export type Middleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/**
 * Route metadata
 */
interface RouteMetadata {
  method: RouteMethod;
  path: string;
  propertyKey: string;
  middleware?: Middleware[];
}

/**
 * Controller metadata
 */
interface ControllerMetadata {
  basePath: string;
  middleware?: Middleware[];
  routes: RouteMetadata[];
}

/**
 * Controller decorator
 */
export function Controller(basePath: string = '', middleware?: Middleware[]): ClassDecorator {
  return (target: any) => {
    const metadata: ControllerMetadata = {
      basePath,
      middleware,
      routes: Reflect.getMetadata('custom:routes', target.prototype) || []
    };
    
    Reflect.defineMetadata('custom:controller', metadata, target);
    return target;
  };
}

/**
 * Route decorator factory
 */
function createRouteDecorator(method: RouteMethod) {
  return (path: string = '', middleware?: Middleware[]): MethodDecorator => {
    return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const routes = Reflect.getMetadata('custom:routes', target) || [];
      
      routes.push({
        method,
        path,
        propertyKey: propertyKey as string,
        middleware
      });
      
      Reflect.defineMetadata('custom:routes', routes, target);
      
      // Wrap the method to handle async errors
      const originalMethod = descriptor.value;
      descriptor.value = async function(req: Request, res: Response, next: NextFunction) {
        try {
          await originalMethod.call(this, req, res, next);
        } catch (error) {
          next(error);
        }
      };
      
      return descriptor;
    };
  };
}

/**
 * HTTP method decorators
 */
export const Get = createRouteDecorator('get');
export const Post = createRouteDecorator('post');
export const Put = createRouteDecorator('put');
export const Patch = createRouteDecorator('patch');
export const Delete = createRouteDecorator('delete');
export const Head = createRouteDecorator('head');
export const Options = createRouteDecorator('options');

/**
 * Parameter decorators
 */
export function Body(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'body' };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

export function Query(property?: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'query', property };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

export function Param(property?: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'param', property };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

export function Headers(property?: string): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'headers', property };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

export function Req(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'request' };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

export function Res(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'response' };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

export function Next(): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingParams = Reflect.getMetadata('custom:params', target, propertyKey!) || [];
    existingParams[parameterIndex] = { type: 'next' };
    Reflect.defineMetadata('custom:params', existingParams, target, propertyKey!);
  };
}

/**
 * Use middleware decorator
 */
export function UseMiddleware(...middleware: Middleware[]): ClassDecorator & MethodDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Method decorator
      const routes = Reflect.getMetadata('custom:routes', target) || [];
      const route = routes.find((r: RouteMetadata) => r.propertyKey === propertyKey);
      if (route) {
        route.middleware = [...(route.middleware || []), ...middleware];
      }
      Reflect.defineMetadata('custom:routes', routes, target);
      return descriptor;
    } else {
      // Class decorator
      const metadata = Reflect.getMetadata('custom:controller', target) || {};
      metadata.middleware = [...(metadata.middleware || []), ...middleware];
      Reflect.defineMetadata('custom:controller', metadata, target);
      return target;
    }
  };
}

/**
 * Create router from controller
 */
export function createRouter(ControllerClass: any): Router {
  const router = Router();
  const metadata: ControllerMetadata = Reflect.getMetadata('custom:controller', ControllerClass);
  
  if (!metadata) {
    throw new Error(`${ControllerClass.name} is not a valid controller`);
  }
  
  // Create controller instance using DI
  const instance = container.resolve(ControllerClass);
  
  // Apply controller-level middleware
  if (metadata.middleware) {
    router.use(...metadata.middleware);
  }
  
  // Register routes
  metadata.routes.forEach(route => {
    const fullPath = route.path;
    const handler = createRouteHandler(instance, route.propertyKey);
    const middleware = route.middleware || [];
    
    (router as any)[route.method](fullPath, ...middleware, handler);
  });
  
  return router;
}

/**
 * Create route handler with parameter injection
 */
function createRouteHandler(instance: any, propertyKey: string): Middleware {
  return async (req: Request, res: Response, next: NextFunction) => {
    const params = Reflect.getMetadata('custom:params', instance, propertyKey) || [];
    const args: any[] = [];
    
    params.forEach((param: any, index: number) => {
      switch (param?.type) {
        case 'body':
          args[index] = req.body;
          break;
        case 'query':
          args[index] = param.property ? req.query[param.property] : req.query;
          break;
        case 'param':
          args[index] = param.property ? req.params[param.property] : req.params;
          break;
        case 'headers':
          args[index] = param.property ? req.headers[param.property] : req.headers;
          break;
        case 'request':
          args[index] = req;
          break;
        case 'response':
          args[index] = res;
          break;
        case 'next':
          args[index] = next;
          break;
        default:
          args[index] = undefined;
      }
    });
    
    // If no parameters were decorated, pass req, res, next
    if (args.length === 0) {
      args.push(req, res, next);
    }
    
    await instance[propertyKey](...args);
  };
}

/**
 * Register all controllers
 */
export function registerControllers(app: any, controllers: any[]): void {
  controllers.forEach(ControllerClass => {
    const metadata: ControllerMetadata = Reflect.getMetadata('custom:controller', ControllerClass);
    if (!metadata) {
      throw new Error(`${ControllerClass.name} is not a valid controller`);
    }
    
    const router = createRouter(ControllerClass);
    app.use(metadata.basePath, router);
    
    console.log(`Registered controller: ${ControllerClass.name} at ${metadata.basePath}`);
  });
}