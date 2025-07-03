# Warren Financial Parser

A production-ready, serverless Excel parser for Vercel deployment with full Spanish/LATAM support, visual mapping interface, and intelligent financial statement detection for P&L and Cash Flow statements.

## 🚀 Features

### ✨ Intelligent Financial Statement Detection
- **Automatic Classification**: Detects P&L, Cash Flow, and Balance Sheet statements
- **Pattern Recognition**: Uses multilingual financial term recognition (Spanish/English)
- **Confidence Scoring**: Provides accuracy metrics for all detections
- **Context-Aware Mapping**: Suggests appropriate field mappings based on statement type

### 🌎 Multilingual & LATAM Support
- **Spanish/English Support**: Native support for financial terminology in both languages
- **LATAM Date Formats**: Handles DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY formats
- **Number Formatting**: Supports comma as decimal separator (1.234,56)
- **Currency Detection**: Intelligent detection of MXN, USD, ARS, COP, CLP, PEN, EUR
- **Locale-Specific Processing**: Adapts parsing logic based on detected locale

### 🎯 Visual Mapping Interface
- **Interactive Excel Viewer**: Spreadsheet-like interface with real-time feedback
- **Confidence Indicators**: Color-coded columns (green/yellow/red) based on detection accuracy
- **Click-to-Edit Mapping**: Easy column mapping with dropdown menus
- **Live Preview**: Real-time preview of parsed data
- **Error Highlighting**: Visual indicators for problematic cells with hover tooltips

### 🏢 Multitenant Architecture
- **Organization Management**: Complete org/company hierarchy
- **Tier-Based Features**: Starter, Professional, Enterprise tiers
- **Company-Scoped Data**: Isolated data storage per company
- **Saved Templates**: Reusable mapping templates per company
- **API Keys**: Company-scoped external API access

### 🔧 Advanced Data Processing
- **Intelligent Structure Detection**: Auto-detects headers, data boundaries, merged cells
- **Multi-Currency Support**: Automatic currency detection and conversion
- **Financial Calculations**: Pre-calculated metrics for dashboard performance
- **Time-Series Ready**: Optimized data structure for financial trends
- **Error Recovery**: Robust error handling with detailed logging

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Neon PostgreSQL with Drizzle ORM
- **File Storage**: Vercel Blob
- **State Management**: Zustand
- **Excel Processing**: XLSX library
- **Deployment**: Vercel (serverless)

### Database Schema
```sql
-- Organizations (top-level tenants)
organizations: id, name, subdomain, tier, locale, base_currency

-- Companies within organizations  
companies: id, organization_id, name, tax_id, industry, locale

-- Financial periods for time-series data
financial_periods: id, company_id, period_type, start_date, end_date

-- Financial statements
financial_statements: id, company_id, statement_type, source_file, metadata

-- Line items with intelligent categorization
financial_line_items: id, statement_id, category, account_name, amount, currency

-- Saved mapping templates
mapping_templates: id, company_id, template_name, column_mappings

-- Pre-calculated metrics for dashboards
financial_metrics: id, company_id, period_id, metric_type, value
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Neon PostgreSQL database
- Vercel account (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd warren-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@ep-xxxx.us-east-1.postgres.vercel-storage.com/verceldb?sslmode=require
   
   # Vercel Blob Storage
   BLOB_READ_WRITE_TOKEN=vercel_blob_token_here
   
   # Security
   ENCRYPTION_KEY=your_32_character_secret_key_here
   API_SECRET_KEY=your_api_secret_key_for_external_apps
   JWT_SECRET=your_jwt_secret_for_authentication
   
   # Locale Settings
   DEFAULT_LOCALE=es-MX
   SUPPORTED_LOCALES=en-US,es-MX,es-AR,es-CO,es-CL,es-PE
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   Visit `http://localhost:3000`

## 📖 Usage

### Web Interface

1. **Upload Excel File**: Drag and drop your financial Excel file
2. **Select Sheet**: Choose the sheet containing your financial data
3. **Review Analysis**: View automatic detection results and confidence scores
4. **Adjust Mapping**: Click columns to modify field mappings if needed
5. **Validate Data**: Review parsing results and error reports
6. **Save Data**: Choose company and optionally save mapping template

### API Integration

#### Authentication
All API requests require an API key in the Authorization header:
```bash
Authorization: Bearer your_api_key_here
X-Company-ID: company_uuid_here
```

