import { ClassificationResult } from '@/types/financial';

interface ValidationResult {
  validated: boolean;
  corrections: ValidationCorrection[];
  warnings: ValidationWarning[];
  confidence: number;
  requiresManualReview: boolean;
}

interface ValidationCorrection {
  rowIndex: number;
  field: string;
  originalValue: any;
  correctedValue: any;
  reason: string;
}

interface ValidationWarning {
  rowIndex: number;
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Keywords that indicate total rows
const TOTAL_KEYWORDS = [
  'total', 'subtotal', 'grand total', 'sum', 'aggregate',
  'total general', 'total geral', 'suma', 'totaal', 'gesamt',
  'totale', 'итого', 'σύνολο', '合計', '总计', 'المجموع'
];

// Keywords that indicate section headers
const HEADER_KEYWORDS = [
  'revenue', 'expenses', 'costs', 'income', 'assets', 'liabilities',
  'operating', 'financial', 'administrative', 'sales', 'marketing',
  'ingresos', 'gastos', 'costos', 'receitas', 'despesas', 'custos'
];

// Generic classifications that should be avoided when possible
const GENERIC_CLASSIFICATIONS = [
  'other_revenue', 'other_expense', 'other_income', 'other_cost',
  'miscellaneous', 'various', 'general', 'unspecified'
];

export class AIValidationService {
  private corrections: ValidationCorrection[] = [];
  private warnings: ValidationWarning[] = [];
  private confidenceAdjustment = 0;

  /**
   * Validates and corrects AI classification results
   */
  async validateClassification(
    results: ClassificationResult[],
    context?: {
      documentType?: 'pnl' | 'cashflow';
      language?: string;
      companyIndustry?: string;
    }
  ): Promise<{ results: ClassificationResult[]; validation: ValidationResult }> {
    this.reset();
    
    const validatedResults = [...results];
    
    // Run all validation checks
    for (let i = 0; i < validatedResults.length; i++) {
      const result = validatedResults[i];
      
      // Skip empty rows
      if (this.isEmptyRow(result)) continue;
      
      // Validate total rows
      this.validateTotalRow(result, i);
      
      // Validate section headers
      this.validateSectionHeader(result, i);
      
      // Validate generic classifications
      this.validateGenericClassification(result, i, validatedResults);
      
      // Validate inflow/outflow logic
      this.validateInflowOutflow(result, i, context?.documentType);
      
      // Validate numeric values
      this.validateNumericValues(result, i);
      
      // Validate account hierarchy
      this.validateAccountHierarchy(result, i, validatedResults);
    }
    
    // Apply corrections
    this.corrections.forEach(correction => {
      const result = validatedResults[correction.rowIndex];
      if (result) {
        (result as any)[correction.field] = correction.correctedValue;
      }
    });
    
    // Calculate final confidence
    const averageConfidence = validatedResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validatedResults.length;
    const adjustedConfidence = Math.max(0, Math.min(1, averageConfidence + this.confidenceAdjustment));
    
    // Determine if manual review is needed
    const requiresManualReview = this.shouldRequireManualReview();
    
    return {
      results: validatedResults,
      validation: {
        validated: true,
        corrections: this.corrections,
        warnings: this.warnings,
        confidence: adjustedConfidence,
        requiresManualReview
      }
    };
  }

  /**
   * Validates that rows marked as totals actually contain total keywords
   */
  private validateTotalRow(result: ClassificationResult, index: number): void {
    if (result.isTotal) {
      const accountName = (result.accountName || '').toLowerCase();
      const description = (result.description || '').toLowerCase();
      const combinedText = `${accountName} ${description}`;
      
      const containsTotalKeyword = TOTAL_KEYWORDS.some(keyword => 
        combinedText.includes(keyword.toLowerCase())
      );
      
      if (!containsTotalKeyword) {
        this.addCorrection(index, 'isTotal', true, false, 
          'Row marked as total but does not contain total keywords');
        this.confidenceAdjustment -= 0.05;
      }
    } else {
      // Check if it should be marked as total
      const accountName = (result.accountName || '').toLowerCase();
      const containsTotalKeyword = TOTAL_KEYWORDS.some(keyword => 
        accountName.includes(keyword.toLowerCase())
      );
      
      if (containsTotalKeyword && result.amount) {
        this.addCorrection(index, 'isTotal', false, true, 
          'Row contains total keywords but not marked as total');
        this.confidenceAdjustment -= 0.03;
      }
    }
  }

