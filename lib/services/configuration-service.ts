/**
 * Configuration Service
 * 
 * Provides hierarchical configuration management:
 * User Settings > Company Settings > Organization Settings > System Settings
 * 
 * This service replaces all hardcoded values throughout the application
 * with configurable, hierarchical settings that can be customized at
 * different levels of the organization.
 */

import { db } from '@/lib/db';
import { 
  systemSettings, 
  organizationSettings, 
  companySettings, 
  userSettings,
  companyConfigurations,
  type OrganizationSetting,
  type CompanySetting,
  type UserSetting
} from '@/lib/db/actual-schema';
import { eq, and } from 'drizzle-orm';

export interface ConfigurationContext {
  userId?: string;
  companyId?: string;
  organizationId?: string;
}

export type ConfigurationLevel = 'system' | 'organization' | 'company' | 'user';

export interface ConfigurationValue<T = any> {
  value: T;
  level: ConfigurationLevel;
  inheritedFrom: ConfigurationLevel;
  description?: string;
  category?: string;
}

export class ConfigurationService {
  private cache = new Map<string, { value: any; expiry: number }>();
  private cacheTimeout = 300000; // 5 minutes

  /**
   * Get a configuration value with hierarchical fallback
   * Lookup order: User > Company > Organization > System
   */
  async getValue<T = any>(
    key: string, 
    context: ConfigurationContext,
    defaultValue?: T
  ): Promise<ConfigurationValue<T> | null> {
    const cacheKey = `${key}:${context.userId || ''}:${context.companyId || ''}:${context.organizationId || ''}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }

    let result: ConfigurationValue<T> | null = null;

    try {
      // 1. Try user settings first
      if (context.userId) {
        const userSetting = await db
          .select()
          .from(userSettings)
          .where(and(
            eq(userSettings.userId, context.userId),
            eq(userSettings.key, key)
          ))
          .limit(1);

        if (userSetting.length > 0) {
          result = {
            value: userSetting[0].value as T,
            level: 'user',
            inheritedFrom: userSetting[0].inheritedFrom as ConfigurationLevel,
            description: userSetting[0].description || undefined,
            category: userSetting[0].category || undefined
          };
        }
      }

      // 2. Try company settings
      if (!result && context.companyId) {
        const companySetting = await db
          .select()
          .from(companySettings)
          .where(and(
            eq(companySettings.companyId, context.companyId),
            eq(companySettings.key, key)
          ))
          .limit(1);

        if (companySetting.length > 0) {
          result = {
            value: companySetting[0].value as T,
            level: 'company',
            inheritedFrom: companySetting[0].inheritedFrom as ConfigurationLevel,
            description: companySetting[0].description || undefined,
            category: companySetting[0].category || undefined
          };
        }
      }

      // 3. Try organization settings
      if (!result && context.organizationId) {
        const orgSetting = await db
          .select()
          .from(organizationSettings)
          .where(and(
            eq(organizationSettings.organizationId, context.organizationId),
            eq(organizationSettings.key, key)
          ))
          .limit(1);

        if (orgSetting.length > 0) {
          result = {
            value: orgSetting[0].value as T,
            level: 'organization',
            inheritedFrom: orgSetting[0].inheritedFrom as ConfigurationLevel,
            description: orgSetting[0].description || undefined,
            category: orgSetting[0].category || undefined
          };
        }
      }

      // 4. Try system settings
      if (!result) {
        const systemSetting = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, key))
          .limit(1);

        if (systemSetting.length > 0) {
          result = {
            value: systemSetting[0].value as T,
            level: 'system',
            inheritedFrom: 'system',
            description: systemSetting[0].description || undefined,
            category: systemSetting[0].category || undefined
          };
        }
      }

      // 5. Use default value if provided
      if (!result && defaultValue !== undefined) {
        result = {
          value: defaultValue,
          level: 'system',
          inheritedFrom: 'system',
          description: 'Default value',
          category: 'defaults'
        };
      }

      // Cache the result
      if (result) {
        this.cache.set(cacheKey, {
          value: result,
          expiry: Date.now() + this.cacheTimeout
        });
      }

      return result;

    } catch (error) {
      console.error(`ConfigurationService.getValue error for key ${key}:`, error);
      
      // Return default value on error
      if (defaultValue !== undefined) {
        return {
          value: defaultValue,
          level: 'system',
          inheritedFrom: 'system',
          description: 'Fallback default value',
          category: 'defaults'
        };
      }
      
      return null;
    }
  }

  /**
   * Get raw value without metadata (convenience method)
   */
  async getRawValue<T = any>(
    key: string, 
    context: ConfigurationContext,
    defaultValue?: T
  ): Promise<T | null> {
    const result = await this.getValue(key, context, defaultValue);
    return result ? result.value : null;
  }

  /**
   * Common configuration getters with proper typing
   */
  async getFinancialDefaults(context: ConfigurationContext) {
    const [currency, units, supportedCurrencies, supportedUnits] = await Promise.all([
      this.getRawValue<string>('financial.defaultCurrency', context, 'USD'),
      this.getRawValue<string>('financial.defaultUnits', context, 'normal'),
      this.getRawValue<string[]>('financial.supportedCurrencies', context, ['USD', 'EUR', 'GBP', 'ARS']),
      this.getRawValue<string[]>('financial.supportedUnits', context, ['normal', 'thousands', 'millions'])
    ]);

    return {
      defaultCurrency: currency,
      defaultUnits: units,
      supportedCurrencies,
      supportedUnits
    };
  }

  async getPeriodDefaults(context: ConfigurationContext) {
    const [yearMin, yearMax, fiscalYearStart] = await Promise.all([
      this.getRawValue<number>('period.validationYearMin', context, 2000),
      this.getRawValue<number>('period.validationYearMax', context, 2100),
      this.getRawValue<number>('period.defaultFiscalYearStart', context, 1)
    ]);

    return {
      validationYearMin: yearMin,
      validationYearMax: yearMax,
      defaultFiscalYearStart: fiscalYearStart
    };
  }

  async getLocalizationDefaults(context: ConfigurationContext) {
    const [locale, timezone, supportedLocales, language] = await Promise.all([
      this.getRawValue<string>('localization.defaultLocale', context, 'en-US'),
      this.getRawValue<string>('localization.defaultTimezone', context, 'UTC'),
      this.getRawValue<string[]>('localization.supportedLocales', context, ['en-US', 'es-MX']),
      this.getRawValue<string>('ui.defaultLanguage', context, 'en')
    ]);

    return {
      defaultLocale: locale,
      defaultTimezone: timezone,
      supportedLocales,
      defaultLanguage: language
    };
  }

  async getProcessingDefaults(context: ConfigurationContext) {
    const [timeout, maxFileSize, retryAttempts] = await Promise.all([
      this.getRawValue<number>('processing.defaultTimeout', context, 120000),
      this.getRawValue<number>('processing.maxFileSize', context, 52428800),
      this.getRawValue<number>('processing.retryAttempts', context, 3)
    ]);

    return {
      defaultTimeout: timeout,
      maxFileSize,
      retryAttempts
    };
  }

  /**
   * Company Configuration Management Methods
   */
  async getConfigurationsByCompany(companyId: string, type?: 'cashflow' | 'pnl', includeTemplates = false) {
    try {
      let query = db
        .select()
        .from(companyConfigurations)
        .where(eq(companyConfigurations.companyId, companyId));

      if (type) {
        query = query.where(eq(companyConfigurations.type, type));
      }

      const results = await query;
      
      return results.map((config: any) => ({
        ...config,
        isActive: config.isActive,
        configJson: config.configJson
      }));
    } catch (error) {
      console.error('Error fetching configurations by company:', error);
      throw error;
    }
  }

  async createConfiguration(data: any, userId: string) {
    try {
      const result = await db
        .insert(companyConfigurations)
        .values({
          ...data,
          createdBy: userId,
          updatedBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error creating configuration:', error);
      throw error;
    }
  }

  async getConfigurationById(id: string) {
    try {
      const result = await db
        .select()
        .from(companyConfigurations)
        .where(eq(companyConfigurations.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error fetching configuration by ID:', error);
      throw error;
    }
  }

  async updateConfiguration(id: string, data: any, userId: string) {
    try {
      const result = await db
        .update(companyConfigurations)
        .set({
          ...data,
          updatedBy: userId,
          updatedAt: new Date()
        })
        .where(eq(companyConfigurations.id, id))
        .returning();

      return result[0];
    } catch (error) {
      console.error('Error updating configuration:', error);
      throw error;
    }
  }

  async deleteConfiguration(id: string) {
    try {
      await db
        .delete(companyConfigurations)
        .where(eq(companyConfigurations.id, id));

      return true;
    } catch (error) {
      console.error('Error deleting configuration:', error);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const configService = new ConfigurationService();

// Export the same instance with the expected name for API compatibility
export const configurationService = configService;