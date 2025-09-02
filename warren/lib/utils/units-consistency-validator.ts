/**
 * Units Consistency Validator
 * 
 * Comprehensive validation system to ensure units consistency across all dashboard components.
 * Tests Smart Units system integration and validates that all components use the same units.
 */

import { Units } from '../contexts/SmartUnitsContext';

export interface ValidationResult {
  isValid: boolean;
  componentName: string;
  expectedUnits: Units;
  actualUnits: Units;
  value: number;
  formattedValue: string;
  issues: string[];
  score: number; // 0-100
}

export interface ConsistencyReport {
  overallScore: number;
  totalComponents: number;
  passedComponents: number;
  failedComponents: number;
  results: ValidationResult[];
  summary: {
    unitsDistribution: Record<Units, number>;
    commonIssues: string[];
    recommendations: string[];
  };
}

export class UnitsConsistencyValidator {
  private expectedUnits: Units = 'normal';
  private results: ValidationResult[] = [];
  
  /**
   * Set the expected units for validation
   */
  setExpectedUnits(units: Units): void {
    this.expectedUnits = units;
  }

  /**
   * Validate a single component's units
   */
  validateComponent(
    componentName: string,
    value: number,
    formattedValue: string,
    actualUnits: Units,
    additionalContext?: Record<string, any>
  ): ValidationResult {
    const issues: string[] = [];
    let score = 100;

    // Check units consistency
    if (actualUnits !== this.expectedUnits) {
      issues.push(`Units mismatch: expected ${this.expectedUnits}, got ${actualUnits}`);
      score -= 30;
    }

    // Validate formatting consistency
    const formatValidation = this.validateFormatting(value, formattedValue, actualUnits);
    if (!formatValidation.isValid) {
      issues.push(...formatValidation.issues);
      score -= formatValidation.penaltyScore;
    }

    // Check for overflow indicators
    const overflowValidation = this.validateOverflowHandling(formattedValue, additionalContext);
    if (!overflowValidation.isValid) {
      issues.push(...overflowValidation.issues);
      score -= overflowValidation.penaltyScore;
    }

    const result: ValidationResult = {
      isValid: issues.length === 0,
      componentName,
      expectedUnits: this.expectedUnits,
      actualUnits,
      value,
      formattedValue,
      issues,
      score: Math.max(0, score)
    };

    this.results.push(result);
    return result;
  }

  /**
   * Validate formatting logic
   */
  private validateFormatting(
    value: number,
    formattedValue: string,
    units: Units
  ): { isValid: boolean; issues: string[]; penaltyScore: number } {
    const issues: string[] = [];
    let penaltyScore = 0;

    // Check if formatted value contains expected units suffix
    const expectedSuffix = units === 'normal' ? '' : units;
    if (expectedSuffix && !formattedValue.includes(expectedSuffix)) {
      issues.push(`Missing units suffix: expected "${expectedSuffix}" in "${formattedValue}"`);
      penaltyScore += 20;
    }

    // Check for reasonable scaling
    const scaledValue = this.getScaledValue(value, units);
    const numericPart = parseFloat(formattedValue.replace(/[^0-9.-]/g, ''));
    
    if (Math.abs(numericPart - scaledValue) > scaledValue * 0.1) {
      issues.push(`Formatting inconsistency: value ${value} scaled to ${scaledValue} but formatted as ${numericPart}`);
      penaltyScore += 25;
    }

    // Check for proper currency formatting
    if (value !== 0 && !formattedValue.match(/[$€£¥]|USD|EUR|GBP/)) {
      issues.push(`Missing currency indicator in formatted value: "${formattedValue}"`);
      penaltyScore += 10;
    }

    return {
      isValid: issues.length === 0,
      issues,
      penaltyScore
    };
  }

  /**
   * Validate overflow handling
   */
  private validateOverflowHandling(
    formattedValue: string,
    context?: Record<string, any>
  ): { isValid: boolean; issues: string[]; penaltyScore: number } {
    const issues: string[] = [];
    let penaltyScore = 0;

    // Check if value is too long for typical display
    if (formattedValue.length > 15) {
      issues.push(`Formatted value too long for display: "${formattedValue}" (${formattedValue.length} chars)`);
      penaltyScore += 15;
    }

    // Check for scientific notation (should be avoided)
    if (formattedValue.includes('e') || formattedValue.includes('E')) {
      issues.push(`Scientific notation detected: "${formattedValue}"`);
      penaltyScore += 20;
    }

    // Check for overflow indicators from context
    if (context?.isOverflow) {
      issues.push('Component reported overflow condition');
      penaltyScore += 10;
    }

    return {
      isValid: issues.length === 0,
      issues,
      penaltyScore
    };
  }

