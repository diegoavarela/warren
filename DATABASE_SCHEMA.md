# Warren Database Schema Documentation

## Overview
Warren uses PostgreSQL (Neon) with Drizzle ORM for database operations. The schema is designed to support a multi-tenant financial analytics platform with configuration-driven data processing.

## Core Architecture
The database follows a hierarchical structure:
- **Organizations** → Top-level tenants
- **Companies** → Business entities within organizations  
- **Users** → People with access to organizations/companies
- **Configurations** → Templates for processing financial data
- **Financial Data** → Processed and raw financial information

## Table Structure

### 🏢 Organization & User Management

#### `organizations`
Multi-tenant organization management.
- `id` (UUID, PK) - Unique identifier
- `name` (VARCHAR 255) - Organization name
- `subdomain` (VARCHAR 100, UNIQUE) - Custom subdomain
- `tier` (VARCHAR 50) - Subscription tier (default: 'starter')
- `locale` (VARCHAR 5) - Default locale (default: 'en-US')
- `baseCurrency` (VARCHAR 3) - Default currency (default: 'USD')
- `timezone` (VARCHAR 50) - Organization timezone (default: 'UTC')
- `fiscalYearStart` (INTEGER) - Month number for fiscal year start (default: 1)
- `isActive` (BOOLEAN) - Active status (default: true)
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `users`
User accounts with organization association.
- `id` (UUID, PK) - Unique identifier
- `email` (VARCHAR 255, UNIQUE) - User email address
- `passwordHash` (VARCHAR 255) - Hashed password
- `firstName` (VARCHAR 100) - User's first name
- `lastName` (VARCHAR 100) - User's last name
- `organizationId` (UUID, FK → organizations) - Parent organization
- `role` (VARCHAR 50) - User role (default: 'user')
- `locale` (VARCHAR 5) - User's preferred locale
- `isActive` (BOOLEAN) - Active status (default: true)
- `isEmailVerified` (BOOLEAN) - Email verification status (default: false)
- `lastLoginAt` (TIMESTAMP) - Last login timestamp
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `companies`
Business entities within organizations.
- `id` (UUID, PK) - Unique identifier
- `organizationId` (UUID, FK → organizations) - Parent organization
- `name` (VARCHAR 255) - Company name
- `taxId` (VARCHAR 100) - Tax identification number
- `industry` (VARCHAR 100) - Industry classification
- `locale` (VARCHAR 5) - Company locale
- `baseCurrency` (VARCHAR 3) - Default currency
- `fiscalYearStart` (INTEGER) - Fiscal year start month
- `cashflowDirectMode` (BOOLEAN) - Direct cashflow mode (default: false)
- `isActive` (BOOLEAN) - Active status (default: true)
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `company_users`
Many-to-many relationship between companies and users.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `userId` (UUID, FK → users) - User reference
- `role` (VARCHAR 50) - User's role in company (default: 'user')
- `permissions` (JSONB) - Custom permissions
- `isActive` (BOOLEAN) - Active status (default: true)
- `invitedAt` (TIMESTAMP) - Invitation timestamp
- `joinedAt` (TIMESTAMP) - Join timestamp
- `invitedBy` (UUID, FK → users) - Inviting user
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (companyId, userId)

### 📊 Configuration-Driven Architecture

#### `company_configurations`
Configuration templates for processing Excel files.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `version` (INTEGER) - Configuration version (default: 1)
- `type` (VARCHAR 20) - Configuration type ('cashflow' | 'pnl')
- `name` (VARCHAR 255) - Configuration name
- `description` (TEXT) - Configuration description
- `configJson` (JSONB) - Full configuration structure including:
  - `structure` - Excel structure mapping
  - `categories` - Category definitions
  - `totals` - Total row mappings
  - `periods` - Period column mappings
- `metadata` (JSONB) - Additional metadata (currency, units, locale)
- `isActive` (BOOLEAN) - Active status (default: true)
- `isTemplate` (BOOLEAN) - Can be used as template (default: false)
- `parentConfigId` (UUID) - Parent template reference
- `createdBy` (UUID, FK → users) - Creator reference
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (companyId, type, version)

#### `financial_data_files`
Uploaded Excel file storage and metadata.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `filename` (VARCHAR 255) - System filename
- `originalFilename` (VARCHAR 255) - Original uploaded filename
- `filePath` (VARCHAR 500) - Legacy file path (optional)
- `fileContent` (TEXT) - Base64 encoded file content
- `fileSize` (INTEGER) - File size in bytes
- `fileHash` (VARCHAR 64) - SHA256 hash for deduplication
- `mimeType` (VARCHAR 100) - MIME type
- `uploadSession` (VARCHAR 100) - Upload session identifier
- `uploadedBy` (UUID, FK → users) - Uploader reference
- `uploadedAt` (TIMESTAMP) - Upload timestamp
- `createdAt` (TIMESTAMP) - Creation timestamp

