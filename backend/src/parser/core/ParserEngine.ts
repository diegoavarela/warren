/**
 * Core Parser Engine Architecture
 * 
 * This is the heart of our badass parser system - designed to be:
 * - Modular and extensible through plugins
 * - AI-enhanced with confidence scoring
 * - Monetizable through feature tiers
 * - Extremely maintainable and testable
 */

import { 
  ParserResult, 
  ParserConfig, 
  ValidationError,
  FileFormat,
  ParserPlugin,
  ParserContext,
  ConfidenceScore,
  ParserCapabilities,
  IParserEngine,
  ParserEngineMetadata
} from '../../types/parser';

// Re-export for convenience
export { IParserEngine, ParserEngineMetadata };

// IParserEngine interface is imported from types/parser above

// ParserEngineMetadata interface is imported from types/parser above

/**
 * Abstract Base Parser Engine
 * Provides common functionality for all parser engines
 */
export abstract class BaseParserEngine implements IParserEngine {
  abstract readonly format: FileFormat;
  abstract readonly capabilities: ParserCapabilities;
  abstract readonly version: string;
  
  protected plugins: Map<string, ParserPlugin> = new Map();
  protected context: ParserContext | null = null;
  
  /**
   * Register a plugin with the engine
   */
  registerPlugin(plugin: ParserPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin ${plugin.name} is already registered`);
    }
    
    // Validate plugin compatibility
    if (!this.isPluginCompatible(plugin)) {
      throw new Error(`Plugin ${plugin.name} is not compatible with this engine`);
    }
    
    this.plugins.set(plugin.name, plugin);
    plugin.onRegister?.(this);
  }
  
  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.onUnregister?.(this);
      this.plugins.delete(pluginName);
    }
  }
  
  /**
   * Get all registered plugins
   */
  getPlugins(): Map<string, ParserPlugin> {
    return this.plugins;
  }
  
  /**
   * Main parse method - orchestrates the parsing pipeline
   */
  async parse(buffer: Buffer, config: ParserConfig): Promise<ParserResult> {
    // Create parsing context
    this.context = this.createContext(config);
    
    try {
      // Step 1: Validation
      const validationErrors = await this.validate(buffer);
      if (validationErrors.length > 0) {
        throw new ParserValidationError('Validation failed', validationErrors);
      }
      
      // Step 2: Pre-processing (with plugins)
      let processedBuffer = buffer;
      for (const plugin of this.plugins.values()) {
        if (plugin.preProcess) {
          processedBuffer = await plugin.preProcess(processedBuffer, this.context);
        }
      }
      processedBuffer = await this.preProcess(processedBuffer, this.context);
      
      // Step 3: Core parsing
      let result = await this.doParse(processedBuffer, this.context);
      
      // Step 4: Plugin parsing enhancements
      for (const plugin of this.plugins.values()) {
        if (plugin.parse) {
          result = await plugin.parse(result, this.context);
        }
      }
      
      // Step 5: Post-processing (with plugins)
      for (const plugin of this.plugins.values()) {
        if (plugin.postProcess) {
          result = await plugin.postProcess(result, this.context);
        }
      }
      result = await this.postProcess(result, this.context);
      
      // Step 6: Calculate confidence scores
      const confidence = await this.calculateConfidence(result);
      result.confidence = confidence;
      
      // Step 7: Final validation
      this.validateResult(result);
      
      return result;
    } finally {
      // Cleanup context
      this.context = null;
    }
  }
  
  /**
   * Default validation implementation
   */
  async validate(buffer: Buffer): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Check buffer is not empty
    if (!buffer || buffer.length === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'File is empty',
        severity: 'error'
      });
    }
    
    // Check file size limits
    const maxSize = this.capabilities.maxFileSize || 50 * 1024 * 1024; // 50MB default
    if (buffer.length > maxSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${maxSize} bytes`,
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Default pre-processing implementation
   */
  async preProcess(buffer: Buffer, context: ParserContext): Promise<Buffer> {
    // Default implementation just returns the buffer unchanged
    return buffer;
  }
  
  /**
   * Default post-processing implementation
   */
  async postProcess(result: ParserResult, context: ParserContext): Promise<ParserResult> {
    // Add metadata
    result.metadata = {
      ...result.metadata,
      engine: this.getMetadata().name,
      engineVersion: this.version,
      parsedAt: new Date().toISOString(),
      plugins: Array.from(this.getPlugins().values()).map(p => p.name)
    };
    
    return result;
  }
  
  /**
   * Core parsing logic - must be implemented by subclasses
   */
  protected abstract doParse(buffer: Buffer, context: ParserContext): Promise<ParserResult>;
  
  /**
   * Create parsing context
   */
  protected createContext(config: ParserConfig): ParserContext {
    return {
      config,
      startTime: Date.now(),
      metadata: {},
      warnings: [],
      hints: []
    };
  }
  
  /**
   * Check if a plugin is compatible with this engine
   */
  protected isPluginCompatible(plugin: ParserPlugin): boolean {
    // Check format compatibility
    if (plugin.supportedFormats && !plugin.supportedFormats.includes(this.format)) {
      return false;
    }
    
    // Check version compatibility
    if (plugin.requiredEngineVersion) {
      // Simple version check - could be enhanced
      return this.version >= plugin.requiredEngineVersion;
    }
    
    return true;
  }
  
  /**
   * Validate the parsing result
   */
  protected validateResult(result: ParserResult): void {
    if (!result.data || Object.keys(result.data).length === 0) {
      throw new Error('Parser produced empty result');
    }
    
    if (!result.metadata) {
      throw new Error('Parser result missing metadata');
    }
    
    if (!result.confidence) {
      throw new Error('Parser result missing confidence scores');
    }
  }
  
  /**
   * Calculate confidence score for the parsing result
   */
  async calculateConfidence(result: ParserResult): Promise<ConfidenceScore> {
    // Default implementation - can be overridden by specific engines
    let overallScore = 0.8; // Base confidence
    
    // Adjust based on warnings
    if (result.warnings && result.warnings.length > 0) {
      overallScore -= result.warnings.length * 0.05;
    }
    
    // Adjust based on data completeness
    if (result.data) {
      const hasData = Object.keys(result.data).length > 0;
      if (!hasData) {
        overallScore -= 0.2;
      }
    }
    
    return {
      overall: Math.max(0.1, Math.min(1, overallScore)),
      aiEnhanced: this.plugins.has('AIEnhancementPlugin')
    };
  }

  /**
   * Get engine metadata
   */
  abstract getMetadata(): ParserEngineMetadata;

  /**
   * Validate a configuration for this parser
   */
  async validateConfig(config: ParserConfig): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Validate file format matches
    if (config.fileFormat !== this.format) {
      errors.push({
        code: 'INVALID_FORMAT',
        message: `This parser expects ${this.format} but config specifies ${config.fileFormat}`,
        severity: 'error'
      });
    }
    
    return errors;
  }
  