  /**
   * Validates that section headers don't have numeric values
   */
  private validateSectionHeader(result: ClassificationResult, index: number): void {
    if (result.isHeader) {
      if (result.amount && Math.abs(result.amount) > 0) {
        this.addWarning(index, 'amount', 
          'Section header contains numeric value', 'medium');
        this.addCorrection(index, 'isHeader', true, false, 
          'Headers should not have numeric values');
      }
    } else {
      // Check if it should be marked as header
      const accountName = (result.accountName || '').toLowerCase();
      const hasHeaderKeyword = HEADER_KEYWORDS.some(keyword => 
        accountName === keyword.toLowerCase() || 
        accountName.startsWith(keyword.toLowerCase() + ':')
      );
      
      if (hasHeaderKeyword && !result.amount) {
        this.addCorrection(index, 'isHeader', false, true, 
          'Row appears to be a section header');
      }
    }
  }

  /**
   * Validates and improves generic classifications
   */
  private validateGenericClassification(
    result: ClassificationResult, 
    index: number,
    allResults: ClassificationResult[]
  ): void {
    const classification = result.classification?.toLowerCase() || '';
    
    if (GENERIC_CLASSIFICATIONS.some(generic => classification.includes(generic))) {
      // Try to improve classification based on context
      const improvedClassification = this.improveGenericClassification(result, allResults);
      
      if (improvedClassification && improvedClassification !== result.classification) {
        this.addCorrection(index, 'classification', 
          result.classification, improvedClassification,
          'Improved generic classification based on context');
        this.confidenceAdjustment -= 0.02;
      } else {
        this.addWarning(index, 'classification', 
          'Generic classification used - consider manual review', 'medium');
      }
    }
  }

  /**
   * Validates inflow/outflow logic
   */
  private validateInflowOutflow(
    result: ClassificationResult, 
    index: number,
    documentType?: 'pnl' | 'cashflow'
  ): void {
    if (!result.classification || !result.amount) return;
    
    const classification = result.classification.toLowerCase();
    const amount = result.amount;
    
    // P&L specific validation
    if (documentType === 'pnl') {
      // Revenue should typically be positive
      if (classification.includes('revenue') && amount < 0) {
        this.addWarning(index, 'amount', 
          'Revenue typically should be positive', 'high');
      }
      
      // Expenses should typically be negative or shown as positive (depending on convention)
      if ((classification.includes('expense') || classification.includes('cost')) && 
          result.isInflow) {
        this.addCorrection(index, 'isInflow', true, false,
          'Expenses should be outflows');
      }
    }
    
    // Cash flow specific validation
    if (documentType === 'cashflow') {
      // Operating cash inflows
      if (classification.includes('receipt') || classification.includes('collection')) {
        if (!result.isInflow && amount > 0) {
          this.addCorrection(index, 'isInflow', false, true,
            'Cash receipts should be inflows');
        }
      }
      
      // Operating cash outflows
      if (classification.includes('payment') || classification.includes('disbursement')) {
        if (result.isInflow && amount > 0) {
          this.addCorrection(index, 'isInflow', true, false,
            'Cash payments should be outflows');
        }
      }
    }
  }

  /**
   * Validates numeric values and their consistency
   */
  private validateNumericValues(result: ClassificationResult, index: number): void {
    // Check for suspiciously large values
    if (result.amount && Math.abs(result.amount) > 1e12) {
      this.addWarning(index, 'amount', 
        'Unusually large value detected - possible data entry error', 'high');
    }
    
    // Check for values that might be in wrong units
    if (result.amount && Math.abs(result.amount) < 1 && !result.isPercentage) {
      this.addWarning(index, 'amount', 
        'Very small value - check if units are correct', 'low');
    }
    
    // Validate percentage values
    if (result.isPercentage && result.amount) {
      if (Math.abs(result.amount) > 100) {
        this.addWarning(index, 'amount', 
          'Percentage value exceeds 100%', 'medium');
      }
    }
  }