#### `processed_financial_data`
Processed financial data storage.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `configId` (UUID, FK → company_configurations) - Configuration used
- `fileId` (UUID, FK → financial_data_files) - Source file
- `dataJson` (JSONB) - Processed data in standardized format
- `validationResults` (JSONB) - Validation errors/warnings
- `processingStatus` (VARCHAR 50) - Status (pending|processing|completed|failed)
- `processingError` (TEXT) - Error message if failed
- `periodStart` (DATE) - Period start date
- `periodEnd` (DATE) - Period end date
- `currency` (VARCHAR 3) - Data currency
- `units` (VARCHAR 20) - Units (normal|thousands|millions)
- `processedBy` (UUID, FK → users) - Processor reference
- `processedAt` (TIMESTAMP) - Processing timestamp
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (companyId, configId, fileId)

### 💼 Legacy Financial Data

#### `financial_statements`
Legacy financial statement storage.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `organizationId` (UUID, FK → organizations) - Organization reference
- `statementType` (VARCHAR 50) - Statement type (P&L, Cash Flow, etc.)
- `periodStart` (DATE) - Period start date
- `periodEnd` (DATE) - Period end date
- `currency` (VARCHAR 3) - Statement currency
- `sourceFile` (VARCHAR 255) - Source file name
- `processingJobId` (UUID) - Processing job reference
- `isAudited` (BOOLEAN) - Audit status
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `financial_line_items`
Legacy line item details for financial statements.
- `id` (UUID, PK) - Unique identifier
- `statementId` (UUID, FK → financial_statements) - Parent statement
- `accountCode` (VARCHAR 100) - Account code
- `accountName` (VARCHAR 255) - Account name
- `lineItemType` (VARCHAR 50) - Item type
- `category` (VARCHAR 100) - Category
- `subcategory` (VARCHAR 100) - Subcategory
- `amount` (DECIMAL 15,2) - Amount value
- `percentageOfRevenue` (DECIMAL 5,2) - Percentage of revenue
- `yearOverYearChange` (DECIMAL 5,2) - YoY change percentage
- `notes` (TEXT) - Additional notes
- `isCalculated` (BOOLEAN) - Calculated field indicator
- `isSubtotal` (BOOLEAN) - Subtotal indicator
- `isTotal` (BOOLEAN) - Total indicator
- `parentItemId` (UUID) - Parent item reference
- `displayOrder` (INTEGER) - Display order
- `originalText` (VARCHAR 255) - Original text from source
- `confidenceScore` (DECIMAL 5,2) - ML confidence score
- `metadata` (JSONB) - Additional metadata
- `createdAt` (TIMESTAMP) - Creation timestamp

#### `mapping_templates`
Legacy mapping templates for Excel processing.
- `id` (UUID, PK) - Unique identifier
- `organizationId` (UUID, FK → organizations) - Organization reference
- `companyId` (UUID, FK → companies) - Company reference
- `templateName` (VARCHAR 255) - Template name
- `statementType` (VARCHAR 50) - Statement type
- `filePattern` (VARCHAR 255) - File pattern for matching
- `columnMappings` (JSONB) - Column mapping configuration
- `validationRules` (JSONB) - Validation rules
- `locale` (VARCHAR 5) - Template locale
- `currency` (VARCHAR 3) - Default currency
- `units` (VARCHAR 20) - Units (normal|thousands|millions)
- `periodStart` (DATE) - Period start
- `periodEnd` (DATE) - Period end
- `periodType` (VARCHAR 20) - Period type (monthly|quarterly|yearly)
- `detectedPeriods` (JSONB) - Array of detected periods
- `isDefault` (BOOLEAN) - Default template flag
- `usageCount` (INTEGER) - Usage counter
- `lastUsedAt` (TIMESTAMP) - Last usage timestamp
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

### 🔧 System & Operations

