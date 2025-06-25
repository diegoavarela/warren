import { encryptionService } from './encryption';
import { logger } from './logger';

/**
 * Database encryption helper for numeric fields
 * Handles encryption/decryption of financial data
 */
export class DBEncryption {
  // Fields to encrypt in P&L data
  private static readonly PNL_NUMERIC_FIELDS = [
    'revenue', 'costs', 'gross_profit', 'gross_margin',
    'operating_expenses', 'operating_income', 'operating_margin',
    'ebitda', 'ebitda_margin', 'net_income', 'net_margin',
    'total_personnel_cost', 'personnel_salaries_cor', 'payroll_taxes_cor',
    'personnel_salaries_op', 'payroll_taxes_op', 'health_coverage',
    'personnel_benefits', 'contract_services_cor', 'contract_services_op',
    'professional_services', 'sales_marketing', 'facilities_admin'
  ];

  // Fields to encrypt in cashflow data
  private static readonly CASHFLOW_NUMERIC_FIELDS = [
    'income', 'expenses', 'cashflow', 'balance',
    'total_income', 'total_expense', 'final_balance',
    'lowest_balance', 'highest_balance', 'monthly_generation',
    'investment_amount', 'loan_amount', 'tax_amount'
  ];

  // Fields to encrypt in file upload summaries
  private static readonly FILE_UPLOAD_NUMERIC_FIELDS = [
    'records_count', 'months_available'
  ];

  /**
   * Encrypt P&L data before storing in database
   */
  static async encryptPnLData(data: any, companyId: string): Promise<any> {
    try {
      const encrypted = { ...data };
      
      for (const field of this.PNL_NUMERIC_FIELDS) {
        if (field in data && data[field] !== null && data[field] !== undefined) {
          encrypted[`${field}_encrypted`] = await encryptionService.encryptNumber(
            parseFloat(data[field]),
            companyId
          );
          // Store original field as null to maintain schema
          encrypted[field] = null;
        }
      }

      // Add encryption metadata
      encrypted.encryption_version = 1;
      encrypted.encrypted_at = new Date();
      
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt P&L data:', error);
      throw error;
    }
  }

  /**
   * Decrypt P&L data after retrieving from database
   */
  static async decryptPnLData(data: any, companyId: string): Promise<any> {
    try {
      if (!data.encryption_version) {
        // Data is not encrypted, return as-is
        return data;
      }

      const decrypted = { ...data };
      
      for (const field of this.PNL_NUMERIC_FIELDS) {
        const encryptedField = `${field}_encrypted`;
        if (encryptedField in data && data[encryptedField]) {
          decrypted[field] = await encryptionService.decryptNumber(
            data[encryptedField],
            companyId
          );
          delete decrypted[encryptedField];
        }
      }

      // Remove encryption metadata
      delete decrypted.encryption_version;
      delete decrypted.encrypted_at;
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt P&L data:', error);
      throw error;
    }
  }

  /**
   * Encrypt cashflow data before storing
   */
  static async encryptCashflowData(data: any, companyId: string): Promise<any> {
    try {
      const encrypted = { ...data };
      
      for (const field of this.CASHFLOW_NUMERIC_FIELDS) {
        if (field in data && data[field] !== null && data[field] !== undefined) {
          encrypted[`${field}_encrypted`] = await encryptionService.encryptNumber(
            parseFloat(data[field]),
            companyId
          );
          encrypted[field] = null;
        }
      }

      encrypted.encryption_version = 1;
      encrypted.encrypted_at = new Date();
      
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt cashflow data:', error);
      throw error;
    }
  }

  /**
   * Decrypt cashflow data after retrieving
   */
  static async decryptCashflowData(data: any, companyId: string): Promise<any> {
    try {
      if (!data.encryption_version) {
        return data;
      }

      const decrypted = { ...data };
      
      for (const field of this.CASHFLOW_NUMERIC_FIELDS) {
        const encryptedField = `${field}_encrypted`;
        if (encryptedField in data && data[encryptedField]) {
          decrypted[field] = await encryptionService.decryptNumber(
            data[encryptedField],
            companyId
          );
          delete decrypted[encryptedField];
        }
      }

      delete decrypted.encryption_version;
      delete decrypted.encrypted_at;
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt cashflow data:', error);
      throw error;
    }
  }

