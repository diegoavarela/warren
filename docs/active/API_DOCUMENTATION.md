# Warren Configuration-Based API Documentation

## Overview
This document provides comprehensive documentation for all API endpoints in the Warren configuration-based system.

## Base URL
- **Development**: `http://localhost:4000/api`
- **Production**: `https://warren.vort-ex.com/api`

## Authentication
All API endpoints require authentication via JWT token passed in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All API responses follow this standardized format:
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    timestamp: string;
    version: string;
    totalCount?: number;
    page?: number;
    limit?: number;
  };
}
```

## Configuration Management APIs

### List Configurations
**GET** `/api/configurations`

Lists all configurations for the authenticated user's company.

**Query Parameters:**
- `type` (optional): Filter by configuration type (`pnl` | `cashflow`)
- `isActive` (optional): Filter by active status (`true` | `false`)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```typescript
{
  success: true,
  data: Configuration[],
  metadata: {
    totalCount: number,
    page: number,
    limit: number
  }
}

interface Configuration {
  id: string;
  companyId: string;
  name: string;
  type: 'pnl' | 'cashflow';
  description: string | null;
  version: number;
  isActive: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### Create Configuration
**POST** `/api/configurations`

Creates a new configuration.

**Request Body:**
```typescript
{
  name: string;
  type: 'pnl' | 'cashflow';
  description?: string;
  isTemplate?: boolean;
  configJson: ConfigurationStructure;
  metadata: {
    currency: string;
    locale: string;
    units: 'normal' | 'thousands' | 'millions';
  };
}
```

**Response:**
```typescript
{
  success: true,
  data: Configuration
}
```

### Get Configuration
**GET** `/api/configurations/[id]`

Retrieves a specific configuration by ID.

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    companyId: string;
    name: string;
    type: 'pnl' | 'cashflow';
    description: string | null;
    version: number;
    isActive: boolean;
    isTemplate: boolean;
    configJson: ConfigurationStructure;
    metadata: ConfigurationMetadata;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  }
}
```

### Update Configuration
**PUT** `/api/configurations/[id]`

Updates an existing configuration.

**Request Body:**
```typescript
{
  name?: string;
  description?: string;
  isActive?: boolean;
  isTemplate?: boolean;
  configJson?: ConfigurationStructure;
  metadata?: ConfigurationMetadata;
}
```

**Response:**
```typescript
{
  success: true,
  data: Configuration
}
```

### Delete Configuration
**DELETE** `/api/configurations/[id]`

Deletes a configuration (soft delete - sets isActive to false).

**Response:**
```typescript
{
  success: true,
  message: "Configuration deleted successfully"
}
```

### Validate Configuration
**POST** `/api/configurations/[id]/validate`

Validates a configuration structure and optionally against an Excel file.

**Request Body:**
```typescript
{
  validateStructure?: boolean;  // Default: true
  fileContent?: string;         // Base64 encoded Excel file (optional)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    mathValidation?: {
      categoryTotals?: Record<string, CategoryTotalValidation>;
      formulaChecks?: FormulaValidation[];
      balanceValidation?: BalanceValidation;
    };
  }
}
```

### Get Excel Preview
**GET** `/api/configurations/[id]/excel-preview`

Returns Excel preview data for visual mapping.

**Response:**
```typescript
{
  success: true,
  data: {
    worksheet: ExcelWorksheetData;
    rows: ExcelRow[];
    columns: ExcelColumn[];
    totalRows: number;
    totalColumns: number;
  }
}
```

## File Management APIs

### Upload File
**POST** `/api/files/upload`

Uploads an Excel file for processing.

**Request Body:** (multipart/form-data)
- `file`: Excel file (.xlsx or .xls)
- `companyId`: Company UUID
- `uploadSession`: Session identifier

**Response:**
```typescript
{
  success: true,
  data: {
    fileId: string;
    filename: string;
    originalFilename: string;
    fileSize: number;
    uploadedAt: string;
  }
}
```

### Process File
**POST** `/api/files/process`

Processes an uploaded Excel file using a configuration.

**Request Body:**
```typescript
{
  fileId: string;
  configId: string;
  companyId: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    processedDataId: string;
    fileId: string;
    configId: string;
    fileName: string;
    configName: string;
    processedAt: string;
    processingStatus: string;
    currency: string;
    units: string;
    periodStart: string | null;
    periodEnd: string | null;
    preview: {
      periods: string[];
      dataRowsCount: number;
      categoriesCount: number;
    };
  }
}
```

### Get File Info
**GET** `/api/files/[id]`

Retrieves information about an uploaded file.

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    companyId: string;
    filename: string;
    originalFilename: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: string;
  }
}
```

## Processed Data APIs (New)

### Get P&L Dashboard Data
**GET** `/api/processed-data/pnl/[companyId]`

Retrieves processed P&L data for dashboard display.

**Query Parameters:**
- `period` (optional): Specific period (YYYY-MM format)
- `configId` (optional): Specific configuration ID
- `currency` (optional): Currency code for conversion
- `units` (optional): Display units ('normal' | 'thousands' | 'millions')

**Response:**
```typescript
{
  success: true,
  data: {
    periods: Period[];
    currentPeriod: Period;
    previousPeriod?: Period;
    yearToDate: YTDMetrics;
    categories: {
      revenue: RevenueCategory[];
      cogs: COGSCategory[];
      opex: OpexCategory[];
      otherIncome: OtherIncomeCategory[];
      otherExpenses: OtherExpensesCategory[];
      taxes: TaxCategory[];
    };
    calculations: {
      grossProfit: number;
      operatingIncome: number;
      netIncome: number;
      margins: {
        gross: number;
        operating: number;
        net: number;
      };
    };
    metadata: {
      currency: string;
      units: string;
      lastUpdated: string;
      configurationName: string;
    };
  }
}
```