#### `processing_jobs`
Background job processing queue.
- `id` (UUID, PK) - Unique identifier
- `jobType` (VARCHAR 50) - Job type
- `status` (VARCHAR 50) - Job status
- `priority` (INTEGER) - Job priority (default: 0)
- `payload` (JSONB) - Job payload data
- `result` (JSONB) - Job result data
- `error` (TEXT) - Error message if failed
- `progress` (INTEGER) - Progress percentage (default: 0)
- `attempts` (INTEGER) - Attempt count (default: 0)
- `maxAttempts` (INTEGER) - Maximum attempts (default: 3)
- `scheduledAt` (TIMESTAMP) - Schedule timestamp
- `startedAt` (TIMESTAMP) - Start timestamp
- `completedAt` (TIMESTAMP) - Completion timestamp
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `api_keys`
API key management for external integrations.
- `id` (UUID, PK) - Unique identifier
- `organizationId` (UUID, FK → organizations) - Organization reference
- `companyId` (UUID, FK → companies) - Company reference
- `keyHash` (VARCHAR 255, UNIQUE) - Hashed API key
- `keyName` (VARCHAR 100) - Key name/description
- `permissions` (JSONB) - Key permissions
- `rateLimit` (INTEGER) - Rate limit (default: 100)
- `rateLimitWindow` (INTEGER) - Rate limit window in seconds (default: 3600)
- `lastUsedAt` (TIMESTAMP) - Last usage timestamp
- `expiresAt` (TIMESTAMP) - Expiration timestamp
- `isActive` (BOOLEAN) - Active status (default: true)
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `system_settings`
Platform-wide configuration settings.
- `id` (UUID, PK) - Unique identifier
- `key` (VARCHAR 100, UNIQUE) - Setting key
- `value` (JSONB) - Setting value
- `category` (VARCHAR 50) - Setting category
- `description` (TEXT) - Setting description
- `isSecret` (BOOLEAN) - Secret flag (default: false)
- `lastModifiedBy` (UUID, FK → users) - Last modifier
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp

#### `parsing_logs`
Excel parsing operation logs.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `uploadSession` (VARCHAR 100) - Upload session identifier
- `fileName` (VARCHAR 255) - File name
- `status` (VARCHAR 50) - Parsing status
- `stage` (VARCHAR 50) - Current processing stage
- `details` (JSONB) - Detailed log information
- `processingTimeMs` (INTEGER) - Processing time in milliseconds
- `createdAt` (TIMESTAMP) - Creation timestamp

### 🏷️ Subcategory Management

#### `subcategory_templates`
Organization-level subcategory templates.
- `id` (UUID, PK) - Unique identifier
- `organizationId` (UUID, FK → organizations) - Organization reference
- `name` (VARCHAR 255) - Template name
- `description` (TEXT) - Template description
- `isDefault` (BOOLEAN) - Default template flag
- `isActive` (BOOLEAN) - Active status (default: true)
- `createdBy` (UUID, FK → users) - Creator reference
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (organizationId, name)

#### `organization_subcategories`
Organization-specific subcategories.
- `id` (UUID, PK) - Unique identifier
- `organizationId` (UUID, FK → organizations) - Organization reference
- `templateId` (UUID, FK → subcategory_templates) - Template reference
- `value` (VARCHAR 100) - Subcategory value
- `label` (VARCHAR 255) - Display label
- `mainCategories` (JSONB) - Array of applicable main categories
- `isActive` (BOOLEAN) - Active status (default: true)
- `createdBy` (UUID, FK → users) - Creator reference
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (organizationId, value)

#### `company_subcategory_templates`
Company-level template selections.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `templateId` (UUID, FK → subcategory_templates) - Template reference
- `name` (VARCHAR 255) - Template name
- `description` (TEXT) - Template description
- `isActive` (BOOLEAN) - Active status (default: true)
- `isDefault` (BOOLEAN) - Default template flag
- `createdBy` (UUID, FK → users) - Creator reference
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (companyId, name)

#### `company_subcategories`
Company-specific subcategory overrides.
- `id` (UUID, PK) - Unique identifier
- `companyId` (UUID, FK → companies) - Company reference
- `companyTemplateId` (UUID, FK → company_subcategory_templates) - Company template
- `organizationSubcategoryId` (UUID, FK → organization_subcategories) - Org subcategory
- `value` (VARCHAR 100) - Subcategory value
- `label` (VARCHAR 255) - Display label
- `mainCategories` (JSONB) - Array of applicable main categories
- `isActive` (BOOLEAN) - Active status (default: true)
- `isOverride` (BOOLEAN) - Override flag (default: false)
- `createdBy` (UUID, FK → users) - Creator reference
- `createdAt` (TIMESTAMP) - Creation timestamp
- `updatedAt` (TIMESTAMP) - Last update timestamp
- **Unique constraint**: (companyId, value)

## Key Relationships

### Primary Relationships
1. **Organization → Users**: One-to-many
2. **Organization → Companies**: One-to-many
3. **Company → Users**: Many-to-many (via company_users)
4. **Company → Configurations**: One-to-many
5. **Company → Financial Data Files**: One-to-many
6. **Configuration + File → Processed Data**: One-to-many

### Configuration Flow
```
Company → Configuration → Excel File → Processed Data → Dashboard
         ↓                           ↓                 ↓
    (defines mapping)        (raw data source)   (standardized output)
```

## Important JSONB Structures

