/**
 * AI-Powered Financial Document Analysis Service
 * Uses OpenAI GPT-4 to intelligently analyze and understand Excel financial documents
 */

import OpenAI from 'openai';
import { LocalAccountClassifier } from './local-classifier';
import { aiValidation } from './ai-validation';

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

export interface CompleteAnalysisResult {
  structure: DocumentStructure;
  classifications: AccountClassification[];
  validationIssues: ValidationIssue[];
  confidence: number;
  processingTime: number;
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
   * Unified analysis: Structure + Classification in a single AI call
   * This eliminates the redundancy of analyzing the same data twice
   */
  async analyzeExcelComplete(rawData: any[][], fileName?: string): Promise<CompleteAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Prepare data sample for analysis
      const sampleData = rawData.slice(0, 25);
      const dataString = this.formatDataForAI(sampleData);

      const prompt = this.buildCompleteAnalysisPrompt(dataString, fileName);
      
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a CFO with 20+ years of experience analyzing financial statements. You understand both document structure and account classification. You can:
            
1. STRUCTURE ANALYSIS: Identify document type, layout, headers, data ranges, and currency
2. ACCOUNT CLASSIFICATION: Classify accounts into proper categories with inflow/outflow determination

CRITICAL RULES:
- Not every summary line is a "total" - only lines explicitly labeled with "total", "subtotal", "suma"
- Section headers are RARE and usually in ALL CAPS
- Most rows (95%+) are individual accounts, NOT totals or headers
- Account names like "Other Revenue", "Professional Services" are regular accounts, NOT totals
- Expenses/costs are ALWAYS outflows (isInflow: false)
- Revenues/income are ALWAYS inflows (isInflow: true)

IMPORTANT: Always respond with valid JSON only, no additional text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content || '{}';
      const result = this.parseAIResponse(content);
      
      // Validate and structure the results
      const structure = this.validateStructureResult(result.structure || {});
      const initialClassifications = this.validateAccountClassifications(result.classifications || []);
      