  /**
   * Encrypt an array of records
   */
  static async encryptRecordArray(
    records: any[],
    companyId: string,
    encryptionType: 'pnl' | 'cashflow'
  ): Promise<any[]> {
    const fields = encryptionType === 'pnl' 
      ? this.PNL_NUMERIC_FIELDS 
      : this.CASHFLOW_NUMERIC_FIELDS;

    const encryptedRecords = [];
    
    for (const record of records) {
      const encryptedRecord = await encryptionService.encryptObject(
        record,
        companyId,
        fields
      );
      encryptedRecord.encryption_version = 1;
      encryptedRecords.push(encryptedRecord);
    }
    
    return encryptedRecords;
  }

  /**
   * Decrypt an array of records
   */
  static async decryptRecordArray(
    records: any[],
    companyId: string,
    encryptionType: 'pnl' | 'cashflow'
  ): Promise<any[]> {
    const fields = encryptionType === 'pnl' 
      ? this.PNL_NUMERIC_FIELDS 
      : this.CASHFLOW_NUMERIC_FIELDS;

    const decryptedRecords = [];
    
    for (const record of records) {
      if (!record.encryption_version) {
        decryptedRecords.push(record);
        continue;
      }
      
      const decryptedRecord = await encryptionService.decryptObject(
        record,
        companyId,
        fields
      );
      delete decryptedRecord.encryption_version;
      decryptedRecords.push(decryptedRecord);
    }
    
    return decryptedRecords;
  }

  /**
   * Prepare SQL query with encrypted field names
   */
  static getEncryptedFieldName(field: string, isEncrypted: boolean = true): string {
    return isEncrypted ? `${field}_encrypted` : field;
  }

  /**
   * Generate SQL CASE statement for encrypted numeric fields
   */
  static generateDecryptSQL(field: string, companyId: string): string {
    // In real implementation, this would use pgcrypto
    // For now, return the encrypted field name
    return `${field}_encrypted as ${field}`;
  }

  /**
   * Check if a field should be encrypted
   */
  static shouldEncryptField(field: string, dataType: 'pnl' | 'cashflow' | 'file_upload'): boolean {
    switch (dataType) {
      case 'pnl':
        return this.PNL_NUMERIC_FIELDS.includes(field);
      case 'cashflow':
        return this.CASHFLOW_NUMERIC_FIELDS.includes(field);
      case 'file_upload':
        return this.FILE_UPLOAD_NUMERIC_FIELDS.includes(field);
      default:
        return false;
    }
  }

  /**
   * Migrate unencrypted data to encrypted format
   */
  static async migrateToEncrypted(
    records: any[],
    companyId: string,
    dataType: 'pnl' | 'cashflow'
  ): Promise<any[]> {
    const migratedRecords = [];
    
    for (const record of records) {
      if (record.encryption_version) {
        // Already encrypted
        migratedRecords.push(record);
        continue;
      }
      
      const encrypted = dataType === 'pnl'
        ? await this.encryptPnLData(record, companyId)
        : await this.encryptCashflowData(record, companyId);
        
      migratedRecords.push(encrypted);
    }
    
    return migratedRecords;
  }

  /**
   * Validate encrypted data integrity
   */
  static async validateEncryptedData(
    encryptedValue: string,
    companyId: string
  ): Promise<boolean> {
    try {
      await encryptionService.decryptString(encryptedValue, companyId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate encryption migration SQL
   */
  static generateEncryptionMigrationSQL(
    tableName: string,
    fields: string[],
    companyIdColumn: string = 'company_id'
  ): string {
    const alterStatements = fields.map(field => 
      `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${field}_encrypted TEXT;`
    ).join('\n');

    const updateStatements = fields.map(field =>
      `UPDATE ${tableName} SET ${field}_encrypted = encode(${field}::text::bytea, 'base64') WHERE ${field} IS NOT NULL;`
    ).join('\n');

    return `
-- Add encrypted columns
${alterStatements}

-- Add encryption metadata
ALTER TABLE ${tableName} 
ADD COLUMN IF NOT EXISTS encryption_version INTEGER,
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing data (placeholder - actual encryption happens in application)
${updateStatements}

-- Add indexes for encrypted fields
${fields.map(field => 
  `CREATE INDEX IF NOT EXISTS idx_${tableName}_${field}_encrypted ON ${tableName}(${field}_encrypted) WHERE ${field}_encrypted IS NOT NULL;`
).join('\n')}
`;
  }
}