  /**
   * Get supported file formats
   */
  getSupportedFormats(): FileFormat[] {
    return this.capabilities.supportedFormats || [this.format];
  }
  
  /**
   * Get parser capabilities and metadata
   */
  getCapabilities(): ParserCapabilities {
    return this.capabilities;
  }
  
  /**
   * Auto-detect file format from buffer
   */
  async detectFormat(buffer: Buffer, filename?: string): Promise<FileFormat | null> {
    // Default implementation - check by extension
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'xlsx':
        case 'xls':
          return FileFormat.EXCEL;
        case 'csv':
          return FileFormat.CSV;
        case 'pdf':
          return FileFormat.PDF;
      }
    }
    
    // Check by content
    const sample = buffer.slice(0, 8).toString('hex');
    if (sample.startsWith('504b0304')) { // ZIP signature (Excel)
      return FileFormat.EXCEL;
    }
    if (sample.startsWith('25504446')) { // PDF signature
      return FileFormat.PDF;
    }
    
    return null;
  }
  
  /**
   * Generate a suggested configuration based on file analysis
   */
  async suggestConfig(buffer: Buffer, hints?: any): Promise<ParserConfig> {
    return {
      fileFormat: this.format,
      options: {},
      plugins: ['AIEnhancementPlugin']
    };
  }
}

/**
 * Parser Validation Error
 */
export class ParserValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[]
  ) {
    super(message);
    this.name = 'ParserValidationError';
  }
}

/**
 * Parser Engine Factory
 * Creates parser engines based on file format
 */
export class ParserEngineFactory {
  private static engines: Map<FileFormat, new() => IParserEngine> = new Map();
  
  /**
   * Register a parser engine
   */
  static register(format: FileFormat, engineClass: new() => IParserEngine): void {
    this.engines.set(format, engineClass);
  }
  
  /**
   * Create a parser engine for the given format
   */
  static create(format: FileFormat): IParserEngine {
    const EngineClass = this.engines.get(format);
    if (!EngineClass) {
      throw new Error(`No parser engine registered for format: ${format}`);
    }
    
    return new EngineClass();
  }
  
  /**
   * Get all supported formats
   */
  static getSupportedFormats(): FileFormat[] {
    return Array.from(this.engines.keys());
  }
  
  /**
   * Check if a format is supported
   */
  static isFormatSupported(format: FileFormat): boolean {
    return this.engines.has(format);
  }
}