const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

// Excel upload and parse endpoint
app.post('/api/parse-excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('\n=== NEW EXCEL UPLOAD ===');
    console.log('File:', req.file.originalname);
    console.log('Size:', req.file.size, 'bytes');

    // Read the Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    
    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log('Sheet name:', sheetName);

    // Define the exact cells we need to read
    const CELLS = {
      // June is in column G
      juneIncome: 'G24',      // Row 24: Total Income
      juneExpense: 'G100',    // Row 100: Total Expense  
      juneBalance: 'G104',    // Row 104: Final Balance
      juneLowest: 'G112',     // Row 112: Lowest Balance
      juneGeneration: 'G113', // Row 113: Monthly Generation
    };

    // Read the specific cells
    const juneData = {};
    for (const [key, cell] of Object.entries(CELLS)) {
      const cellData = worksheet[cell];
      if (cellData) {
        juneData[key] = cellData.v; // v is the raw value
        console.log(`${key} (${cell}):`, cellData.v);
      } else {
        juneData[key] = null;
        console.log(`${key} (${cell}): CELL NOT FOUND`);
      }
    }

    // Also read the date from row 3 to confirm it's June
    const juneDate = worksheet['G3'];
    console.log('Date in G3:', juneDate ? juneDate.w || juneDate.v : 'NOT FOUND');

    // Read all months for context (columns B through P)
    const months = [];
    const columns = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    
    for (const col of columns) {
      const dateCell = worksheet[col + '3'];
      const incomeCell = worksheet[col + '24'];
      
      if (dateCell && incomeCell) {
        months.push({
          column: col,
          date: dateCell.w || dateCell.v,
          income: incomeCell.v
        });
      }
    }

    console.log('\nAll months found:', months.length);
    months.forEach(m => {
      console.log(`  ${m.column}: ${m.date} - Income: ${m.income}`);
    });

    // Check if we found the wrong value
    const wrongValue = 78799416.63;
    const hasWrongValue = Math.abs(juneData.juneIncome - wrongValue) < 1;

    res.json({
      success: true,
      june: {
        ...juneData,
        column: 'G',
        hasWrongValue,
        expectedIncome: 61715728.02
      },
      allMonths: months,
      debug: {
        sheetName,
        totalSheets: workbook.SheetNames.length,
        fileSize: req.file.size
      }
    });

  } catch (error) {
    console.error('Error parsing Excel:', error);
    res.status(500).json({ 
      error: 'Failed to parse Excel file', 
      details: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`\nClean Warren server running on port ${PORT}`);
  console.log(`Test the health check: http://localhost:${PORT}/health`);
});