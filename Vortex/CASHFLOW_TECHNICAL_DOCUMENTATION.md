# Warren Cashflow Dashboard - Technical Implementation Documentation

## Overview

This document provides a comprehensive technical breakdown of how the Warren cashflow dashboard reads Excel files and renders different segments of the cashflow visualization, specifically focusing on the `Cashflow_2025.xlsx` file structure.

## Excel File Reading Implementation

### Primary Libraries and Tools

**Backend Excel Processing:**
- **ExcelJS** (`v4.x`) - Core Excel file parsing and manipulation library
- **date-fns** - Date formatting and manipulation utilities
- **Node.js Buffer** - Binary file handling for uploaded Excel files

**File Location:** `/backend/src/services/CashflowService.ts` and `/backend/src/services/CashflowServiceV2Enhanced.ts`

### Excel File Structure - Vortex Format

The system is specifically designed to parse the `Cashflow_2025.xlsx` file with the following structure:

#### Key Row Mappings
```typescript
const rowNumbers = {
  totalCollections: 20,    // Row 20: Total Collections (displayed as Total Income)
  totalIncome: 24,         // Row 24: TOTAL INCOME
  totalExpense: 101,       // Row 100: TOTAL EXPENSE  
  finalBalance: 105,       // Row 104: Final Balance
  lowestBalance: 113,      // Row 112: Lowest Balance of the month
  monthlyGeneration: 114   // Row 113: Monthly Cash Generation
};
```

#### Column Structure
- **Row 3:** Contains month dates (January through December 2025)
- **Columns 2-16 (B-P):** Peso section data ONLY

### Excel Parsing Process

#### 1. File Upload and Format Detection (`CashflowController.ts:28`)
```typescript
async uploadFile(req: TenantAuthRequest, res: Response, next: NextFunction) {
  // Process file buffer using ExcelJS
  const result = await this.cashflowService.processExcelFile(req.file.buffer, req.file.originalname);
}
```

#### 2. Worksheet Parsing (`CashflowService.ts:68`)
```typescript
parseWorksheet(worksheet: ExcelJS.Worksheet): CashflowEntry[] {
  // Extract dates from row 3, columns 2-16 (Peso section only)
  const dateRow = worksheet.getRow(3);
  const pesoDates: Array<{columnIndex: number, date: Date, monthName: string}> = [];
  
  // CRITICAL: Stop at column 16 to avoid USD section
  for (let i = 2; i <= 16; i++) {
    const dateCell = dateRow.getCell(i).value;
    if (dateCell === 'Dollars' || (typeof dateCell === 'string' && dateCell.includes('Dollar'))) {
      break; // Stop processing when USD section is detected
    }
    // ... date processing logic
  }
}
```

#### 3. Data Extraction for Each Month
For each detected date column, the system extracts:

**Total Income** (Row 24):
```typescript
const incomeRow = worksheet.getRow(rowNumbers.totalIncome);
const incomeValue = incomeRow.getCell(dateInfo.columnIndex).value;
```

**Total Expenses** (Row 101):
```typescript
const expenseRow = worksheet.getRow(rowNumbers.totalExpense);
const expenseValue = expenseRow.getCell(dateInfo.columnIndex).value;
```

**Final Balance** (Row 105):
```typescript
const balanceRow = worksheet.getRow(rowNumbers.finalBalance);
const balanceValue = balanceRow.getCell(dateInfo.columnIndex).value;
```

**Lowest Balance** (Row 113):
```typescript
const lowestRow = worksheet.getRow(rowNumbers.lowestBalance);
const lowestValue = lowestRow.getCell(dateInfo.columnIndex).value;
```

**Monthly Generation** (Row 114):
```typescript
const generationRow = worksheet.getRow(rowNumbers.monthlyGeneration);
const generationValue = generationRow.getCell(dateInfo.columnIndex).value;
```

## Dashboard Rendering Components

### Frontend Technology Stack

