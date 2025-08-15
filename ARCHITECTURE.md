# Warren Configuration-Based System Architecture

## Overview
This document outlines the architecture for the Warren configuration-based system, which replaces hardcoded data sources with a flexible, configuration-driven approach.

## Current State vs Target State

### Current State (Warren V2)
```
P&L Dashboard:
Excel Files → Old Mapping System → useFinancialData Hook → Dashboard UI

Cash Flow Dashboard:
Hardcoded Data → DirectCashFlowProvider → Dashboard UI

Configuration System:
Excel Files → Configuration Templates → Manual Mapping → Database Storage
```

### Target State (Warren Configuration-Based)
```
Unified Flow:
Excel Files → Configuration Processing → processedFinancialData Table → API Layer → React Hooks → Dashboard UI

Configuration System:
Excel Files → Visual Configuration Builder → Validation → Database Storage → Processing Engine
```

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Next.js Frontend)                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Dashboard Components  │  Configuration UI  │  File Processing UI  │  Auth UI   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           REACT HOOKS & STATE MANAGEMENT                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  useProcessedPnLData   │  useProcessedCashFlow │  useConfigurations │  useAuth   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              API LAYER (Next.js API Routes)                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│  /processed-data/*     │  /configurations/*    │  /files/*          │  /auth/*   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              SERVICE LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ProcessedDataService  │  ConfigurationService │  ExcelProcessing   │  AuthService │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              DATABASE LAYER (NEON PostgreSQL)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  processed_financial_data  │  company_configurations  │  financial_data_files   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### 1. Configuration Creation Flow
```
User → Configuration UI → Configuration Builder → Validation → Database Storage
     ↓
Excel Preview → Visual Mapping → Category Builder → Structure Definition → Save
```

### 2. File Processing Flow  
```
Excel File Upload → File Storage (Database) → Configuration Selection → Processing Engine
                 ↓
Excel Parsing → Configuration Application → Data Transformation → processedFinancialData
                 ↓
Success Response → Dashboard Navigation → Data Display
```

### 3. Dashboard Data Flow
```
Dashboard Request → API Endpoint → ProcessedDataService → Database Query
                ↓
Data Transformation → Response Formation → React Hook → Component Rendering
```

## Database Schema Architecture

### Core Tables

#### company_configurations
```sql
CREATE TABLE company_configurations (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('pnl', 'cashflow')),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  config_json JSONB NOT NULL,  -- Configuration structure
  metadata JSONB,              -- Currency, locale, units
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### processed_financial_data
```sql
CREATE TABLE processed_financial_data (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  config_id UUID REFERENCES company_configurations(id),
  file_id UUID REFERENCES financial_data_files(id),
  data_json JSONB NOT NULL,           -- Processed financial data
  validation_results JSONB,          -- Processing validation info
  processing_status VARCHAR(50) DEFAULT 'pending',
  period_start DATE,
  period_end DATE,
  currency VARCHAR(3),
  units VARCHAR(20),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP DEFAULT NOW()
);
```

#### financial_data_files
```sql
CREATE TABLE financial_data_files (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_content TEXT,                  -- Base64 encoded Excel file
  file_size INTEGER NOT NULL,
  file_hash VARCHAR(64),
  upload_session VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);
```

### Performance Indexes
```sql
-- Dashboard query optimization
CREATE INDEX idx_processed_data_company_period ON processed_financial_data(company_id, period_start, period_end);
CREATE INDEX idx_processed_data_config ON processed_financial_data(config_id);
CREATE INDEX idx_configurations_company_type ON company_configurations(company_id, type, is_active);
CREATE INDEX idx_files_company_session ON financial_data_files(company_id, upload_session);
```

## API Architecture

### RESTful API Design

#### Configuration Management
```
GET    /api/configurations                    # List configurations
POST   /api/configurations                    # Create configuration
GET    /api/configurations/[id]               # Get configuration
PUT    /api/configurations/[id]               # Update configuration
DELETE /api/configurations/[id]               # Delete configuration
POST   /api/configurations/[id]/validate      # Validate configuration
```

#### File Processing
```
POST   /api/files/upload                      # Upload Excel file
POST   /api/files/process                     # Process file with config
GET    /api/files/[id]                        # Get file info
```

#### Processed Data (New)
```
GET    /api/processed-data/pnl/[companyId]              # P&L dashboard data
GET    /api/processed-data/cashflow/[companyId]         # Cash Flow dashboard data  
GET    /api/processed-data/companies/[companyId]/periods # Available periods
GET    /api/processed-data/[companyId]/summary          # Data summary
```

### API Response Format
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

## Component Architecture

### Dashboard Component Structure
```
DashboardPage
├── CompanyContextBar           # Company selection and context
├── DashboardFilters            # Period, currency, units filters  
├── DashboardMetrics            # KPI cards and summary metrics
├── DashboardCharts             # Chart components
│   ├── RevenueChart
│   ├── ProfitabilityChart  
│   ├── TrendsChart
│   └── HeatmapChart
├── DashboardWidgets            # Specialized widgets
│   ├── PersonnelCostsWidget
│   ├── RevenueGrowthWidget
│   ├── KeyInsightsWidget
│   └── CashFlowAnalysisWidget
└── DashboardActions            # Export, share, settings
```

### Configuration Component Structure
```
ConfigurationPage
├── ConfigurationForm           # Basic configuration info
├── ExcelGridHelper             # Excel structure mapping
├── DataRowsEditor              # Data row configuration
├── CategoryBuilder             # Category mapping
│   ├── CategoryForm
│   ├── ExcelGrid
│   └── CategoryList
├── ConfigurationPreview        # Preview and validation
└── ConfigurationActions        # Save, test, deploy
```

## Service Layer Architecture

### ProcessedDataService
```typescript
class ProcessedDataService {
  // Data retrieval
  async getPnLData(companyId: string, period?: string): Promise<PnLData>
  async getCashFlowData(companyId: string, period?: string): Promise<CashFlowData>
  async getAvailablePeriods(companyId: string): Promise<Period[]>
  async getDataSummary(companyId: string): Promise<DataSummary>
  
  // Data transformation
  transformToPnLFormat(processedData: ProcessedFinancialData): PnLData
  transformToCashFlowFormat(processedData: ProcessedFinancialData): CashFlowData
  
  // Caching and optimization
  getCachedData(key: string): Promise<any>
  setCachedData(key: string, data: any, ttl: number): Promise<void>
}
```

### ConfigurationService
```typescript
class ConfigurationService {
  // Configuration management
  async validateConfiguration(config: Configuration): Promise<ValidationResult>
  async saveConfiguration(config: Configuration): Promise<Configuration>
  async getActiveConfigurations(companyId: string): Promise<Configuration[]>
  
  // Excel processing
  async parseExcelWithConfiguration(fileContent: string, configId: string): Promise<ProcessedData>
  async generatePreview(config: Configuration): Promise<ConfigurationPreview>
}
```

## React Hooks Architecture

### Data Fetching Hooks
```typescript
// P&L Data Hook
function useProcessedPnLData(companyId: string, options?: DataOptions) {
  return {
    data: PnLData | null,
    loading: boolean,
    error: Error | null,
    refetch: () => void,
    updatePeriod: (period: string) => void
  }
}

// Cash Flow Data Hook  
function useProcessedCashFlowData(companyId: string, options?: DataOptions) {
  return {
    data: CashFlowData | null,
    loading: boolean, 
    error: Error | null,
    refetch: () => void,
    updatePeriod: (period: string) => void
  }
}

// Periods Hook
function useProcessedDataPeriods(companyId: string) {
  return {
    periods: Period[],
    loading: boolean,
    error: Error | null,
    currentPeriod: Period | null,
    setPeriod: (period: Period) => void
  }
}
```

## Security Architecture

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Company-level data isolation
- API route protection

### Data Security  
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- File upload security

### API Security
- Rate limiting
- CORS configuration  
- Request/response logging
- Error information sanitization

## Performance Architecture

### Caching Strategy
```
Level 1: React Query/SWR (Client-side caching)
Level 2: Redis/Memory Cache (Server-side caching) 
Level 3: Database Query Optimization (Indexes, computed columns)
```

### Database Optimization
- Proper indexing for dashboard queries
- Query result caching
- Connection pooling
- Read replicas for reporting queries

### Frontend Optimization
- Code splitting by route
- Component lazy loading
- Image optimization
- Bundle size optimization

## Monitoring & Observability

### Application Monitoring
- Error tracking and alerting
- Performance metrics
- User behavior analytics  
- API response time monitoring

### Infrastructure Monitoring
- Database performance
- Server resource utilization
- Network latency
- Third-party service health

## Deployment Architecture

### Development Environment
```
Local Development → Git Push → GitHub Actions → Development Deploy (Vercel)
```

### Production Environment  
```
Feature Branch → Pull Request → Code Review → Merge → Production Deploy (Vercel)
```

### Database Management
```
Local DB → Staging DB → Production DB (NEON PostgreSQL)
      ↓         ↓           ↓
   Migrations  Testing   Production
```

## Migration Strategy

### Data Migration
- No destructive changes to existing data
- New tables created alongside existing ones
- Dual-write pattern during transition
- Gradual migration of dashboards

### Code Migration
- Feature flags for old vs new system
- A/B testing capabilities
- Gradual rollout by user segments
- Complete rollback capability

This architecture ensures scalability, maintainability, and reliability while providing a clear path for migration from the current system.