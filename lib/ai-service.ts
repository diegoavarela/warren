/**
 * AI-Powered Financial Document Analysis Service
 * Uses OpenAI GPT-4 to intelligently analyze and understand Excel financial documents
 */

import OpenAI from 'openai';
import { LocalAccountClassifier } from './local-classifier';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DocumentStructure {
  statementType: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'unknown';
  confidence: number;
  headerRows: number[];
  dataStartRow: number;
  dataEndRow: number;
  totalRows: number[];
  subtotalRows: number[];
  accountColumns: {
    codeColumn?: number;
    nameColumn?: number;
    confidence: number;
  };
  periodColumns: {
    columnIndex: number;
    periodLabel: string;
    periodType: 'month' | 'quarter' | 'year' | 'custom';
    confidence: number;
  }[];
  currency: string;
  fiscalYear?: number;
  reasoning: string;
}

export interface AccountClassification {
  accountName: string;
  suggestedCategory: string;
  isInflow: boolean;
  confidence: number;
  reasoning: string;
  alternativeCategories?: {
    category: string;
    confidence: number;
  }[];
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'suggestion';
  message: string;
  rowIndex?: number;
  columnIndex?: number;
  suggestedFix?: string;
}

export interface MappingSuggestions {
  conceptColumns: {
    columnIndex: number;
    columnType: 'account_code' | 'account_name' | 'category' | 'subcategory';
    confidence: number;
    reasoning: string;
  }[];
  periodColumns: {
    columnIndex: number;
    periodLabel: string;
    periodType: 'month' | 'quarter' | 'year' | 'custom';
    confidence: number;
  }[];
  dataRange: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  validationIssues: ValidationIssue[];
  reasoning: string;
}

export class FinancialAI {
  private model: string = 'gpt-3.5-turbo-16k'; // Using gpt-3.5-turbo-16k for better context and stability
  private fallbackModel: string = 'gpt-3.5-turbo';

  /**
   * Analyze Excel document structure using AI
   */
  async analyzeExcelStructure(rawData: any[][], fileName?: string): Promise<DocumentStructure> {
    try {
      // Prepare data sample for analysis (first 20 rows to avoid token limits)
      const sampleData = rawData.slice(0, 20);
      const dataString = this.formatDataForAI(sampleData);

      const prompt = this.buildStructureAnalysisPrompt(dataString, fileName);
      
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst and accountant with deep knowledge of financial statements, Excel formats, and accounting principles. Analyze the provided Excel data and return structured JSON responses. IMPORTANT: Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent, factual responses
        max_tokens: 2000
      });

