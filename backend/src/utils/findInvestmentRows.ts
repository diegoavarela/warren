import ExcelJS from 'exceljs';

/**
 * Utility to find potential investment data rows in Excel
 */
export async function findPotentialInvestmentRows(filePath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    console.log('No worksheet found');
    return;
  }

  console.log('\n=== SEARCHING FOR INVESTMENT DATA ===\n');
  
  // Keywords that might indicate investment data
  const investmentKeywords = [
    'investment', 'portfolio', 'stock', 'bond', 'equity',
    'asset', 'security', 'fund', 'capital', 'wealth',
    'portafolio', 'inversion', 'inversiones', 'acciones',
    'bonos', 'fondos', 'activos', 'patrimonio'
  ];

  const foundRows: any[] = [];
  
  // Search through rows 1-150
  for (let rowNum = 1; rowNum <= 150; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const description = row.getCell(1).value; // Column A
    
    if (description) {
      const descStr = description.toString().toLowerCase();
      
      for (const keyword of investmentKeywords) {
        if (descStr.includes(keyword)) {
          // Get values from columns 2-7 to see if there's numeric data
          const values = [];
          for (let col = 2; col <= 7; col++) {
            const cellValue = row.getCell(col).value;
            if (typeof cellValue === 'number') {
              values.push({
                col: String.fromCharCode(64 + col),
                value: cellValue
              });
            }
          }
          
          foundRows.push({
            row: rowNum,
            description: description.toString(),
            keyword: keyword,
            hasNumericData: values.length > 0,
            sampleValues: values.slice(0, 3)
          });
          
          console.log(`Row ${rowNum}: "${description}"`);
          console.log(`  Matched keyword: "${keyword}"`);
          if (values.length > 0) {
            console.log(`  Sample values:`, values.slice(0, 3));
          }
          console.log('');
          
          break;
        }
      }
    }
  }

  // Also check rows 19-25 specifically since those are mentioned in the code
  console.log('\n=== CHECKING ROWS 19-25 (Investment area in code) ===\n');
  
  for (let rowNum = 19; rowNum <= 25; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const description = row.getCell(1).value || 'No description';
    
    const values = [];
    for (let col = 2; col <= 7; col++) {
      const cellValue = row.getCell(col).value;
      values.push({
        col: String.fromCharCode(64 + col),
        value: cellValue,
        type: typeof cellValue
      });
    }
    
    console.log(`Row ${rowNum}: "${description}"`);
    console.log(`  Values:`, values.filter(v => v.value !== null && v.value !== undefined).slice(0, 5));
    console.log('');
  }

  console.log(`\nTotal investment-related rows found: ${foundRows.length}`);
  
  return foundRows;
}

// If running directly
if (require.main === module) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.log('Usage: ts-node findInvestmentRows.ts <excel-file-path>');
    process.exit(1);
  }
  
  findPotentialInvestmentRows(filePath).catch(console.error);
}