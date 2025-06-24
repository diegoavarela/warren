import { ParsedData, DataAnalysis } from '../fileProcessing/types';

export interface FieldMapping {
  sourceColumn: number;
  sourceColumnName: string;
  targetField: string;
  targetFieldName: string;
  confidence: number;
  transformations?: DataTransformation[];
  alternativeMappings?: AlternativeMapping[];
}

export interface AlternativeMapping {
  targetField: string;
  targetFieldName: string;
  confidence: number;
  reason: string;
}

export interface DataTransformation {
  type: 'currency' | 'date' | 'number' | 'percentage' | 'text';
  from?: string;
  to?: string;
  parameters?: Record<string, any>;
}

export interface MappingSuggestion {
  mappings: FieldMapping[];
  confidence: number;
  warnings?: string[];
  unmappedRequired?: string[];
  additionalSourceColumns?: number[];
}

export interface FinancialFieldDefinition {
  id: string;
  name: string;
  aliases: string[];
  dataType: 'currency' | 'date' | 'number' | 'percentage' | 'text';
  required: boolean;
  description: string;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  type: 'range' | 'format' | 'required' | 'custom';
  parameters: Record<string, any>;
  message: string;
}

export class MappingSuggestionEngine {
  private cashflowFields: FinancialFieldDefinition[] = [
    {
      id: 'date',
      name: 'Date',
      aliases: ['fecha', 'date', 'period', 'periodo', 'month', 'mes', 'año', 'year'],
      dataType: 'date',
      required: true,
      description: 'Transaction or period date'
    },
    {
      id: 'income',
      name: 'Income',
      aliases: ['income', 'ingreso', 'ingresos', 'revenue', 'ventas', 'sales', 'entradas', 'inflow'],
      dataType: 'currency',
      required: true,
      description: 'Total income or revenue'
    },
    {
      id: 'expenses',
      name: 'Expenses',
      aliases: ['expenses', 'gastos', 'egresos', 'costs', 'costos', 'salidas', 'outflow'],
      dataType: 'currency',
      required: true,
      description: 'Total expenses or costs'
    },
    {
      id: 'netCashflow',
      name: 'Net Cashflow',
      aliases: ['net', 'neto', 'balance', 'cashflow', 'flujo', 'resultado', 'profit', 'ganancia'],
      dataType: 'currency',
      required: false,
      description: 'Net cashflow (income - expenses)'
    },
    {
      id: 'cumulativeBalance',
      name: 'Cumulative Balance',
      aliases: ['cumulative', 'acumulado', 'balance', 'saldo', 'total'],
      dataType: 'currency',
      required: false,
      description: 'Running total balance'
    }
  ];

  private pnlFields: FinancialFieldDefinition[] = [
    {
      id: 'date',
      name: 'Date',
      aliases: ['fecha', 'date', 'period', 'periodo', 'month', 'mes'],
      dataType: 'date',
      required: true,
      description: 'Reporting period'
    },
    {
      id: 'revenue',
      name: 'Revenue',
      aliases: ['revenue', 'ingresos', 'ventas', 'sales', 'income', 'facturacion'],
      dataType: 'currency',
      required: true,
      description: 'Total revenue'
    },
    {
      id: 'cogs',
      name: 'Cost of Goods Sold',
      aliases: ['cogs', 'cost of goods', 'costo de ventas', 'cmv', 'cost of sales'],
      dataType: 'currency',
      required: true,
      description: 'Direct costs of producing goods/services'
    },
    {
      id: 'grossProfit',
      name: 'Gross Profit',
      aliases: ['gross profit', 'ganancia bruta', 'utilidad bruta', 'margen bruto'],
      dataType: 'currency',
      required: false,
      description: 'Revenue minus COGS'
    },
    {
      id: 'operatingExpenses',
      name: 'Operating Expenses',
      aliases: ['operating expenses', 'gastos operativos', 'opex', 'gastos', 'expenses'],
      dataType: 'currency',
      required: true,
      description: 'Indirect business expenses'
    },
    {
      id: 'netIncome',
      name: 'Net Income',
      aliases: ['net income', 'utilidad neta', 'ganancia neta', 'profit', 'resultado'],
      dataType: 'currency',
      required: false,
      description: 'Final profit after all expenses'
    }
  ];

  async suggestMappings(
    data: ParsedData,
    analysis: DataAnalysis,
    targetType: 'cashflow' | 'pnl'
  ): Promise<MappingSuggestion> {
    const targetFields = targetType === 'cashflow' ? this.cashflowFields : this.pnlFields;
    const sheet = data.sheets[0]; // For now, use first sheet
    const mappings: FieldMapping[] = [];
    const unmappedRequired: string[] = [];

    // Map each required field
    for (const field of targetFields) {
      const mapping = this.findBestMapping(sheet, analysis, field);
      
      if (mapping) {
        mappings.push(mapping);
      } else if (field.required) {
        unmappedRequired.push(field.name);
      }
    }

    // Calculate overall confidence
    const requiredMappings = mappings.filter(m => 
      targetFields.find(f => f.id === m.targetField)?.required
    );
    const confidence = requiredMappings.length > 0
      ? requiredMappings.reduce((sum, m) => sum + m.confidence, 0) / requiredMappings.length
      : 0;

    // Find additional source columns that weren't mapped
    const mappedColumns = new Set(mappings.map(m => m.sourceColumn));
    const additionalSourceColumns = Array.from({ length: sheet.dataRange.totalColumns })
      .map((_, i) => i)
      .filter(i => !mappedColumns.has(i) && !analysis.emptyColumns.includes(i));

    return {
      mappings,
      confidence,
      unmappedRequired: unmappedRequired.length > 0 ? unmappedRequired : undefined,
      additionalSourceColumns: additionalSourceColumns.length > 0 ? additionalSourceColumns : undefined,
      warnings: this.generateWarnings(mappings, analysis)
    };
  }

