/**
 * Parser Performance Benchmarks
 * 
 * Performance tests to ensure the parser maintains speed at scale
 */

import { ParserService } from '../../parser/ParserService';
import { FileFormat } from '../../types/parser';
import * as ExcelJS from 'exceljs';

interface BenchmarkResult {
  name: string;
  fileSize: number;
  rows: number;
  duration: number;
  throughput: number; // MB/s
  rowsPerSecond: number;
}

describe('Parser Performance Benchmarks', () => {
  let parserService: ParserService;
  const results: BenchmarkResult[] = [];
  
  beforeAll(() => {
    parserService = new ParserService({
      enableAI: true,
      tier: 'enterprise'
    });
  });
  
  afterAll(() => {
    // Print benchmark results
    console.table(results);
    
    // Generate performance report
    const report = generatePerformanceReport(results);
    console.log('\n' + report);
  });
  
  describe('Excel Performance', () => {
    it('should parse small Excel files quickly', async () => {
      const result = await benchmarkExcel('Small Excel', 100, 10);
      expect(result.duration).toBeLessThan(500);
      expect(result.throughput).toBeGreaterThan(1);
      results.push(result);
    });
    
    it('should parse medium Excel files efficiently', async () => {
      const result = await benchmarkExcel('Medium Excel', 1000, 50);
      expect(result.duration).toBeLessThan(2000);
      expect(result.rowsPerSecond).toBeGreaterThan(500);
      results.push(result);
    });
    
    it('should parse large Excel files within reasonable time', async () => {
      const result = await benchmarkExcel('Large Excel', 10000, 100);
      expect(result.duration).toBeLessThan(10000);
      expect(result.rowsPerSecond).toBeGreaterThan(1000);
      results.push(result);
    });
    
    it('should handle Excel with many formulas', async () => {
      const result = await benchmarkExcelWithFormulas('Excel with Formulas', 1000, 20);
      expect(result.duration).toBeLessThan(5000);
      results.push(result);
    });
  });
  
  describe('CSV Performance', () => {
    it('should parse small CSV files instantly', async () => {
      const result = await benchmarkCSV('Small CSV', 100, 10);
      expect(result.duration).toBeLessThan(100);
      expect(result.throughput).toBeGreaterThan(10);
      results.push(result);
    });
    
    it('should parse large CSV files quickly', async () => {
      const result = await benchmarkCSV('Large CSV', 100000, 20);
      expect(result.duration).toBeLessThan(5000);
      expect(result.rowsPerSecond).toBeGreaterThan(20000);
      results.push(result);
    });
    
    it('should handle CSV with many columns efficiently', async () => {
      const result = await benchmarkCSV('Wide CSV', 10000, 100);
      expect(result.duration).toBeLessThan(3000);
      results.push(result);
    });
  });
  
  describe('Plugin Performance Impact', () => {
    it('should measure AI plugin overhead', async () => {
      // Parse without AI
      const serviceNoAI = new ParserService({ enableAI: false });
      const buffer = await createTestExcel(1000, 20);
      
      const startNoAI = Date.now();
      await serviceNoAI.parse(buffer, {
        fileName: 'test.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      const durationNoAI = Date.now() - startNoAI;
      
      // Parse with AI
      const startWithAI = Date.now();
      await parserService.parse(buffer, {
        fileName: 'test.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      const durationWithAI = Date.now() - startWithAI;
      
      const overhead = ((durationWithAI - durationNoAI) / durationNoAI) * 100;
      
      console.log(`AI Plugin Overhead: ${overhead.toFixed(2)}%`);
      expect(overhead).toBeLessThan(50); // AI should add less than 50% overhead
    });
    
    it('should measure currency conversion overhead', async () => {
      // Create multi-currency data
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Multi-Currency');
      
      worksheet.addRow(['', 'Jan', 'Feb', 'Mar']);
      for (let i = 0; i < 1000; i++) {
        const currency = ['USD', 'EUR', 'GBP', 'JPY'][i % 4];
        worksheet.addRow([
          `${currency} Revenue ${i}`,
          Math.random() * 10000,
          Math.random() * 10000,
          Math.random() * 10000
        ]);
      }
      
      const buffer = await workbook.xlsx.writeBuffer() as Buffer;
      
      const start = Date.now();
      const result = await parserService.parse(buffer, {
        fileName: 'multi-currency.xlsx',
        fileFormat: FileFormat.EXCEL
      });
      const duration = Date.now() - start;
      
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(3000);
      
      results.push({
        name: 'Multi-Currency Excel',
        fileSize: buffer.length,
        rows: 1000,
        duration,
        throughput: (buffer.length / 1024 / 1024) / (duration / 1000),
        rowsPerSecond: 1000 / (duration / 1000)
      });
    });
  });
  
  describe('Memory Usage', () => {
    it('should not leak memory with repeated parsing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        const buffer = await createTestExcel(100, 10);
        await parserService.parse(buffer, {
          fileName: `test${i}.xlsx`,
          fileFormat: FileFormat.EXCEL
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      console.log(`Memory increase after ${iterations} iterations: ${memoryIncrease.toFixed(2)} MB`);
      expect(memoryIncrease).toBeLessThan(100); // Should not increase by more than 100MB
    });
  });
  
  // Benchmark helper functions
  
  async function benchmarkExcel(
    name: string,
    rows: number,
    cols: number
  ): Promise<BenchmarkResult> {
    const buffer = await createTestExcel(rows, cols);
    
    const start = Date.now();
    const result = await parserService.parse(buffer, {
      fileName: 'benchmark.xlsx',
      fileFormat: FileFormat.EXCEL
    });
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    
    return {
      name,
      fileSize: buffer.length,
      rows,
      duration,
      throughput: (buffer.length / 1024 / 1024) / (duration / 1000),
      rowsPerSecond: rows / (duration / 1000)
    };
  }
  
  async function benchmarkExcelWithFormulas(
    name: string,
    rows: number,
    cols: number
  ): Promise<BenchmarkResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Formulas');
    
    // Headers
    const headers = ['Item'];
    for (let i = 0; i < cols; i++) {
      headers.push(`Month ${i + 1}`);
    }
    worksheet.addRow(headers);
    
    // Data with formulas
    for (let i = 0; i < rows; i++) {
      const row: any[] = [`Item ${i}`];
      for (let j = 0; j < cols; j++) {
        if (i % 10 === 0) {
          // Every 10th row is a sum formula
          const startRow = Math.max(2, i - 9);
          const endRow = i + 1;
          const col = String.fromCharCode(66 + j); // B, C, D...
          row.push({ formula: `SUM(${col}${startRow}:${col}${endRow})` });
        } else {
          row.push(Math.random() * 1000);
        }
      }
      worksheet.addRow(row);
    }
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    const start = Date.now();
    const result = await parserService.parse(buffer, {
      fileName: 'benchmark-formulas.xlsx',
      fileFormat: FileFormat.EXCEL
    });
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    
    return {
      name,
      fileSize: buffer.length,
      rows,
      duration,
      throughput: (buffer.length / 1024 / 1024) / (duration / 1000),
      rowsPerSecond: rows / (duration / 1000)
    };
  }
  
  async function benchmarkCSV(
    name: string,
    rows: number,
    cols: number
  ): Promise<BenchmarkResult> {
    let csv = '';
    
    // Headers
    const headers = ['Item'];
    for (let i = 0; i < cols; i++) {
      headers.push(`Col${i}`);
    }
    csv += headers.join(',') + '\n';
    
    // Data
    for (let i = 0; i < rows; i++) {
      const row = [`Item ${i}`];
      for (let j = 0; j < cols; j++) {
        row.push((Math.random() * 1000).toFixed(2));
      }
      csv += row.join(',') + '\n';
    }
    
    const buffer = Buffer.from(csv, 'utf8');
    
    const start = Date.now();
    const result = await parserService.parse(buffer, {
      fileName: 'benchmark.csv',
      fileFormat: FileFormat.CSV
    });
    const duration = Date.now() - start;
    
    expect(result.success).toBe(true);
    
    return {
      name,
      fileSize: buffer.length,
      rows,
      duration,
      throughput: (buffer.length / 1024 / 1024) / (duration / 1000),
      rowsPerSecond: rows / (duration / 1000)
    };
  }
  
  async function createTestExcel(rows: number, cols: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');
    
    // Headers
    const headers = ['Item'];
    for (let i = 0; i < cols; i++) {
      headers.push(`Col${i}`);
    }
    worksheet.addRow(headers);
    
    // Data
    for (let i = 0; i < rows; i++) {
      const row: any[] = [`Item ${i}`];
      for (let j = 0; j < cols; j++) {
        row.push(Math.random() * 1000);
      }
      worksheet.addRow(row);
    }
    
    return await workbook.xlsx.writeBuffer() as Buffer;
  }
  
  function generatePerformanceReport(results: BenchmarkResult[]): string {
    let report = '=== Parser Performance Report ===\n\n';
    
    // Calculate averages
    const avgThroughput = results.reduce((sum, r) => sum + r.throughput, 0) / results.length;
    const avgRowsPerSec = results.reduce((sum, r) => sum + r.rowsPerSecond, 0) / results.length;
    
    report += `Average Throughput: ${avgThroughput.toFixed(2)} MB/s\n`;
    report += `Average Processing Speed: ${avgRowsPerSec.toFixed(0)} rows/second\n\n`;
    
    // Find best and worst performers
    const sorted = [...results].sort((a, b) => b.throughput - a.throughput);
    report += `Fastest: ${sorted[0].name} (${sorted[0].throughput.toFixed(2)} MB/s)\n`;
    report += `Slowest: ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].throughput.toFixed(2)} MB/s)\n\n`;
    
    // Performance grades
    report += 'Performance Grades:\n';
    results.forEach(r => {
      let grade = 'A';
      if (r.throughput < 0.5) grade = 'F';
      else if (r.throughput < 1) grade = 'D';
      else if (r.throughput < 2) grade = 'C';
      else if (r.throughput < 5) grade = 'B';
      
      report += `${r.name}: ${grade}\n`;
    });
    
    return report;
  }
});