#### Submit Parsing Job
```bash
POST /api/v1/parse
Content-Type: application/json

{
  "fileUrl": "https://example.com/excel.xlsx",
  "sheetName": "Balance General",
  "mappingTemplateId": "uuid",
  "webhookUrl": "https://your-app.com/webhook",
  "locale": "es-MX"
}
```

#### Check Job Status
```bash
GET /api/v1/parse/job_uuid_here

Response:
{
  "jobId": "job_uuid_here",
  "status": "completed",
  "progress": 100,
  "result": {
    "totalRows": 1247,
    "successRate": 95.2,
    "dataId": "parsed_data_uuid"
  }
}
```

#### Retrieve Parsed Data
```bash
GET /api/v1/data/parsed_data_uuid

Response:
{
  "companyId": "company_uuid",
  "totalRecords": 1247,
  "data": [...],
  "metadata": {
    "fileName": "balance_Q4.xlsx",
    "parsedAt": "2025-06-30T10:30:00Z"
  }
}
```

## 🔧 Configuration

### Supported File Formats
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- Maximum file size: 50MB

### Financial Statement Types
- **P&L (Estado de Resultados)**: Revenue, expenses, net income
- **Cash Flow (Flujo de Efectivo)**: Operating, investing, financing activities
- **Balance Sheet (Balance General)**: Assets, liabilities, equity

### Supported Locales
- `es-MX`: Spanish (Mexico)
- `es-AR`: Spanish (Argentina)  
- `es-CO`: Spanish (Colombia)
- `es-CL`: Spanish (Chile)
- `es-PE`: Spanish (Peru)
- `en-US`: English (United States)

### Currency Support
- MXN (Mexican Peso)
- USD (US Dollar)
- ARS (Argentine Peso)
- COP (Colombian Peso)
- CLP (Chilean Peso)
- PEN (Peruvian Sol)
- EUR (Euro)
- GBP (British Pound)

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   vercel login
   vercel link
   ```

2. **Set environment variables**
   ```bash
   vercel env add DATABASE_URL
   vercel env add BLOB_READ_WRITE_TOKEN
   vercel env add ENCRYPTION_KEY
   # ... add all required environment variables
   ```

3. **Deploy**
   ```bash
   vercel deploy --prod
   ```

### Database Migration
```bash
# Generate migration files
npm run db:generate

# Apply migrations to production
npm run db:migrate
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run type checking
npm run typecheck
```

### Test Data
The project includes sample Excel files for testing:
- Clean LATAM files with perfect formatting
- Messy real-world files with merged cells and inconsistent formats
- Edge cases: empty sheets, corrupted files, huge files
- Multiple locales: Mexican, Argentine, Colombian formats

## 📊 Performance

### Optimization Features
- **Streaming Processing**: Large Excel files processed in chunks
- **Edge Functions**: Quick metadata extraction
- **Background Jobs**: Heavy parsing in serverless functions
- **Caching**: Structure detection results cached
- **Database Optimization**: Indexes and materialized views for dashboard queries

### Rate Limits
- **File Uploads**: 10 files per hour per company
- **API Requests**: 100 requests per minute
- **Data Retrieval**: 1000 records per request

## 🔒 Security

### Security Features
- **File Validation**: Strict MIME type checking
- **Size Limits**: Maximum 50MB Excel files
- **Data Encryption**: Sensitive data encrypted at rest
- **API Authentication**: Secure API key management
- **Rate Limiting**: Protection against abuse
- **Input Sanitization**: SQL injection prevention

### Privacy & Compliance
- Data stored securely in Neon PostgreSQL
- Company-scoped data isolation
- Temporary file cleanup after processing
- Audit logging for all operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Project Wiki](wiki-url)
- **Issues**: [GitHub Issues](issues-url)
- **Email**: support@warren-parser.com
- **Community**: [Discord Server](discord-url)

## 🗺️ Roadmap

### Q1 2025
- [ ] Advanced financial ratio calculations
- [ ] Multi-period comparative analysis
- [ ] Budget vs actual variance reports
- [ ] Advanced data validation rules

### Q2 2025
- [ ] Machine learning-based mapping suggestions
- [ ] OCR support for scanned documents
- [ ] Integration with accounting software APIs
- [ ] White-label customization options

### Q3 2025
- [ ] Real-time collaboration features
- [ ] Advanced dashboard widgets
- [ ] Custom financial statement templates
- [ ] Mobile app for iOS/Android

---

**Built with ❤️ for the LATAM financial community**