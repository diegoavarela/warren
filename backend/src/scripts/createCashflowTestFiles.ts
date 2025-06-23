import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function createStandardCashflow() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Cashflow');
  
  // Standard format: Dates in row 1, metrics in specific rows
  // Row 1: Headers with months
  const months = ['January 2024', 'February 2024', 'March 2024', 'April 2024', 'May 2024', 
                  'June 2024', 'July 2024', 'August 2024', 'September 2024', 'October 2024', 
                  'November 2024', 'December 2024'];
  
  worksheet.getRow(1).values = ['Metric', ...months];
  
  // Standard cashflow metrics
  worksheet.getRow(2).values = ['Beginning Balance', 70728, 76640, 82948, 89621, 96970, 104863, 113375, 122583, 132566, 143401, 155170, 167956];
  worksheet.getRow(3).values = ['Total Income', 83020, 89862, 97244, 105210, 113807, 123084, 133095, 143895, 155543, 168102, 181638, 196222];
  worksheet.getRow(4).values = ['Total Expenses', 77108, 83554, 90571, 98235, 106627, 115832, 125940, 137046, 149250, 162656, 177369, 193498];
  worksheet.getRow(5).values = ['Net Cash Flow', 5912, 6308, 6673, 6975, 7180, 7252, 7155, 6849, 6293, 5446, 4269, 2724];
  worksheet.getRow(6).values = ['Ending Balance', 76640, 82948, 89621, 96596, 104150, 112115, 120530, 129432, 138859, 148847, 159439, 168680];
  worksheet.getRow(7).values = ['Lowest Balance', 68234, 73985, 79943, 86198, 92846, 99982, 107705, 116119, 125329, 135443, 146571, 158828];
  
  await workbook.xlsx.writeFile('/Users/diegovarela/AI Agents/warren/test-data/Cashflow_Standard_2024.xlsx');
  console.log('Created Cashflow_Standard_2024.xlsx');
}

async function createNonStandardCashflow() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Flujo de Caja'); // Spanish name
  
  // Non-standard format: Different structure, Spanish labels, dates in different row
  // Empty row
  worksheet.getRow(1).values = [''];
  worksheet.getRow(2).values = ['ESTADO DE FLUJO DE CAJA 2024'];
  worksheet.getRow(3).values = [''];
  
  // Dates in row 4 but in a different format
  worksheet.getRow(4).values = ['Conceptos', 'Ene-24', 'Feb-24', 'Mar-24', 'Abr-24', 'May-24', 
                                'Jun-24', 'Jul-24', 'Ago-24', 'Sep-24', 'Oct-24', 'Nov-24', 'Dic-24'];
  
  worksheet.getRow(5).values = [''];
  worksheet.getRow(6).values = ['INGRESOS'];
  worksheet.getRow(7).values = ['Ventas', 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000, 105000, 110000, 115000, 120000];
  worksheet.getRow(8).values = ['Otros Ingresos', 18020, 19862, 22244, 25210, 28807, 33084, 38095, 43895, 50543, 58102, 66638, 76222];
  worksheet.getRow(9).values = ['TOTAL INGRESOS', 83020, 89862, 97244, 105210, 113807, 123084, 133095, 143895, 155543, 168102, 181638, 196222];
  
  worksheet.getRow(10).values = [''];
  worksheet.getRow(11).values = ['EGRESOS'];
  worksheet.getRow(12).values = ['Costos Operativos', 45000, 48000, 51000, 54000, 57000, 60000, 63000, 66000, 69000, 72000, 75000, 78000];
  worksheet.getRow(13).values = ['Gastos Administrativos', 22108, 23554, 25571, 28235, 31627, 35832, 40940, 47046, 54250, 62656, 72369, 83498];
  worksheet.getRow(14).values = ['Impuestos', 10000, 12000, 14000, 16000, 18000, 20000, 22000, 24000, 26000, 28000, 30000, 32000];
  worksheet.getRow(15).values = ['TOTAL EGRESOS', 77108, 83554, 90571, 98235, 106627, 115832, 125940, 137046, 149250, 162656, 177369, 193498];
  
  worksheet.getRow(16).values = [''];
  worksheet.getRow(17).values = ['Flujo Neto del Período', 5912, 6308, 6673, 6975, 7180, 7252, 7155, 6849, 6293, 5446, 4269, 2724];
  worksheet.getRow(18).values = [''];
  worksheet.getRow(19).values = ['Saldo Inicial', 70728, 76640, 82948, 89621, 96596, 104150, 112115, 120530, 129432, 138859, 148847, 159439];
  worksheet.getRow(20).values = ['Saldo Final', 76640, 82948, 89621, 96596, 104150, 112115, 120530, 129432, 138859, 148847, 159439, 162163];
  
  await workbook.xlsx.writeFile('/Users/diegovarela/AI Agents/warren/test-data/Cashflow_NonStandard_Spanish_2024.xlsx');
  console.log('Created Cashflow_NonStandard_Spanish_2024.xlsx');
}

// Create both files
async function main() {
  try {
    await createStandardCashflow();
    await createNonStandardCashflow();
    console.log('All cashflow test files created successfully!');
  } catch (error) {
    console.error('Error creating files:', error);
  }
}

main();