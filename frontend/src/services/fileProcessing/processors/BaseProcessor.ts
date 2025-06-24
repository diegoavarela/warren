import { ParsedData, ProcessingOptions, ProcessingResult, DataAnalysis } from '../types';

export abstract class BaseProcessor {
  abstract canProcess(file: File): boolean;
  abstract process(file: File, options?: ProcessingOptions): Promise<ProcessingResult>;
  
  protected async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  protected async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  protected async readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  protected getFileMetadata(file: File) {
    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      extension: file.name.split('.').pop()?.toLowerCase() || '',
      modifiedDate: new Date(file.lastModified)
    };
  }

  protected columnIndexToLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode(65 + (index % 26)) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  protected detectCellType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage' | 'empty' {
    if (value === null || value === undefined || value === '') {
      return 'empty';
    }

    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (typeof value === 'number') {
      return 'number';
    }

    if (value instanceof Date) {
      return 'date';
    }

    const strValue = String(value).trim();

    // Check for percentage
    if (/^\d+\.?\d*%$/.test(strValue)) {
      return 'percentage';
    }

    // Check for currency
    if (/^[$€£¥₹]\s*\d+/.test(strValue) || /\d+\s*[$€£¥₹]$/.test(strValue)) {
      return 'currency';
    }

    // Check for date patterns
    if (this.isDateString(strValue)) {
      return 'date';
    }

    // Check if it's a number string
    if (/^-?\d+\.?\d*$/.test(strValue.replace(/,/g, ''))) {
      return 'number';
    }

    return 'string';
  }

  protected isDateString(value: string): boolean {
    const datePatterns = [
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,  // MM/DD/YYYY or DD/MM/YYYY
      /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/,    // YYYY/MM/DD
      /^\d{1,2}-\w{3}-\d{2,4}$/,          // DD-MMM-YYYY
      /^\w{3}\s+\d{1,2},?\s+\d{4}$/,      // MMM DD, YYYY
      /^\d{1,2}\s+\w{3}\s+\d{4}$/,        // DD MMM YYYY
    ];

    return datePatterns.some(pattern => pattern.test(value));
  }

  protected normalizeValue(value: any, type: string): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    switch (type) {
      case 'number':
      case 'currency':
        const numStr = String(value).replace(/[$€£¥₹,\s]/g, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? null : num;
      
      case 'percentage':
        const pctStr = String(value).replace(/[%\s]/g, '');
        const pct = parseFloat(pctStr);
        return isNaN(pct) ? null : pct / 100;
      
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;
      
      case 'boolean':
        return Boolean(value);
      
      default:
        return String(value).trim();
    }
  }

  abstract analyzeData(data: ParsedData): Promise<DataAnalysis>;
}