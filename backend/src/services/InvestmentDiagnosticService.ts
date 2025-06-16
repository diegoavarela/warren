import ExcelJS from 'exceljs';
import { logger } from '../utils/logger';

export class InvestmentDiagnosticService {
  /**
   * Diagnose investment data parsing issues
   */
  async diagnoseInvestmentData(worksheet: ExcelJS.Worksheet): Promise<any> {
    const diagnosticResults = {
      rowContents: {} as any,
      columnHeaders: [] as string[],
      investmentValues: [] as any[],
      issues: [] as string[]
    };

    try {
      // Check column headers in row 3
      const dateRow = worksheet.getRow(3);
      for (let col = 2; col <= 16; col++) {
        const value = dateRow.getCell(col).value;
        diagnosticResults.columnHeaders.push(`Col ${col} (${String.fromCharCode(64 + col)}): ${value}`);
        
        if (value === 'Dollars' || (typeof value === 'string' && value.includes('Dollar'))) {
          break;
        }
      }

      // Investment-related rows to check
      const investmentRows = {
        row21: 21,
        row22: 22, 
        row23: 23,
        // Also check nearby rows in case the mapping is off
        row19: 19,
        row20: 20,
        row24: 24,
        row25: 25
      };

      // Check what's in each investment-related row
      for (const [rowName, rowNum] of Object.entries(investmentRows)) {
        const row = worksheet.getRow(rowNum);
        const rowDescription = row.getCell(1).value; // Column A - description
        
        diagnosticResults.rowContents[rowName] = {
          rowNumber: rowNum,
          description: rowDescription,
          values: []
        };

        // Check values in columns 2-16 (Peso section)
        for (let col = 2; col <= 16; col++) {
          const cellValue = row.getCell(col).value;
          const cellType = typeof cellValue;
          
          diagnosticResults.rowContents[rowName].values.push({
            column: col,
            columnLetter: String.fromCharCode(64 + col),
            value: cellValue,
            type: cellType,
            isNumber: typeof cellValue === 'number',
            numberValue: typeof cellValue === 'number' ? cellValue : null
          });

          // For the main investment rows, track the values
          if (rowNum >= 21 && rowNum <= 23 && typeof cellValue === 'number') {
            const dateValue = dateRow.getCell(col).value;
            if (dateValue instanceof Date) {
              diagnosticResults.investmentValues.push({
                row: rowNum,
                column: col,
                date: dateValue,
                value: cellValue
              });
            }
          }
        }
      }

      // Analyze the investment values for issues
      // Check if all values in row 23 (total investment) are the same
      const row23Values = diagnosticResults.rowContents.row23?.values
        .filter((v: any) => v.isNumber)
        .map((v: any) => v.numberValue);
      
      if (row23Values && row23Values.length > 1) {
        const firstValue = row23Values[0];
        const allSame = row23Values.every((v: number) => v === firstValue);
        
        if (allSame) {
          diagnosticResults.issues.push(
            `All investment values in row 23 are the same (${firstValue}). This will result in 0% portfolio change.`
          );
        }
      }

      // Check if row 21 and 22 have any values
      const row21HasValues = diagnosticResults.rowContents.row21?.values.some((v: any) => v.isNumber && v.numberValue !== 0);
      const row22HasValues = diagnosticResults.rowContents.row22?.values.some((v: any) => v.isNumber && v.numberValue !== 0);
      
      if (!row21HasValues && !row22HasValues) {
        diagnosticResults.issues.push('No investment values found in rows 21-22');
      }

      // Log the diagnostic results
      logger.info('Investment Data Diagnostic Results:', JSON.stringify(diagnosticResults, null, 2));

      return diagnosticResults;

    } catch (error) {
      logger.error('Error during investment diagnosis:', error);
      diagnosticResults.issues.push(`Diagnostic error: ${error}`);
      return diagnosticResults;
    }
  }

  /**
   * Find rows containing investment-related keywords
   */
  findInvestmentRows(worksheet: ExcelJS.Worksheet): any[] {
    const investmentKeywords = [
      'investment', 'portfolio', 'stock', 'bond', 'equity', 
      'asset', 'security', 'fund', 'capital', 'wealth'
    ];
    
    const foundRows = [];
    
    // Search through rows 1-150 for investment-related content
    for (let rowNum = 1; rowNum <= 150; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const description = row.getCell(1).value; // Column A
      
      if (description && typeof description === 'string') {
        const lowerDesc = description.toLowerCase();
        
        for (const keyword of investmentKeywords) {
          if (lowerDesc.includes(keyword)) {
            // Get sample values from columns 2-5
            const sampleValues = [];
            for (let col = 2; col <= 5; col++) {
              const value = row.getCell(col).value;
              if (typeof value === 'number') {
                sampleValues.push(value);
              }
            }
            
            foundRows.push({
              rowNumber: rowNum,
              description: description,
              keyword: keyword,
              sampleValues: sampleValues
            });
            break;
          }
        }
      }
    }
    
    return foundRows;
  }
}