### `company_configurations.configJson`
```json
{
  "structure": {
    "dataRows": {
      "revenue": 10,
      "cogs": 15,
      "opex": 25,
      "taxes": 35
    },
    "totalRows": {
      "grossProfit": 20,
      "operatingIncome": 30,
      "netIncome": 40
    }
  },
  "categories": {
    "revenue": {
      "Sales": 11,
      "Services": 12
    },
    "cogs": {
      "Materials": 16,
      "Labor": 17
    },
    "opex": {
      "Marketing": 26,
      "Admin": 27
    }
  },
  "periods": {
    "columnB": "Jan 2025",
    "columnC": "Feb 2025",
    "columnD": "Mar 2025"
  },
  "metadata": {
    "currency": "USD",
    "units": "thousands",
    "selectedSheet": "P&L Statement"
  }
}
```

### `processed_financial_data.dataJson`
```json
{
  "periods": ["Jan 2025", "Feb 2025", "Mar 2025"],
  "dataRows": {
    "revenue": {
      "total": [100000, 110000, 120000],
      "categories": {
        "Sales": [80000, 85000, 90000],
        "Services": [20000, 25000, 30000]
      }
    },
    "cogs": {
      "total": [60000, 65000, 70000],
      "categories": {
        "Materials": [40000, 43000, 46000],
        "Labor": [20000, 22000, 24000]
      }
    }
  },
  "totals": {
    "grossProfit": [40000, 45000, 50000],
    "operatingIncome": [20000, 23000, 26000],
    "netIncome": [15000, 17000, 19000]
  }
}
```

## Indexes & Performance

### Recommended Indexes
```sql
-- Company access queries
CREATE INDEX idx_company_users_user_company ON company_users(userId, companyId);
CREATE INDEX idx_company_users_company ON company_users(companyId);

-- Configuration lookups
CREATE INDEX idx_configs_company_type ON company_configurations(companyId, type, isActive);
CREATE INDEX idx_configs_company_active ON company_configurations(companyId, isActive);

-- Processed data queries
CREATE INDEX idx_processed_company_config ON processed_financial_data(companyId, configId);
CREATE INDEX idx_processed_status ON processed_financial_data(processingStatus);
CREATE INDEX idx_processed_period ON processed_financial_data(companyId, periodStart, periodEnd);

-- File lookups
CREATE INDEX idx_files_company ON financial_data_files(companyId);
CREATE INDEX idx_files_hash ON financial_data_files(fileHash);

-- Job processing
CREATE INDEX idx_jobs_status ON processing_jobs(status, scheduledAt);
CREATE INDEX idx_jobs_type_status ON processing_jobs(jobType, status);
```

## Migration Strategy

### From Legacy to Configuration-Driven
1. **Phase 1**: Create new tables alongside legacy
2. **Phase 2**: Migrate active companies to configurations
3. **Phase 3**: Process historical data with configurations
4. **Phase 4**: Deprecate legacy tables
5. **Phase 5**: Remove legacy code and tables

### Data Retention
- **Financial Data**: 7 years minimum (regulatory)
- **Processing Logs**: 90 days
- **API Logs**: 30 days
- **User Activity**: 1 year

## Security Considerations

### Sensitive Data
- `users.passwordHash` - Bcrypt hashed passwords
- `api_keys.keyHash` - SHA256 hashed API keys
- `financial_data_files.fileContent` - Encrypted at rest
- `processed_financial_data.dataJson` - Row-level security

### Access Control
- Organization-level isolation
- Company-level permissions
- Role-based access control (RBAC)
- API key scoping

## Backup & Recovery

### Backup Strategy
- **Full backups**: Daily at 2 AM UTC
- **Incremental backups**: Every 6 hours
- **Point-in-time recovery**: 7-day window
- **Geographic redundancy**: Multi-region replication

### Critical Tables Priority
1. `companies` - Business entities
2. `company_configurations` - Processing templates
3. `processed_financial_data` - Financial results
4. `financial_data_files` - Source documents
5. `users` - User accounts

## Monitoring & Alerts

### Key Metrics
- Table sizes and growth rates
- Query performance (>100ms)
- Connection pool utilization
- Transaction rollback rates
- Lock contention

### Alert Thresholds
- Database size > 80% of limit
- Query time > 1 second
- Connection pool > 90% utilized
- Failed jobs > 10% in 1 hour
- Processing queue depth > 100

## Future Considerations

### Planned Enhancements
1. **Partitioning**: Partition `processed_financial_data` by year
2. **Archival**: Move old data to cold storage
3. **Caching**: Redis layer for frequently accessed data
4. **Search**: Elasticsearch for financial data search
5. **Analytics**: Dedicated OLAP database for reporting

### Scalability Targets
- 10,000 organizations
- 100,000 companies
- 1M processed files
- 10M financial records
- 100 requests/second