  /**
   * Validates account hierarchy and relationships
   */
  private validateAccountHierarchy(
    result: ClassificationResult, 
    index: number,
    allResults: ClassificationResult[]
  ): void {
    // Check if sub-accounts sum to parent totals
    if (result.isTotal && result.parentAccount) {
      const subAccounts = allResults.filter(r => 
        r.parentAccount === result.accountCode && 
        !r.isTotal && 
        r.amount !== undefined
      );
      
      if (subAccounts.length > 0) {
        const calculatedTotal = subAccounts.reduce((sum, r) => sum + (r.amount || 0), 0);
        const difference = Math.abs((result.amount || 0) - calculatedTotal);
        
        if (difference > 0.01) { // Allow small rounding differences
          this.addWarning(index, 'amount', 
            `Total does not match sum of sub-accounts (difference: ${difference.toFixed(2)})`, 
            'high');
        }
      }
    }
  }

  /**
   * Attempts to improve generic classifications based on context
   */
  private improveGenericClassification(
    result: ClassificationResult,
    allResults: ClassificationResult[]
  ): string | null {
    const accountName = (result.accountName || '').toLowerCase();
    const description = (result.description || '').toLowerCase();
    
    // Revenue improvements
    if (result.classification?.includes('other_revenue')) {
      if (accountName.includes('service')) return 'service_revenue';
      if (accountName.includes('product')) return 'product_revenue';
      if (accountName.includes('subscription')) return 'subscription_revenue';
      if (accountName.includes('license')) return 'licensing_revenue';
      if (accountName.includes('commission')) return 'commission_revenue';
    }
    
    // Expense improvements
    if (result.classification?.includes('other_expense')) {
      if (accountName.includes('salary') || accountName.includes('wage')) return 'personnel_costs';
      if (accountName.includes('rent') || accountName.includes('lease')) return 'rent_expense';
      if (accountName.includes('utility') || accountName.includes('utilities')) return 'utilities_expense';
      if (accountName.includes('insurance')) return 'insurance_expense';
      if (accountName.includes('legal')) return 'legal_expense';
      if (accountName.includes('consulting')) return 'consulting_expense';
    }
    
    return null;
  }

  /**
   * Determines if manual review should be required
   */
  private shouldRequireManualReview(): boolean {
    const highSeverityWarnings = this.warnings.filter(w => w.severity === 'high').length;
    const totalCorrections = this.corrections.length;
    const criticalCorrections = this.corrections.filter(c => 
      c.field === 'classification' || c.field === 'isInflow'
    ).length;
    
    return highSeverityWarnings > 2 || 
           totalCorrections > 10 || 
           criticalCorrections > 5 ||
           this.confidenceAdjustment < -0.2;
  }

  /**
   * Helper methods
   */
  private isEmptyRow(result: ClassificationResult): boolean {
    return !result.accountName && 
           !result.description && 
           (!result.amount || result.amount === 0);
  }

  private addCorrection(
    rowIndex: number, 
    field: string, 
    originalValue: any, 
    correctedValue: any, 
    reason: string
  ): void {
    this.corrections.push({
      rowIndex,
      field,
      originalValue,
      correctedValue,
      reason
    });
  }

  private addWarning(
    rowIndex: number, 
    field: string, 
    message: string, 
    severity: 'low' | 'medium' | 'high'
  ): void {
    this.warnings.push({
      rowIndex,
      field,
      message,
      severity
    });
  }

  private reset(): void {
    this.corrections = [];
    this.warnings = [];
    this.confidenceAdjustment = 0;
  }
}

// Export singleton instance
export const aiValidation = new AIValidationService();