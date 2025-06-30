/**
 * Base Plugin System for Parser
 * 
 * Plugins allow extending the parser with:
 * - Custom data extraction logic
 * - AI enhancement capabilities
 * - Industry-specific rules
 * - Custom validation
 * - Data enrichment
 */

import { 
  ParserPlugin, 
  ParserContext, 
  ParserResult,
  FileFormat,
  PluginCapability,
  PluginMetadata
} from '../../types/parser';
import type { IParserEngine } from '../core/ParserEngine';

/**
 * Abstract base class for all parser plugins
 */
export abstract class BaseParserPlugin implements ParserPlugin {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: PluginCapability[];
  
  protected engine: IParserEngine | null = null;
  protected enabled: boolean = true;
  
  /**
   * Get plugin metadata
   */
  abstract getMetadata(): PluginMetadata;
  
  /**
   * Called when plugin is registered with an engine
   */
  onRegister(engine: IParserEngine): void {
    this.engine = engine;
    this.initialize();
  }
  
  /**
   * Called when plugin is unregistered
   */
  onUnregister(engine: IParserEngine): void {
    this.cleanup();
    this.engine = null;
  }
  
  /**
   * Enable the plugin
   */
  enable(): void {
    this.enabled = true;
  }
  
  /**
   * Disable the plugin
   */
  disable(): void {
    this.enabled = false;
  }
  
  /**
   * Check if plugin is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Initialize plugin (override in subclasses)
   */
  protected initialize(): void {
    // Override in subclasses
  }
  
  /**
   * Cleanup plugin resources (override in subclasses)
   */
  protected cleanup(): void {
    // Override in subclasses
  }
  
  /**
   * Pre-process hook (optional)
   */
  async preProcess?(buffer: Buffer, context: ParserContext): Promise<Buffer> {
    return buffer;
  }
  
  /**
   * Parse hook (optional)
   */
  async parse?(result: ParserResult, context: ParserContext): Promise<ParserResult> {
    return result;
  }
  
  /**
   * Post-process hook (optional)
   */
  async postProcess?(result: ParserResult, context: ParserContext): Promise<ParserResult> {
    return result;
  }
}

/**
 * Plugin Registry
 * Manages all available plugins
 */
export class PluginRegistry {
  private static plugins: Map<string, typeof BaseParserPlugin> = new Map();
  
  /**
   * Register a plugin class
   */
  static register(PluginClass: typeof BaseParserPlugin): void {
    const tempInstance = new (PluginClass as any)();
    const name = tempInstance.name;
    
    if (this.plugins.has(name)) {
      throw new Error(`Plugin ${name} is already registered`);
    }
    
    this.plugins.set(name, PluginClass);
  }
  
  /**
   * Create a plugin instance
   */
  static create(name: string): BaseParserPlugin {
    const PluginClass = this.plugins.get(name);
    
    if (!PluginClass) {
      throw new Error(`Plugin ${name} not found in registry`);
    }
    
    return new (PluginClass as any)();
  }
  
  /**
   * Get all registered plugin names
   */
  static getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }
  
  /**
   * Check if a plugin is registered
   */
  static has(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * Get plugin metadata without creating instance
   */
  static getMetadata(name: string): PluginMetadata | null {
    const PluginClass = this.plugins.get(name);
    
    if (!PluginClass) {
      return null;
    }
    
    const tempInstance = new (PluginClass as any)();
    return tempInstance.getMetadata();
  }
}