  /**
   * Get scaled value for units comparison
   */
  private getScaledValue(value: number, units: Units): number {
    switch (units) {
      case 'K': return value / 1000;
      case 'M': return value / 1000000;
      case 'B': return value / 1000000000;
      default: return value;
    }
  }

  /**
   * Generate comprehensive consistency report
   */
  generateReport(): ConsistencyReport {
    const totalComponents = this.results.length;
    const passedComponents = this.results.filter(r => r.isValid).length;
    const failedComponents = totalComponents - passedComponents;
    const overallScore = totalComponents > 0 
      ? this.results.reduce((sum, r) => sum + r.score, 0) / totalComponents 
      : 0;

    // Analyze units distribution
    const unitsDistribution: Record<Units, number> = {
      normal: 0,
      K: 0,
      M: 0,
      B: 0
    };

    this.results.forEach(result => {
      unitsDistribution[result.actualUnits]++;
    });

    // Extract common issues
    const issueFrequency: Record<string, number> = {};
    this.results.forEach(result => {
      result.issues.forEach(issue => {
        const category = this.categorizeIssue(issue);
        issueFrequency[category] = (issueFrequency[category] || 0) + 1;
      });
    });

    const commonIssues = Object.entries(issueFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => `${issue} (${count} components)`);

    // Generate recommendations
    const recommendations = this.generateRecommendations(unitsDistribution, commonIssues);

    return {
      overallScore,
      totalComponents,
      passedComponents,
      failedComponents,
      results: this.results,
      summary: {
        unitsDistribution,
        commonIssues,
        recommendations
      }
    };
  }

  /**
   * Categorize issues for analysis
   */
  private categorizeIssue(issue: string): string {
    if (issue.includes('Units mismatch')) return 'Units inconsistency';
    if (issue.includes('suffix')) return 'Missing units suffix';
    if (issue.includes('too long')) return 'Display overflow';
    if (issue.includes('scientific notation')) return 'Scientific notation';
    if (issue.includes('currency')) return 'Currency formatting';
    if (issue.includes('scaling')) return 'Value scaling error';
    return 'Other formatting issue';
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    unitsDistribution: Record<Units, number>,
    commonIssues: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for units inconsistency
    const unitsVariety = Object.values(unitsDistribution).filter(count => count > 0).length;
    if (unitsVariety > 1) {
      recommendations.push('Ensure all components use the same units from Smart Units Context');
      recommendations.push('Verify SmartDashboardProvider is wrapping all dashboard components');
    }

    // Address common issues
    if (commonIssues.some(issue => issue.includes('Display overflow'))) {
      recommendations.push('Consider using more compact units (K, M, B) for large values');
      recommendations.push('Implement responsive card sizing for different screen sizes');
    }

    if (commonIssues.some(issue => issue.includes('Currency formatting'))) {
      recommendations.push('Ensure all currency values use the unified formatter');
      recommendations.push('Verify currency context is properly passed to all components');
    }

    if (commonIssues.some(issue => issue.includes('Units suffix'))) {
      recommendations.push('Check that all SmartMetricCard components use useDashboardFormatter');
      recommendations.push('Verify unified formatter is correctly applying units suffixes');
    }

    // Performance recommendations
    if (this.results.length > 10 && this.results.filter(r => r.score < 80).length > 2) {
      recommendations.push('Consider implementing component-level memoization for expensive formatting');
      recommendations.push('Review data flow to minimize unnecessary re-formatting');
    }

    return recommendations;
  }

  /**
   * Reset validator for new test run
   */
  reset(): void {
    this.results = [];
  }

  /**
   * Export results for external analysis
   */
  exportResults(): string {
    const report = this.generateReport();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      validationResults: report,
      rawResults: this.results
    }, null, 2);
  }
}

/**
 * Helper function to validate an entire dashboard
 */
export async function validateDashboardConsistency(
  dashboardName: string,
  expectedUnits: Units
): Promise<ConsistencyReport> {
  const validator = new UnitsConsistencyValidator();
  validator.setExpectedUnits(expectedUnits);

  // This would be implemented to scan DOM for SmartMetricCard components
  // and validate their formatting consistency
  
  // In a real implementation, this would:
  // 1. Query all metric card components in the DOM
  // 2. Extract their displayed values and units
  // 3. Validate against expected units
  // 4. Return comprehensive report
  
  return validator.generateReport();
}

/**
 * Real-time validation hook for React components
 */
export function useUnitsValidation(
  componentName: string,
  value: number,
  formattedValue: string,
  actualUnits: Units,
  expectedUnits: Units
) {
  const validator = new UnitsConsistencyValidator();
  validator.setExpectedUnits(expectedUnits);
  
  return validator.validateComponent(componentName, value, formattedValue, actualUnits);
}