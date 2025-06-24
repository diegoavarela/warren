import { BaseProcessor } from './BaseProcessor';
import { ParsedData, ProcessingOptions, ProcessingResult, DataAnalysis, Sheet, Row, Cell } from '../types';
import Papa from 'papaparse';

export class CSVProcessor extends BaseProcessor {
  canProcess(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension === 'csv' || extension === 'tsv';
  }

  async process(file: File, options?: ProcessingOptions): Promise<ProcessingResult> {
    const startTime = Date.now();
    try {
      const text = await this.readFileAsText(file);
      const extension = file.name.split('.').pop()?.toLowerCase();
      const delimiter = extension === 'tsv' ? '\t' : ',';

      return new Promise((resolve) => {
        Papa.parse(text, {
          delimiter,
          header: false,
          dynamicTyping: true,
          skipEmptyLines: !options?.includeEmptyRows,
          complete: (results) => {
            const parsedData = this.convertToStandardFormat(results.data, file, options);
            
            resolve({
              success: true,
              data: parsedData,
              warnings: results.errors.map(e => e.message),
              processingTime: Date.now() - startTime
            });
          },
          error: (error) => {
            resolve({
              success: false,
              error: error.message,
              processingTime: Date.now() - startTime
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  private convertToStandardFormat(data: any[][], file: File, options?: ProcessingOptions): ParsedData {
    const rows: Row[] = [];
    let maxColumns = 0;

    // Process rows
    data.forEach((rowData, rowIndex) => {
      const cells: Cell[] = [];
      maxColumns = Math.max(maxColumns, rowData.length);

      rowData.forEach((cellValue, colIndex) => {
        const cellType = this.detectCellType(cellValue);
        cells.push({
          value: cellValue,
          formattedValue: String(cellValue ?? ''),
          type: cellType,
          column: colIndex,
          row: rowIndex
        });
      });

      rows.push({
        index: rowIndex,
        cells,
        isEmpty: cells.every(cell => cell.type === 'empty')
      });
    });

    // Create columns
    const columns = Array.from({ length: maxColumns }, (_, i) => ({
      index: i,
      letter: this.columnIndexToLetter(i),
      name: options?.detectHeaders && rows.length > 0 ? 
        String(rows[0].cells[i]?.value || `Column ${i + 1}`) : 
        `Column ${i + 1}`
    }));

    // Detect headers if requested
    let headerInfo;
    let dataStartRow = 0;
    
    if (options?.detectHeaders && rows.length > 0) {
      const headerRow = this.detectHeaderRow(rows);
      if (headerRow >= 0) {
        dataStartRow = headerRow + 1;
        rows[headerRow].isHeader = true;
        
        headerInfo = {
          row: headerRow,
          columns: rows[headerRow].cells.map((cell, idx) => ({
            index: idx,
            value: String(cell.value || ''),
            normalizedValue: String(cell.value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          })),
          confidence: 0.8
        };
      }
    }

    const sheet: Sheet = {
      name: 'Sheet1',
      rows,
      columns,
      dataRange: {
        startRow: dataStartRow,
        endRow: rows.length - 1,
        startColumn: 0,
        endColumn: maxColumns - 1,
        totalRows: rows.length,
        totalColumns: maxColumns
      },
      headers: headerInfo
    };

    return {
      sheets: [sheet],
      metadata: {
        ...this.getFileMetadata(file),
        sheets: 1
      }
    };
  }

  private detectHeaderRow(rows: Row[]): number {
    // Simple heuristic: first non-empty row with mostly string values
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const row = rows[i];
      if (row.isEmpty) continue;

      const nonEmptyCells = row.cells.filter(c => c.type !== 'empty');
      const stringCells = nonEmptyCells.filter(c => c.type === 'string');
      
      // If more than 70% of non-empty cells are strings, likely a header
      if (stringCells.length / nonEmptyCells.length > 0.7) {
        return i;
      }
    }
    
    return -1;
  }

  async analyzeData(data: ParsedData): Promise<DataAnalysis> {
    const sheet = data.sheets[0];
    const analysis: DataAnalysis = {
      dateColumns: [],
      currencyColumns: [],
      percentageColumns: [],
      textColumns: [],
      numericColumns: [],
      emptyColumns: [],
      headerRows: [],
      dataStartRow: sheet.headers?.row ? sheet.headers.row + 1 : 0,
      patterns: []
    };

    // Analyze each column
    for (let colIndex = 0; colIndex < sheet.dataRange.totalColumns; colIndex++) {
      const columnData = sheet.rows
        .slice(analysis.dataStartRow)
        .map(row => row.cells[colIndex])
        .filter(cell => cell && cell.type !== 'empty');

      if (columnData.length === 0) {
        analysis.emptyColumns.push(colIndex);
        continue;
      }

      // Count types in this column
      const typeCounts = new Map<string, number>();
      columnData.forEach(cell => {
        const count = typeCounts.get(cell.type) || 0;
        typeCounts.set(cell.type, count + 1);
      });

      // Determine dominant type
      const dominantType = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])[0][0];

      const confidence = (typeCounts.get(dominantType) || 0) / columnData.length;

      switch (dominantType) {
        case 'date':
          analysis.dateColumns.push({
            column: colIndex,
            format: 'auto-detected',
            sampleValues: columnData.slice(0, 5).map(c => String(c.value)),
            confidence
          });
          break;

        case 'currency':
          analysis.currencyColumns.push({
            column: colIndex,
            symbol: this.detectCurrencySymbol(columnData[0].formattedValue || ''),
            format: 'auto-detected',
            sampleValues: columnData.slice(0, 5).map(c => String(c.value)),
            confidence
          });
          break;

        case 'percentage':
          analysis.percentageColumns.push({
            column: colIndex,
            format: 'auto-detected',
            sampleValues: columnData.slice(0, 5).map(c => String(c.value)),
            confidence
          });
          break;

        case 'number':
          const values = columnData.map(c => Number(c.value)).filter(n => !isNaN(n));
          analysis.numericColumns.push({
            column: colIndex,
            hasDecimals: values.some(v => v % 1 !== 0),
            range: {
              min: Math.min(...values),
              max: Math.max(...values)
            },
            confidence
          });
          break;

        case 'string':
          const uniqueValues = new Set(columnData.map(c => String(c.value)));
          analysis.textColumns.push({
            column: colIndex,
            possibleCategories: uniqueValues.size < 20 ? Array.from(uniqueValues) : undefined,
            isIdentifier: uniqueValues.size === columnData.length,
            confidence
          });
          break;
      }
    }

    // Detect patterns
    if (analysis.dateColumns.length > 0) {
      analysis.patterns.push({
        type: 'timeSeries',
        description: 'Time-series data detected',
        affectedColumns: analysis.dateColumns.map(dc => dc.column),
        confidence: 0.9
      });
    }

    return analysis;
  }

  private detectCurrencySymbol(value: string): string {
    const symbols = ['$', '€', '£', '¥', '₹'];
    for (const symbol of symbols) {
      if (value.includes(symbol)) {
        return symbol;
      }
    }
    return '$'; // Default
  }
}