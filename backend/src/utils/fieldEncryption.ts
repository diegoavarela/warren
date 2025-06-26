import { encryptionService } from './encryption';
import { logger } from './logger';

/**
 * Enhanced field-level encryption for financial data
 * Provides granular encryption for sensitive financial metrics
 */

// Define sensitive fields by entity type
export const SENSITIVE_FIELDS = {
  pnl: [
    'revenue',
    'grossProfit',
    'operatingIncome',
    'netIncome',
    'ebitda',
    'costs',
    'operatingExpenses',
    'personnelCosts',
    'taxes'
  ],
  cashflow: [
    'openingBalance',
    'closingBalance',
    'totalIncome',
    'totalExpenses',
    'netCashflow',
    'bankBalance',
    'investmentValue',
    'dividends'
  ],
  metrics: [
    'amount',
    'value',
    'balance',
    'total',
    'subtotal'
  ]
};

/**
 * Encrypt financial data with field-level granularity
 */
export async function encryptFinancialData(
  data: any,
  companyId: string,
  entityType: 'pnl' | 'cashflow' | 'metrics'
): Promise<any> {
  try {
    const fieldsToEncrypt = SENSITIVE_FIELDS[entityType] || SENSITIVE_FIELDS.metrics;
    
    if (Array.isArray(data)) {
      // Encrypt each item in array
      return Promise.all(
        data.map(item => encryptionService.encryptObject(item, companyId, fieldsToEncrypt))
      );
    } else {
      // Encrypt single object
      return encryptionService.encryptObject(data, companyId, fieldsToEncrypt);
    }
  } catch (error) {
    logger.error(`Failed to encrypt ${entityType} data:`, error);
    throw new Error(`Encryption failed for ${entityType} data`);
  }
}

/**
 * Decrypt financial data with field-level granularity
 */
export async function decryptFinancialData(
  data: any,
  companyId: string,
  entityType: 'pnl' | 'cashflow' | 'metrics'
): Promise<any> {
  try {
    const fieldsToDecrypt = SENSITIVE_FIELDS[entityType] || SENSITIVE_FIELDS.metrics;
    
    if (Array.isArray(data)) {
      // Decrypt each item in array
      return Promise.all(
        data.map(item => encryptionService.decryptObject(item, companyId, fieldsToDecrypt))
      );
    } else {
      // Decrypt single object
      return encryptionService.decryptObject(data, companyId, fieldsToDecrypt);
    }
  } catch (error) {
    logger.error(`Failed to decrypt ${entityType} data:`, error);
    throw new Error(`Decryption failed for ${entityType} data`);
  }
}

/**
 * Encrypt P&L line items
 */
export async function encryptPnLLineItems(
  lineItems: any[],
  companyId: string
): Promise<any[]> {
  const encryptedItems = [];
  
  for (const item of lineItems) {
    const encrypted = await encryptionService.encryptObject(
      item,
      companyId,
      ['amount', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'q1', 'q2', 'q3', 'q4', 'ytd']
    );
    encryptedItems.push(encrypted);
  }
  
  return encryptedItems;
}

/**
 * Decrypt P&L line items
 */
export async function decryptPnLLineItems(
  lineItems: any[],
  companyId: string
): Promise<any[]> {
  const decryptedItems = [];
  
  for (const item of lineItems) {
    const decrypted = await encryptionService.decryptObject(
      item,
      companyId,
      ['amount', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'q1', 'q2', 'q3', 'q4', 'ytd']
    );
    decryptedItems.push(decrypted);
  }
  
  return decryptedItems;
}

/**
 * Encrypt cashflow transactions
 */
export async function encryptCashflowTransactions(
  transactions: any[],
  companyId: string
): Promise<any[]> {
  const encryptedTransactions = [];
  
  for (const transaction of transactions) {
    const encrypted = await encryptionService.encryptObject(
      transaction,
      companyId,
      ['amount', 'balance', 'income', 'expense', 'openingBalance', 'closingBalance']
    );
    encryptedTransactions.push(encrypted);
  }
  
  return encryptedTransactions;
}

/**
 * Decrypt cashflow transactions
 */
export async function decryptCashflowTransactions(
  transactions: any[],
  companyId: string
): Promise<any[]> {
  const decryptedTransactions = [];
  
  for (const transaction of transactions) {
    const decrypted = await encryptionService.decryptObject(
      transaction,
      companyId,
      ['amount', 'balance', 'income', 'expense', 'openingBalance', 'closingBalance']
    );
    decryptedTransactions.push(decrypted);
  }
  
  return decryptedTransactions;
}

/**
 * Encrypt aggregated metrics
 */
export async function encryptMetrics(
  metrics: Record<string, any>,
  companyId: string
): Promise<Record<string, any>> {
  const encryptedMetrics: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number') {
      encryptedMetrics[`${key}_encrypted`] = await encryptionService.encryptNumber(value, companyId);
    } else if (typeof value === 'object' && value !== null) {
      // Recursively encrypt nested objects
      encryptedMetrics[key] = await encryptMetrics(value, companyId);
    } else {
      encryptedMetrics[key] = value;
    }
  }
  
  return encryptedMetrics;
}

/**
 * Decrypt aggregated metrics
 */
export async function decryptMetrics(
  metrics: Record<string, any>,
  companyId: string
): Promise<Record<string, any>> {
  const decryptedMetrics: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(metrics)) {
    if (key.endsWith('_encrypted') && typeof value === 'string') {
      const originalKey = key.replace('_encrypted', '');
      try {
        decryptedMetrics[originalKey] = await encryptionService.decryptNumber(value, companyId);
      } catch (error) {
        logger.error(`Failed to decrypt metric ${originalKey}:`, error);
        decryptedMetrics[originalKey] = null;
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively decrypt nested objects
      decryptedMetrics[key] = await decryptMetrics(value, companyId);
    } else {
      decryptedMetrics[key] = value;
    }
  }
  
  return decryptedMetrics;
}

/**
 * Check if data needs encryption
 */
export function needsEncryption(data: any): boolean {
  if (!data) return false;
  
  // Check if data contains any numeric financial values
  const hasFinancialData = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === 'number' && 
          (key.includes('amount') || key.includes('balance') || 
           key.includes('revenue') || key.includes('cost') ||
           key.includes('income') || key.includes('expense'))) {
        return true;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (hasFinancialData(obj[key])) return true;
      }
    }
    return false;
  };
  
  return hasFinancialData(data);
}

/**
 * Batch encrypt multiple records
 */
export async function batchEncrypt(
  records: any[],
  companyId: string,
  entityType: 'pnl' | 'cashflow' | 'metrics'
): Promise<any[]> {
  const batchSize = 100; // Process in batches to avoid memory issues
  const results = [];
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const encryptedBatch = await Promise.all(
      batch.map(record => encryptFinancialData(record, companyId, entityType))
    );
    results.push(...encryptedBatch);
  }
  
  return results;
}

/**
 * Batch decrypt multiple records
 */
export async function batchDecrypt(
  records: any[],
  companyId: string,
  entityType: 'pnl' | 'cashflow' | 'metrics'
): Promise<any[]> {
  const batchSize = 100; // Process in batches to avoid memory issues
  const results = [];
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const decryptedBatch = await Promise.all(
      batch.map(record => decryptFinancialData(record, companyId, entityType))
    );
    results.push(...decryptedBatch);
  }
  
  return results;
}