      const content = response.choices[0].message.content || '{}';
      const result = this.parseAIResponse(content);
      return this.validateStructureResult(result);

    } catch (error) {
      console.error('AI structure analysis failed:', error);
      return this.fallbackStructureAnalysis(rawData);
    }
  }

  /**
   * Classify accounts using AI with accounting knowledge
   */
  async classifyAccounts(
    accounts: { name: string; rowIndex: number; value?: number | string }[],
    documentContext: {
      statementType: string;
      sampleData?: any[][];
      currency?: string;
    }
  ): Promise<AccountClassification[]> {
    try {
      const prompt = this.buildAccountClassificationPrompt(accounts, documentContext);

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert accountant with knowledge of international accounting standards (GAAP, IFRS) and Latin American accounting practices. Your PRIMARY GOAL is to classify financial accounts into the MOST SPECIFIC category possible. NEVER default to generic categories like "other_revenue" when specific patterns exist. Pay attention to Spanish and English keywords. Expenses/costs are ALWAYS outflows (isInflow: false). Revenues/income are ALWAYS inflows (isInflow: true). IMPORTANT: Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      });

      const content = response.choices[0].message.content || '{}';
      const result = this.parseAIResponse(content);
      return this.validateAccountClassifications(result.classifications || []);

    } catch (error) {
      console.error('AI account classification failed:', error);
      return this.fallbackAccountClassification(accounts, documentContext);
    }
  }

  /**
   * Validate matrix mapping using AI
   */
  async validateMatrixMapping(
    rawData: any[][],
    mapping: any,
    context: { fileName?: string; statementType?: string }
  ): Promise<{
    isValid: boolean;
    issues: ValidationIssue[];
    suggestions: string[];
    confidence: number;
  }> {
    try {
      const sampleData = rawData.slice(0, 30);
      const dataString = this.formatDataForAI(sampleData);
      const mappingString = JSON.stringify(mapping, null, 2);

      const prompt = `
Analyze this financial Excel data and its proposed matrix mapping for accuracy and completeness.

EXCEL DATA:
${dataString}

PROPOSED MAPPING:
${mappingString}

CONTEXT:
- File: ${context.fileName || 'Unknown'}
- Statement Type: ${context.statementType || 'Unknown'}

Please validate the mapping and return a JSON response with:
{
  "isValid": boolean,
  "issues": [
    {
      "type": "error|warning|suggestion",
      "message": "Description of the issue",
      "rowIndex": number (optional),
      "columnIndex": number (optional),
      "suggestedFix": "How to fix it (optional)"
    }
  ],
  "suggestions": ["List of improvement suggestions"],
  "confidence": number (0-100),
  "reasoning": "Explanation of your analysis"
}

Focus on:
1. Are the concept columns correctly identified?
2. Are the period columns properly detected?
3. Is the data range appropriate?
4. Are there any missing or misidentified elements?
5. Does the mapping make sense for the statement type?
`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst. Validate financial data mappings for accuracy and completeness. IMPORTANT: Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const content = response.choices[0].message.content || '{}';
      const result = this.parseAIResponse(content);
      return {
        isValid: result.isValid || false,
        issues: result.issues || [],
        suggestions: result.suggestions || [],
        confidence: result.confidence || 50
      };

    } catch (error) {
      console.error('AI mapping validation failed:', error);
      return {
        isValid: true,
        issues: [],
        suggestions: [],
        confidence: 50
      };
    }
  }

  /**
   * Generate intelligent mapping suggestions
   */
  async generateMappingSuggestions(rawData: any[][], fileName?: string): Promise<MappingSuggestions> {
    try {
      const sampleData = rawData.slice(0, 25);
      const dataString = this.formatDataForAI(sampleData);

      const prompt = `
Analyze this Excel financial data and suggest the optimal matrix mapping.

EXCEL DATA:
${dataString}

FILE: ${fileName || 'Unknown'}

Return a JSON response with intelligent mapping suggestions:
{
  "conceptColumns": [
    {
      "columnIndex": number,
      "columnType": "account_code|account_name|category|subcategory",
      "confidence": number (0-100),
      "reasoning": "Why this column was selected"
    }
  ],
  "periodColumns": [
    {
      "columnIndex": number,
      "periodLabel": "extracted label",
      "periodType": "month|quarter|year|custom",
      "confidence": number (0-100)
    }
  ],
  "dataRange": {
    "startRow": number,
    "endRow": number,
    "startCol": number,
    "endCol": number
  },
  "validationIssues": [
    {
      "type": "error|warning|suggestion",
      "message": "Issue description",
      "suggestedFix": "How to resolve"
    }
  ],
  "reasoning": "Overall explanation of the mapping strategy"
}

Consider:
1. Headers that indicate account codes vs names
2. Date/period patterns in headers
3. Where actual financial data begins and ends
4. Logical structure of the financial statement
`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in financial data analysis and Excel parsing. Provide intelligent mapping suggestions for financial statements. IMPORTANT: Always respond with valid JSON only, no additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2500
      });

      const content = response.choices[0].message.content || '{}';
      const result = this.parseAIResponse(content);
      return this.validateMappingSuggestions(result);

    } catch (error) {
      console.error('AI mapping suggestions failed:', error);
      return this.fallbackMappingSuggestions(rawData);
    }
  }

  // Private helper methods
  private parseAIResponse(content: string): any {
    // Try to extract JSON if it's wrapped in markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonContent = jsonMatch ? jsonMatch[1] : content;
    
    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      // Try cleaning the content
      const cleanedContent = jsonContent
        .replace(/[\n\r\t]/g, ' ')
        .replace(/,\s*}/, '}') // Remove trailing commas
        .replace(/,\s*]/, ']') // Remove trailing commas in arrays
        .trim();
      
      try {
        return JSON.parse(cleanedContent);
      } catch (secondError) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Invalid JSON response from AI');
      }
    }
  }

  private formatDataForAI(data: any[][]): string {
    return data.map((row, rowIndex) => 
      `Row ${rowIndex}: [${row.map(cell => 
        cell === null || cell === undefined ? 'NULL' : 
        typeof cell === 'string' ? `"${cell}"` : 
        String(cell)
      ).join(', ')}]`
    ).join('\n');
  }

  private buildStructureAnalysisPrompt(dataString: string, fileName?: string): string {
    return `
Analyze this Excel financial data and determine its structure.

EXCEL DATA:
${dataString}

FILE: ${fileName || 'Unknown'}

Return a JSON response with this exact structure:
{
  "statementType": "profit_loss|balance_sheet|cash_flow|unknown",
  "confidence": number (0-100),
  "headerRows": [array of row indices that contain headers],
  "dataStartRow": number,
  "dataEndRow": number,
  "totalRows": [array of row indices that contain totals],
  "subtotalRows": [array of row indices that contain subtotals],
  "accountColumns": {
    "codeColumn": number (optional),
    "nameColumn": number (optional),
    "confidence": number (0-100)
  },
  "periodColumns": [
    {
      "columnIndex": number,
      "periodLabel": "extracted label",
      "periodType": "month|quarter|year|custom",
      "confidence": number (0-100)
    }
  ],
  "currency": "USD|MXN|ARS|EUR|COP|CLP|PEN|BRL|etc (use 'ARS' for Argentine Pesos)",
  "fiscalYear": number (optional),
  "reasoning": "Detailed explanation of your analysis"
}

Focus on identifying:
1. What type of financial statement this is
2. Which rows contain headers vs data vs totals
3. Which columns contain account information:
   - IMPORTANT: Look for columns with headers like "Cuenta", "Account", "Concepto" - these are nameColumn
   - Columns with "Descripción", "Description", "Detalle" are usually supplementary, not the main account column
   - Columns with numeric codes (like "4000", "5000") indicate account codes (codeColumn)
4. Which columns contain period/date information
5. Currency and fiscal year if detectable
   - Look for currency symbols ($, €, R$, etc.) and names (pesos, dollars, euros)
   - For Argentine Pesos, return "ARS" not "Arg Pesos"
   - Common mappings: Pesos Argentinos->ARS, Mexican Pesos->MXN, US Dollars->USD
`;
  }

  private buildAccountClassificationPrompt(
    accounts: { name: string; rowIndex: number; value?: number | string }[], 
    context: { statementType: string; currency?: string }
  ): string {
    return `
Classify these financial accounts based on accounting principles, names, and values.

ACCOUNTS WITH VALUES:
${accounts.map((acc, idx) => {
  const valueInfo = acc.value !== undefined && acc.value !== null 
    ? ` | Value: ${acc.value} ${typeof acc.value === 'number' && acc.value < 0 ? '(NEGATIVE - likely expense)' : ''}`
    : '';
  return `${idx + 1}. "${acc.name}"${valueInfo}`;
}).join('\n')}

STATEMENT TYPE: ${context.statementType}
CURRENCY: ${context.currency || 'Unknown'}

Return a JSON response:
{
  "classifications": [
    {
      "accountName": "exact account name",
      "suggestedCategory": "category key",
      "isInflow": boolean,
      "confidence": number (0-100),
      "reasoning": "Why this classification",
      "alternativeCategories": [
        {
          "category": "alternative category",
          "confidence": number
        }
      ]
    }
  ]
}

Available categories for ${context.statementType}:
${this.getCategoryKeysForStatement(context.statementType)}

CRITICAL RULES:
1. NEVER default to "other_revenue" unless it truly doesn't fit any category
2. Look for keywords in Spanish AND English
3. Use context clues:
   - Accounts with "cost", "expense", "gasto", "costo" are ALWAYS outflows (isInflow: false)
   - Accounts with "revenue", "income", "ingreso", "venta" are ALWAYS inflows (isInflow: true)
   - Negative values typically indicate expenses (isInflow: false)
   - Section position matters (expenses usually after revenue)
4. Common patterns:
   - "Sueldos", "Salarios", "Nómina" → salaries_wages
   - "Renta", "Arrendamiento" → rent_utilities
   - "Marketing", "Publicidad" → marketing_advertising
   - "Servicios profesionales", "Consultoría" → professional_services
   - "Ventas", "Ingresos por servicios" → revenue or service_revenue
5. If unsure, use the most specific category that matches keywords
`;
  }

  private getCategoryKeysForStatement(statementType: string): string {
    const categories = {
      profit_loss: [
        'revenue', 'service_revenue', 'other_revenue', 'interest_income',
        'cost_of_sales', 'direct_materials', 'direct_labor', 'manufacturing_overhead',
        'salaries_wages', 'payroll_taxes', 'benefits', 'rent_utilities',
        'marketing_advertising', 'professional_services', 'office_supplies',
        'depreciation', 'insurance', 'travel_entertainment',
        'interest_expense', 'income_tax', 'other_taxes'
      ],
      balance_sheet: [
        'current_assets', 'non_current_assets', 'current_liabilities',
        'non_current_liabilities', 'equity'
      ],
      cash_flow: [
        'cash_from_customers', 'cash_to_suppliers', 'cash_to_employees',
        'interest_paid', 'taxes_paid', 'purchase_ppe', 'sale_ppe',
        'purchase_investments', 'sale_investments', 'proceeds_debt',
        'repayment_debt', 'equity_issued', 'dividends_paid'
      ]
    };

    return JSON.stringify(categories[statementType as keyof typeof categories] || []);
  }

  private validateStructureResult(result: any): DocumentStructure {
    return {
      statementType: result.statementType || 'unknown',
      confidence: Math.min(Math.max(result.confidence || 0, 0), 100),
      headerRows: Array.isArray(result.headerRows) ? result.headerRows : [],
      dataStartRow: result.dataStartRow || 1,
      dataEndRow: result.dataEndRow || 10,
      totalRows: Array.isArray(result.totalRows) ? result.totalRows : [],
      subtotalRows: Array.isArray(result.subtotalRows) ? result.subtotalRows : [],
      accountColumns: {
        codeColumn: result.accountColumns?.codeColumn,
        nameColumn: result.accountColumns?.nameColumn,
        confidence: result.accountColumns?.confidence || 0
      },
      periodColumns: Array.isArray(result.periodColumns) ? result.periodColumns : [],
      currency: result.currency || 'USD',
      fiscalYear: result.fiscalYear,
      reasoning: result.reasoning || 'AI analysis completed'
    };
  }

  private validateAccountClassifications(classifications: any[]): AccountClassification[] {
    return classifications.map(cls => {
      // If AI didn't provide a valid category or defaulted to generic, use local classifier
      const isGenericCategory = !cls.suggestedCategory || 
                               cls.suggestedCategory === 'other_revenue' ||
                               cls.suggestedCategory === 'other' ||
                               cls.confidence < 50;
                               
      if (isGenericCategory) {
        const localResult = LocalAccountClassifier.classifyAccount(
          cls.accountName || '',
          undefined,
          { preferSpecific: true }
        );
        
        // Use local result if it's more specific
        if (localResult.confidence > (cls.confidence || 0) || localResult.suggestedCategory !== 'other') {
          return {
            accountName: cls.accountName || '',
            suggestedCategory: localResult.suggestedCategory,
            isInflow: localResult.isInflow,
            confidence: localResult.confidence,
            reasoning: `${localResult.reasoning} (enhanced by local classifier)`,
            alternativeCategories: cls.alternativeCategories || []
          };
        }
      }
      
      return {
        accountName: cls.accountName || '',
        suggestedCategory: cls.suggestedCategory,
        isInflow: Boolean(cls.isInflow),
        confidence: Math.min(Math.max(cls.confidence || 0, 0), 100),
        reasoning: cls.reasoning || 'AI classification',
        alternativeCategories: cls.alternativeCategories || []
      };
    });
  }

  private validateMappingSuggestions(result: any): MappingSuggestions {
    return {
      conceptColumns: Array.isArray(result.conceptColumns) ? result.conceptColumns : [],
      periodColumns: Array.isArray(result.periodColumns) ? result.periodColumns : [],
      dataRange: result.dataRange || { startRow: 1, endRow: 10, startCol: 0, endCol: 5 },
      validationIssues: Array.isArray(result.validationIssues) ? result.validationIssues : [],
      reasoning: result.reasoning || 'AI mapping analysis'
    };
  }

  // Fallback methods when AI fails
  private fallbackStructureAnalysis(rawData: any[][]): DocumentStructure {
    return {
      statementType: 'unknown',
      confidence: 30,
      headerRows: [0],
      dataStartRow: 1,
      dataEndRow: rawData.length - 1,
      totalRows: [],
      subtotalRows: [],
      accountColumns: { confidence: 30 },
      periodColumns: [],
      currency: 'USD',
      reasoning: 'Fallback analysis - AI service unavailable'
    };
  }

  private fallbackAccountClassification(
    accounts: { name: string; rowIndex: number; value?: number | string }[],
    context: any
  ): AccountClassification[] {
    console.log('Using local classification fallback for', accounts.length, 'accounts');
    
    return accounts.map(acc => {
      const localResult = LocalAccountClassifier.classifyAccount(
        acc.name,
        acc.value, // Now we have values!
        { statementType: context.statementType }
      );
      
      return {
        accountName: acc.name,
        suggestedCategory: localResult.suggestedCategory,
        isInflow: localResult.isInflow,
        confidence: localResult.confidence,
        reasoning: `Local classification: ${localResult.reasoning}`,
        alternativeCategories: []
      };
    });
  }

  private fallbackMappingSuggestions(rawData: any[][]): MappingSuggestions {
    return {
      conceptColumns: [
        { columnIndex: 0, columnType: 'account_name', confidence: 30, reasoning: 'Fallback suggestion' }
      ],
      periodColumns: [],
      dataRange: { startRow: 1, endRow: rawData.length - 1, startCol: 0, endCol: 3 },
      validationIssues: [],
      reasoning: 'Fallback mapping - AI service unavailable'
    };
  }
}

// Singleton instance
export const financialAI = new FinancialAI();