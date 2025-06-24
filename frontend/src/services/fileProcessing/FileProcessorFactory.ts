import { ExcelProcessor } from './processors/ExcelProcessor';
import { CSVProcessor } from './processors/CSVProcessor';
import { JSONProcessor } from './processors/JSONProcessor';
import { PDFProcessor } from './processors/PDFProcessor';
import { BaseProcessor } from './processors/BaseProcessor';

export class FileProcessorFactory {
  private static processors: Map<string, BaseProcessor> = new Map([
    ['xlsx', new ExcelProcessor()],
    ['xls', new ExcelProcessor()],
    ['xlsm', new ExcelProcessor()],
    ['csv', new CSVProcessor()],
    ['tsv', new CSVProcessor()],
    ['json', new JSONProcessor()],
    ['pdf', new PDFProcessor()],
  ]);

  static getProcessor(file: File): BaseProcessor | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension) return null;
    
    return this.processors.get(extension) || null;
  }

  static canProcess(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension ? this.processors.has(extension) : false;
  }

  static getSupportedFormats(): string[] {
    return Array.from(this.processors.keys());
  }

  static getSupportedExtensions(): string {
    return '.' + Array.from(this.processors.keys()).join(',.');
  }
}