      // Apply validation layer to classifications
      const { results: validatedClassifications, validation } = await aiValidation.validateClassification(
        initialClassifications,
        {
          documentType: structure.statementType === 'profit_loss' ? 'pnl' : 
                        structure.statementType === 'cash_flow' ? 'cashflow' : undefined,
          language: this.detectLanguage(initialClassifications.map(c => ({ name: c.accountName })))
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`Complete AI Analysis completed in ${processingTime}ms:
        - Document Type: ${structure.statementType}
        - Accounts Classified: ${validatedClassifications.length}
        - Validation Corrections: ${validation.corrections.length}
        - Overall Confidence: ${(validation.confidence * 100).toFixed(1)}%`);
      
      return {
        structure,
        classifications: validatedClassifications.map(cls => ({
          ...cls,
          validationApplied: true,
          validationCorrections: validation.corrections.filter(c => 
            c.rowIndex === cls.rowIndex
          ).length
        })),
        validationIssues: validation.warnings.map(w => ({
          type: 'warning' as const,
          message: w.message,
          rowIndex: w.rowIndex
        })),
        confidence: Math.round(validation.confidence * 100),
        processingTime
      };

    } catch (error) {
      console.error('Complete AI analysis failed:', error);
      const processingTime = Date.now() - startTime;
      
      // Fallback to separate analysis if unified fails
      const structure = await this.analyzeExcelStructure(rawData, fileName);
      const accounts = this.extractAccountsFromData(rawData, structure);
      const classifications = await this.classifyAccounts(accounts, {
        statementType: structure.statementType,
        sampleData: rawData.slice(0, 25),
        currency: structure.currency
      });
      
      return {
        structure,
        classifications,
        validationIssues: [{
          type: 'warning',
          message: 'Used fallback analysis due to unified analysis failure'
        }],
        confidence: 70,
        processingTime
      };
    }
  }

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
            content: `You are a CFO with 20+ years of experience analyzing financial statements. You understand that:
- Not every summary line is a "total" - only lines explicitly labeled with words like "total", "subtotal", "suma"
- Section headers are RARE in financial statements and usually appear in ALL CAPS or are clearly separated
- Most rows (95%+) in a P&L are individual account items, NOT totals or section headers
- Never assume something is a total unless it EXPLICITLY contains total-related keywords
- Account names like "Other Revenue", "LLC transfers", "Professional Services" are regular accounts, NOT totals
- Just because a row might summarize other accounts doesn't make it a "total" unless labeled as such

Your role is to classify accounts accurately based on their actual names and context, not assumptions.
Pay attention to Spanish and English keywords. 
Expenses/costs are ALWAYS outflows (isInflow: false). 
Revenues/income are ALWAYS inflows (isInflow: true).
IMPORTANT: Always respond with valid JSON only, no additional text.`
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
      const initialClassifications = this.validateAccountClassifications(result.classifications || []);
      
      // Apply validation layer
      const { results: validatedClassifications, validation } = await aiValidation.validateClassification(
        initialClassifications,
        {
          documentType: documentContext.statementType === 'profit_loss' ? 'pnl' : 
                        documentContext.statementType === 'cash_flow' ? 'cashflow' : undefined,
          language: this.detectLanguage(accounts)
        }
      );
      
      // Log validation results
      console.log(`AI Classification Validation:
        - Corrections: ${validation.corrections.length}
        - Warnings: ${validation.warnings.length}
        - Confidence: ${(validation.confidence * 100).toFixed(1)}%
        - Manual Review: ${validation.requiresManualReview}`);
      
      // Add validation metadata to results
      return validatedClassifications.map((cls, idx) => ({
        ...cls,
        validationApplied: true,
        validationCorrections: validation.corrections.filter(c => 
          c.rowIndex === cls.rowIndex
        ).length,
        requiresReview: validation.requiresManualReview && 
          validation.warnings.some(w => w.rowIndex === cls.rowIndex)
      }));

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
  private detectLanguage(accounts: { name: string }[]): 'es' | 'en' {
    // Simple language detection based on account names
    const spanishKeywords = ['ingresos', 'gastos', 'costos', 'ventas', 'utilidad', 'pérdida', 'nómina', 'sueldos'];
    const englishKeywords = ['revenue', 'expenses', 'costs', 'sales', 'profit', 'loss', 'payroll', 'salaries'];
    
    let spanishCount = 0;
    let englishCount = 0;
    
    for (const account of accounts) {
      const lower = account.name.toLowerCase();
      if (spanishKeywords.some(kw => lower.includes(kw))) spanishCount++;
      if (englishKeywords.some(kw => lower.includes(kw))) englishCount++;
    }
    
    return spanishCount > englishCount ? 'es' : 'en';
  }
  
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

  private buildCompleteAnalysisPrompt(dataString: string, fileName?: string): string {
    return `
Perform a complete analysis of this Excel financial data. Analyze BOTH structure and account classification in a single comprehensive response.

EXCEL DATA:
${dataString}

FILE: ${fileName || 'Unknown'}

Return a JSON response with this exact structure:
{
  "structure": {
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
    "currency": "USD|MXN|ARS|EUR|COP|CLP|PEN|BRL|etc",
    "fiscalYear": number (optional),
    "reasoning": "Detailed explanation of structure analysis"
  },
  "classifications": [
    {
      "accountName": "exact account name from data",
      "suggestedCategory": "category key",
      "isInflow": boolean,
      "confidence": number (0-100),
      "reasoning": "Why this classification was chosen",
      "alternativeCategories": [
        {
          "category": "alternative category",
          "confidence": number
        }
      ]
    }
  ]
}

STRUCTURE ANALYSIS FOCUS:
1. Identify document type (P&L, Balance Sheet, Cash Flow)
2. Locate headers, data ranges, totals, and subtotals
3. Identify account code and name columns
4. Detect ALL period/date columns - find consecutive month columns (Jan, Feb, Mar, etc.)
5. Determine currency and fiscal year

CRITICAL PERIOD DETECTION RULES:
- Find ALL consecutive month columns, not just the first one
- Look for patterns like "Jan-25", "Feb-25", "Mar-25", "Apr-25", "May-25"
- Include ALL periods that contain financial data
- Common patterns: "Ene", "Feb", "Mar", "Abr", "May" (Spanish) or "Jan", "Feb", "Mar", "Apr", "May" (English)
- Each period column should be identified separately in the periodColumns array

CLASSIFICATION ANALYSIS FOCUS:
1. Extract ALL account names from the data rows
2. Classify each account into appropriate categories
3. Determine if each account is an inflow (revenue) or outflow (expense)
4. Consider account context and naming patterns

Available categories for classification:
- Revenue: revenue, service_revenue, other_revenue, interest_income
- Costs: cost_of_sales, direct_materials, direct_labor, manufacturing_overhead
- Operating Expenses: salaries_wages, payroll_taxes, benefits, rent_utilities, marketing_advertising, professional_services, office_supplies, depreciation, insurance, travel_entertainment
- Financial: interest_expense, income_tax, other_taxes

CRITICAL RULES:
- Only mark accounts as "totals" if explicitly labeled (containing "total", "subtotal", "suma", etc.)
- Most accounts are individual line items, not totals or headers
- Expenses/costs are always outflows (isInflow: false)
- Revenues/income are always inflows (isInflow: true)
- Use actual account names from the data, don't infer or modify them
`;
  }

  private extractAccountsFromData(rawData: any[][], structure: DocumentStructure): { name: string; rowIndex: number; value?: number | string }[] {
    const accounts = [];
    const nameColumnIndex = structure.accountColumns.nameColumn;
    
    if (nameColumnIndex === undefined) {
      // Try to guess the name column (usually first text column)
      const firstRow = rawData[structure.dataStartRow] || rawData[0] || [];
      const guessedNameColumn = firstRow.findIndex((cell, idx) => 
        typeof cell === 'string' && cell.length > 0 && idx < 3
      );
      
      if (guessedNameColumn >= 0) {
        for (let i = structure.dataStartRow; i <= structure.dataEndRow && i < rawData.length; i++) {
          const row = rawData[i];
          if (row && row[guessedNameColumn]) {
            accounts.push({
              name: String(row[guessedNameColumn]),
              rowIndex: i,
              value: row[guessedNameColumn + 1] // Try to get value from next column
            });
          }
        }
      }
    } else {
      for (let i = structure.dataStartRow; i <= structure.dataEndRow && i < rawData.length; i++) {
        const row = rawData[i];
        if (row && row[nameColumnIndex]) {
          accounts.push({
            name: String(row[nameColumnIndex]),
            rowIndex: i,
            value: structure.periodColumns.length > 0 ? row[structure.periodColumns[0].columnIndex] : undefined
          });
        }
      }
    }
    
    return accounts.filter(acc => acc.name.trim().length > 0);
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
4. Which columns contain period/date information - FIND ALL CONSECUTIVE PERIOD COLUMNS
   - Look for patterns like "Jan-25", "Feb-25", "Mar-25", "Apr-25", "May-25"
   - Include ALL periods that contain financial data
   - Common patterns: "Ene", "Feb", "Mar", "Abr", "May" (Spanish) or "Jan", "Feb", "Mar", "Apr", "May" (English)
   - Each period column should be identified separately in the periodColumns array
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

ACCOUNTS WITH VALUES AND CONTEXT:
${accounts.map((acc, idx) => {
  const valueInfo = acc.value !== undefined && acc.value !== null 
    ? ` | Value: ${acc.value} ${typeof acc.value === 'number' && acc.value < 0 ? '(NEGATIVE - likely expense)' : ''}`
    : '';
  
  let contextInfo = '';
  if ((acc as any).previousRows && (acc as any).previousRows.length > 0) {
    contextInfo += `\n   Previous accounts: ${(acc as any).previousRows.filter((r: any) => r).join(', ')}`;
  }
  if ((acc as any).nextRows && (acc as any).nextRows.length > 0) {
    contextInfo += `\n   Following accounts: ${(acc as any).nextRows.filter((r: any) => r).join(', ')}`;
  }
  
  return `${idx + 1}. "${acc.name}"${valueInfo}${contextInfo}`;
}).join('\n')}

STATEMENT TYPE: ${context.statementType}
CURRENCY: ${context.currency || 'Unknown'}

Return a JSON response:
{
  "classifications": [
    {
      "accountName": "exact account name",
      "rowType": "account|total|section_header", 
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

CRITICAL CLASSIFICATION RULES:

1. ROW TYPE CLASSIFICATION:
   - ONLY mark rowType as "total" if the name EXPLICITLY contains: "total", "subtotal", "suma", "utilidad neta", "utilidad bruta", "gross profit", "net income"
   - ONLY mark rowType as "section_header" if: ALL CAPS with no values, or exactly matches: "INGRESOS", "REVENUE", "GASTOS", "EXPENSES", "COSTOS"
   - DEFAULT rowType is "account" - 95% of rows are regular accounts
   - Examples of regular accounts (NOT totals): "Other Revenue", "LLC transfers", "SRL Services", "Professional Services"

2. CATEGORY CLASSIFICATION:
   - NEVER default to "other_revenue" unless it truly doesn't fit any category
   - Look for keywords in Spanish AND English
   - Common patterns:
     * "Sueldos", "Salarios", "Nómina" → salaries_wages
     * "Renta", "Arrendamiento" → rent_utilities
     * "Marketing", "Publicidad" → marketing_advertising
     * "Servicios profesionales", "Consultoría" → professional_services
     * "Ventas", "Ingresos por servicios" → service_revenue (not generic revenue)
     * "LLC transfers", "Transferencias" → Consider as other_revenue only if truly miscellaneous

3. INFLOW/OUTFLOW RULES:
   - Accounts with "cost", "expense", "gasto", "costo" are ALWAYS outflows (isInflow: false)
   - Accounts with "revenue", "income", "ingreso", "venta" are ALWAYS inflows (isInflow: true)
   - Negative values typically indicate expenses (isInflow: false)

4. DO NOT ASSUME:
   - Just because a row might summarize others doesn't make it a total
   - Not every capitalized row is a section header
   - Use the actual account name, not your interpretation
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
          { statementType: 'profit_loss' }
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