  private findBestMapping(
    sheet: Sheet,
    analysis: DataAnalysis,
    field: FinancialFieldDefinition
  ): FieldMapping | null {
    const candidates: Array<{
      column: number;
      score: number;
      reason: string;
    }> = [];

    // Check column headers if available
    if (sheet.headers) {
      sheet.headers.columns.forEach((header, index) => {
        const headerScore = this.calculateHeaderSimilarity(header, field);
        if (headerScore > 0.3) {
          candidates.push({
            column: index,
            score: headerScore,
            reason: 'header_match'
          });
        }
      });
    }

    // Check data type compatibility
    switch (field.dataType) {
      case 'date':
        analysis.dateColumns.forEach(col => {
          const existing = candidates.find(c => c.column === col.column);
          const score = col.confidence * 0.8;
          if (existing) {
            existing.score = Math.max(existing.score, score);
          } else {
            candidates.push({
              column: col.column,
              score,
              reason: 'data_type_match'
            });
          }
        });
        break;

      case 'currency':
        [...analysis.currencyColumns, ...analysis.numericColumns].forEach(col => {
          const existing = candidates.find(c => c.column === col.column);
          const score = col.confidence * 0.7;
          if (existing) {
            existing.score = Math.max(existing.score, score);
          } else {
            candidates.push({
              column: col.column,
              score,
              reason: 'data_type_match'
            });
          }
        });
        break;

      case 'percentage':
        analysis.percentageColumns.forEach(col => {
          const existing = candidates.find(c => c.column === col.column);
          const score = col.confidence * 0.8;
          if (existing) {
            existing.score = Math.max(existing.score, score);
          } else {
            candidates.push({
              column: col.column,
              score,
              reason: 'data_type_match'
            });
          }
        });
        break;
    }

    // Sort by score and pick the best
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) {
      return null;
    }

    const best = candidates[0];
    const columnName = sheet.headers?.columns[best.column]?.value || 
                      sheet.columns[best.column]?.name || 
                      `Column ${best.column + 1}`;

    // Find alternatives
    const alternatives = candidates.slice(1, 4)
      .filter(c => c.score > 0.3)
      .map(c => ({
        targetField: field.id,
        targetFieldName: field.name,
        confidence: c.score,
        reason: c.reason
      }));

    return {
      sourceColumn: best.column,
      sourceColumnName: columnName,
      targetField: field.id,
      targetFieldName: field.name,
      confidence: best.score,
      alternativeMappings: alternatives.length > 0 ? alternatives : undefined,
      transformations: this.getRequiredTransformations(sheet, analysis, best.column, field)
    };
  }

  private calculateHeaderSimilarity(
    header: { value: string; normalizedValue: string },
    field: FinancialFieldDefinition
  ): number {
    const headerLower = header.normalizedValue;
    
    // Exact match
    if (field.aliases.some(alias => alias.toLowerCase().replace(/[^a-z0-9]/g, '') === headerLower)) {
      return 1.0;
    }

    // Partial match
    const partialMatches = field.aliases.filter(alias => {
      const aliasNorm = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      return headerLower.includes(aliasNorm) || aliasNorm.includes(headerLower);
    });

    if (partialMatches.length > 0) {
      return 0.7;
    }

    // Fuzzy match (simple Levenshtein distance)
    const minDistance = Math.min(...field.aliases.map(alias => 
      this.levenshteinDistance(headerLower, alias.toLowerCase().replace(/[^a-z0-9]/g, ''))
    ));

    if (minDistance <= 2) {
      return 0.5;
    }

    return 0;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  private getRequiredTransformations(
    sheet: Sheet,
    analysis: DataAnalysis,
    column: number,
    field: FinancialFieldDefinition
  ): DataTransformation[] | undefined {
    const transformations: DataTransformation[] = [];

    // Add transformations based on field type and column analysis
    if (field.dataType === 'currency') {
      const currencyCol = analysis.currencyColumns.find(c => c.column === column);
      if (currencyCol) {
        transformations.push({
          type: 'currency',
          from: currencyCol.symbol,
          to: 'USD', // Default target currency
          parameters: { format: currencyCol.format }
        });
      }
    }

    if (field.dataType === 'date') {
      const dateCol = analysis.dateColumns.find(c => c.column === column);
      if (dateCol) {
        transformations.push({
          type: 'date',
          from: dateCol.format,
          to: 'YYYY-MM-DD',
          parameters: { format: dateCol.format }
        });
      }
    }

    return transformations.length > 0 ? transformations : undefined;
  }

  private generateWarnings(mappings: FieldMapping[], analysis: DataAnalysis): string[] {
    const warnings: string[] = [];

    // Check for low confidence mappings
    const lowConfidence = mappings.filter(m => m.confidence < 0.5);
    if (lowConfidence.length > 0) {
      warnings.push(`${lowConfidence.length} field(s) have low confidence mappings. Please review.`);
    }

    // Check for missing date column
    if (!mappings.some(m => m.targetField === 'date')) {
      warnings.push('No date column detected. Time-series analysis may be limited.');
    }

    // Check for calculated fields
    const hasIncome = mappings.some(m => m.targetField === 'income' || m.targetField === 'revenue');
    const hasExpenses = mappings.some(m => m.targetField === 'expenses' || m.targetField === 'cogs');
    const hasNet = mappings.some(m => m.targetField === 'netCashflow' || m.targetField === 'netIncome');

    if (hasIncome && hasExpenses && !hasNet) {
      warnings.push('Net amount will be calculated from income and expenses.');
    }

    return warnings;
  }
}