### Get Cash Flow Dashboard Data
**GET** `/api/processed-data/cashflow/[companyId]`

Retrieves processed cash flow data for dashboard display.

**Query Parameters:**
- `period` (optional): Specific period (YYYY-MM format)
- `configId` (optional): Specific configuration ID
- `currency` (optional): Currency code for conversion
- `units` (optional): Display units ('normal' | 'thousands' | 'millions')

**Response:**
```typescript
{
  success: true,
  data: {
    periods: Period[];
    currentPeriod: Period;
    previousPeriod?: Period;
    categories: {
      inflows: InflowCategory[];
      outflows: OutflowCategory[];
    };
    calculations: {
      totalInflows: number;
      totalOutflows: number;
      netCashFlow: number;
      runningBalance: number;
      burnRate: number;
      runway: number; // months
    };
    analysis: {
      growthRates: {
        inflows: number;
        outflows: number;
        netCashFlow: number;
      };
      trends: TrendData[];
      scenarios: ScenarioData[];
    };
    metadata: {
      currency: string;
      units: string;
      lastUpdated: string;
      configurationName: string;
    };
  }
}
```

### Get Available Periods
**GET** `/api/processed-data/companies/[companyId]/periods`

Lists all available periods for a company's processed data.

**Query Parameters:**
- `type` (optional): Filter by data type ('pnl' | 'cashflow')
- `configId` (optional): Filter by specific configuration

**Response:**
```typescript
{
  success: true,
  data: {
    periods: Period[];
    latestPeriod: Period;
    availableTypes: ('pnl' | 'cashflow')[];
  }
}

interface Period {
  id: string;
  period: string;        // YYYY-MM format
  periodStart: string;   // ISO date
  periodEnd: string;     // ISO date
  type: 'pnl' | 'cashflow';
  configurationId: string;
  configurationName: string;
  processedAt: string;
  currency: string;
  units: string;
}
```

### Get Data Summary
**GET** `/api/processed-data/[companyId]/summary`

Provides summary information about all processed data for a company.

**Response:**
```typescript
{
  success: true,
  data: {
    totalRecords: number;
    latestUpdate: string;
    availableTypes: ('pnl' | 'cashflow')[];
    periodRange: {
      earliest: string;
      latest: string;
    };
    configurations: {
      id: string;
      name: string;
      type: 'pnl' | 'cashflow';
      recordCount: number;
      latestPeriod: string;
    }[];
    dataQuality: {
      completeness: number;  // percentage
      consistency: number;   // percentage
      issues: DataIssue[];
    };
  }
}
```

## Authentication APIs

### Login
**POST** `/api/auth/login`

Authenticates a user and returns JWT token.

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyId: string;
      organizationId: string;
    };
  }
}
```

### Get Current User
**GET** `/api/auth/me`

Returns current authenticated user information.

**Response:**
```typescript
{
  success: true,
  data: {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    organizationId: string;
    permissions: string[];
  }
}
```

### Logout
**POST** `/api/auth/logout`

Logs out the current user (invalidates token).

**Response:**
```typescript
{
  success: true,
  message: "Logged out successfully"
}
```

## Company & Organization APIs

### Get Companies
**GET** `/api/companies`

Lists companies accessible to the authenticated user.

**Response:**
```typescript
{
  success: true,
  data: Company[]
}

interface Company {
  id: string;
  name: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
}
```

### Get Organizations  
**GET** `/api/organizations`

Lists organizations (Platform Admin only).

**Response:**
```typescript
{
  success: true,
  data: Organization[]
}
```

## Error Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `410` - Gone (resource no longer available)
- `422` - Unprocessable Entity (validation failed)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Response Format
```typescript
{
  success: false,
  error: string,
  message?: string,
  details?: {
    field?: string,
    code?: string,
    validation?: ValidationError[]
  }
}
```

## Rate Limits
- **General APIs**: 100 requests per minute per user
- **File Upload**: 10 requests per minute per user  
- **Processing**: 5 requests per minute per user
- **Authentication**: 20 requests per minute per IP

## Webhooks (Future)
Webhook endpoints for real-time notifications:
- `POST /api/webhooks/processing-complete`
- `POST /api/webhooks/validation-failed`
- `POST /api/webhooks/data-updated`

## SDK Examples

### JavaScript/TypeScript
```typescript
// Configuration API usage
const warren = new WarrenAPI('https://warren.vort-ex.com/api', token);

// Get P&L data
const pnlData = await warren.processedData.getPnL(companyId, {
  period: '2024-01',
  currency: 'USD',
  units: 'thousands'
});

// Create configuration
const config = await warren.configurations.create({
  name: 'Q1 2024 P&L',
  type: 'pnl',
  configJson: configStructure,
  metadata: { currency: 'USD', locale: 'en', units: 'normal' }
});

// Process file
const result = await warren.files.process({
  fileId: uploadedFileId,
  configId: config.id,
  companyId: companyId
});
```

### cURL Examples
```bash
# Get P&L data
curl -X GET "https://warren.vort-ex.com/api/processed-data/pnl/company-123?period=2024-01" \
  -H "Authorization: Bearer $TOKEN"

# Create configuration
curl -X POST "https://warren.vort-ex.com/api/configurations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 2024 P&L",
    "type": "pnl",
    "configJson": {...},
    "metadata": {"currency": "USD", "locale": "en", "units": "normal"}
  }'

# Upload and process file
curl -X POST "https://warren.vort-ex.com/api/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@financial-data.xlsx" \
  -F "companyId=company-123" \
  -F "uploadSession=session-456"
```

This API documentation provides comprehensive coverage of all endpoints in the Warren configuration-based system, ensuring developers can integrate effectively with the platform.