**Core Libraries:**
- **React** (v18.x) with TypeScript
- **Chart.js** (v4.x) with **react-chartjs-2** - Primary charting library
- **Tailwind CSS** - Styling and responsive design
- **Heroicons** - Icon system

### Main Dashboard Component (`/frontend/src/pages/DashboardPage.tsx`)

#### Data Service Integration
```typescript
const loadDashboard = async () => {
  const response = await cashflowService.getDashboard();
  setData(response.data.data);
};
```

#### Dashboard Data Interface
```typescript
interface DashboardData {
  hasData: boolean;
  currentMonth?: {
    month: string;           // Current month name (e.g., "June")
    totalIncome: number;     // From Row 24
    totalExpense: number;    // From Row 100  
    finalBalance: number;    // From Row 104
    lowestBalance: number;   // From Row 112
    monthlyGeneration: number; // From Row 113
  };
  yearToDate?: {
    totalIncome: number;     // Sum Jan-Current Month
    totalExpense: number;    // Sum Jan-Current Month
    totalBalance: number;    // YTD Net Balance
  };
  chartData?: ChartDataPoint[]; // Chart visualization data
  highlights?: {
    pastThreeMonths: string[];   // Analytical insights
    nextSixMonths: string[];     // Projections
  };
  isRealData?: boolean;    // Flag for real vs mock data
}
```

### Cashflow Chart Component (`/frontend/src/components/CashflowChart.tsx`)

#### Chart Configuration
**Chart Type:** Mixed Bar + Line Chart using Chart.js
- **Bar Charts:** Income and Expenses (dual y-axis)
- **Line Chart:** Final Balance trend

```typescript
const chartData = {
  labels: data.map(item => item.month), // Month names
  datasets: [
    {
      type: 'bar' as const,
      label: 'Income',
      data: data.map(item => item.income),    // From Row 24
      backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green bars
      yAxisID: 'y', // Left y-axis
    },
    {
      type: 'bar' as const, 
      label: 'Expenses',
      data: data.map(item => item.expenses),  // From Row 100
      backgroundColor: 'rgba(249, 115, 22, 0.6)', // Orange bars
      yAxisID: 'y', // Left y-axis
    },
    {
      type: 'line' as const,
      label: 'Final Balance', 
      data: data.map(item => item.cashflow), // From Row 104
      borderColor: '#7CB342', // Vortex green
      yAxisID: 'y1', // Right y-axis
    }
  ]
};
```

### Waterfall Chart Component (`/frontend/src/components/CashFlowWaterfall.tsx`)

#### Implementation Details
**Purpose:** Visual breakdown of cash movements showing cumulative effects

**Data Source:** `/api/cashflow/analysis/waterfall`
```typescript
const loadWaterfallData = async () => {
  const response = await cashflowService.getWaterfallData(period);
  setWaterfallData(response.data.data);
};
```

**Chart Type:** Bar chart with floating bars using Chart.js
```typescript
// Calculate floating bars for waterfall effect
const floatingData: Array<[number, number]> = [];
waterfallData.categories.forEach((category, index) => {
  if (index === 0) {
    floatingData.push([0, category.value]); // Starting balance
  } else {
    const start = runningTotal;
    const end = runningTotal + category.value;
    floatingData.push([Math.min(start, end), Math.max(start, end)]);
    runningTotal = end;
  }
});
```

### Dashboard Widgets and Metrics

#### Current Month Widget
**Data Source:** `currentMonth` object from dashboard API
**Visual Elements:**
- Month name display
- Total Income (green highlight)
- Total Expenses (red highlight) 
- Final Balance (primary metric)
- Monthly Generation (net cashflow)

#### Year-to-Date Widget  
**Calculation Logic:** (`CashflowService.ts:304`)
```typescript
// Calculate YTD values (January to current month)
for (let i = 0; i <= currentMonthIndex; i++) {
  ytdIncome += metrics[i].totalIncome;    // Sum Row 24 values
  ytdExpense += metrics[i].totalExpense;  // Sum Row 100 values  
}
ytdBalance = ytdIncome + ytdExpense; // Net YTD balance
```

