/**
 * Parser Worker Thread
 * 
 * Handles CPU-intensive parsing operations in a separate thread
 */

import { parentPort, workerData } from 'worker_threads';
import * as ExcelJS from 'exceljs';

interface WorkerData {
  chunk: Buffer;
  parserType: string;
  chunkIndex: number;
}

interface WorkerResult {
  success: boolean;
  data?: any[];
  error?: string;
  chunkIndex: number;
  rowCount: number;
}

// Worker function for different parser types
async function parseChunk(chunk: Buffer, parserType: string, chunkIndex: number): Promise<WorkerResult> {
  try {
    let result: any[] = [];
    
    switch (parserType) {
      case 'excel':
        result = await parseExcelChunk(chunk);
        break;
      case 'csv':
        result = await parseCSVChunk(chunk);
        break;
      case 'pdf':
        result = await parsePDFChunk(chunk);
        break;
      default:
        throw new Error(`Unknown parser type: ${parserType}`);
    }
    
    return {
      success: true,
      data: result,
      chunkIndex,
      rowCount: Array.isArray(result) ? result.length : 1
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      chunkIndex,
      rowCount: 0
    };
  }
}

// Excel chunk parser
async function parseExcelChunk(chunk: Buffer): Promise<any[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(chunk);
  
  const data: any[] = [];
  
  workbook.eachSheet((worksheet) => {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        rowData[`col_${colNumber}`] = cell.value;
      });
      
      data.push(rowData);
    });
  });
  
  return data;
}

// CSV chunk parser
async function parseCSVChunk(chunk: Buffer): Promise<any[]> {
  const text = chunk.toString('utf8');
  const lines = text.split('\n');
  const data: any[] = [];
  
  // Simple CSV parsing (in production, use a proper CSV library)
  for (let i = 1; i < lines.length; i++) { // Skip header
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const rowData: Record<string, any> = {};
    
    values.forEach((value, index) => {
      rowData[`col_${index}`] = value.trim();
    });
    
    data.push(rowData);
  }
  
  return data;
}

// PDF chunk parser (placeholder)
async function parsePDFChunk(chunk: Buffer): Promise<any[]> {
  // This would use a PDF parsing library
  // For now, return empty data
  return [];
}

// Main worker execution
if (parentPort) {
  const { chunk, parserType, chunkIndex } = workerData as WorkerData;
  
  parseChunk(chunk, parserType, chunkIndex)
    .then(result => {
      parentPort!.postMessage(result);
    })
    .catch(error => {
      parentPort!.postMessage({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        chunkIndex,
        rowCount: 0
      });
    });
}