#### Additional Widgets
1. **Cash Runway Widget** - Projects cash depletion timeline
2. **Burn Rate Trend** - Monthly cash consumption analysis
3. **Scenario Planning** - Best/base/worst case projections
4. **Performance Heatmap** - Monthly performance visualization
5. **Investments Widget** - Investment portfolio tracking (Row 23)
6. **Banking Widget** - Bank balance summaries
7. **Taxes Widget** - Tax obligation tracking
8. **Operational Analysis** - Operational metrics breakdown

### Data Processing Pipeline

#### Backend Data Flow
```
Excel File Upload → ExcelJS Parser → Row/Column Extraction → 
MonthlyMetrics Interface → Dashboard Data Generation → 
JSON API Response → Frontend Rendering
```

#### Frontend Rendering Flow  
```
API Data Fetch → TypeScript Interface Mapping → 
Chart.js Configuration → React Component Rendering → 
Tailwind CSS Styling → Interactive Dashboard Display
```

### Currency and Formatting

#### Currency Handling
**Base Currency:** ARS (Argentine Peso) - extracted from Peso section only
**Display Formatting:**
```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};
```

#### Units and Scaling
**Display Units:** Supports thousands, millions, actual values
**Implementation:** Custom hooks and services for unit conversion and display

## Data Security and Validation

### File Upload Security
- **Multer middleware** for secure file upload handling
- **Buffer-based processing** - files are not stored on disk
- **Excel format validation** using ExcelJS error handling
- **Row/column boundary validation** to prevent malicious data access

### Data Validation
- **Type checking** for all Excel cell values
- **Date validation** using date-fns parsing
- **Numeric validation** for financial values
- **Currency symbol detection** and validation

## Error Handling and Fallbacks

### Excel Parsing Errors
```typescript
try {
  // Excel parsing logic
} catch (error: any) {
  console.error('Error parsing Vortex worksheet:', error);
  throw new Error(`Failed to parse Vortex worksheet: ${error?.message || 'Unknown error'}`);
}
```

### Mock Data Fallbacks
When no real data is available, the system provides mock data for demonstration:
```typescript
if (this.currentData.length === 0 || metrics.length === 0) {
  return mockCashflowData; // Predefined sample data
}
```

## Performance Optimizations

### Frontend Optimizations
- **React useMemo** for expensive calculations
- **Chart.js caching** for improved rendering performance  
- **Lazy loading** for dashboard widgets
- **Responsive design** with Tailwind CSS utilities

### Backend Optimizations
- **Singleton pattern** for service instances
- **In-memory storage** for development (production uses database)
- **Buffer-based file processing** to avoid disk I/O
- **Selective row parsing** - only processes required rows/columns

## API Endpoints

### Primary Cashflow Endpoints
- `POST /api/cashflow/upload` - Excel file upload and processing
- `GET /api/cashflow/dashboard` - Main dashboard data
- `GET /api/cashflow/metrics` - Raw metrics data  
- `GET /api/cashflow/analysis/runway` - Cash runway analysis
- `GET /api/cashflow/analysis/burn-rate` - Burn rate analysis
- `GET /api/cashflow/analysis/waterfall` - Waterfall chart data
- `GET /api/cashflow/operational` - Operational data
- `GET /api/cashflow/banking` - Banking data
- `GET /api/cashflow/taxes` - Tax data
- `GET /api/cashflow/investments` - Investment data

## Deployment and Configuration

### Environment Configuration
- **Development:** Mock data and local file processing
- **Production:** Database integration and AWS S3 storage
- **Docker:** Containerized deployment with environment variables

### Key Configuration Files
- `/backend/package.json` - ExcelJS and core dependencies
- `/frontend/package.json` - Chart.js and React dependencies  
- `CLAUDE.md` - Project documentation and context
- Environment files for API endpoints and database connections

---

*This documentation reflects the current implementation as of the Warren project's latest state and focuses specifically on the Vortex Excel format processing and cashflow dashboard rendering capabilities.*