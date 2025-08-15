# CLAUDE.md - Warren Configuration-Based System Guidelines

## Project Overview
Warren Configuration-Based System is the clean, production-ready version of the financial analytics platform that uses only configuration-driven data sources. This replaces all hardcoded data and legacy mapping systems while maintaining 100% identical UI/UX to Warren V2.

## Key Reference Documents
- **MIGRATION_PLAN.md** - CRITICAL: Complete 16-day migration plan with atomic tasks
- **ARCHITECTURE.md** - System design and data flow architecture
- **API_DOCUMENTATION.md** - All endpoint specifications and examples
- **DATABASE_CHANGES.md** - Required schema modifications and performance indexes
- **TESTING_STRATEGY.md** - Comprehensive testing approach for data accuracy
- **User_Journey_Maps.md** - User flows and requirements (maintain identical behavior)
- **lib/db/actual-schema.ts** - Database schema and relationships
- **lib/auth/rbac.ts** - Role-based access control definitions

## User Roles (Per User_Journey_Maps.md)
1. **Platform Admin** - Manages companies and organization admins
2. **Organization Admin** - Manages companies, users, and templates within their organization
3. **Regular User** - Views P&L and Cash Flow data only

## CRITICAL - Clean Configuration-Based System

### System Architecture
- **Data Source**: ONLY `processedFinancialData` table (configuration-based)
- **No Legacy Code**: All hardcoded data and old mapping systems REMOVED
- **Dashboard Data Flow**: `processedFinancialData` → New APIs → React Hooks → Dashboard UI
- **Identical UI/UX**: Pixel-perfect match with Warren V2, only data source is different

### Core Components (Keep & Use)
1. **Configuration System**: Complete configuration builder and management
2. **File Processing**: Upload, process with configuration, store in `processedFinancialData`
3. **Dashboard Components**: All existing UI components (unchanged visually)
4. **Authentication & Authorization**: User management and RBAC system

### CRITICAL - Configuration-Driven Data Flow
The system must follow this EXACT flow with NO GUESSING OR AUTO-DETECTION:

```
1. CREATE CONFIGURATION:
   User creates P&L or Cash Flow configuration
   ↓
   Maps Excel structure: periods, totals, categories  
   ↓
   Defines EXPLICIT period mapping (Column B = Jan 2025, Column I = Aug 2025, etc.)
   ↓
   Saves configuration to database

2. PROCESS EXCEL FILE:
   Upload Excel file
   ↓
   Select which configuration to use
   ↓
   Process using ONLY the configuration (no auto-detection, no guessing)
   ↓
   Store processed data with explicit column→period mapping

3. DASHBOARD DISPLAY:
   Dashboard requests data for specific period (e.g., "Aug 2025")
   ↓
   System looks up configuration: "Aug 2025" = "Column I" 
   ↓
   Reads Excel data from Column I for all categories/totals
   ↓
   Returns data for August 2025 (no guessing, no wrong columns)
```

### Data Architecture
```
Excel File → Configuration (Explicit Mapping) → processedFinancialData → API → Dashboard
                     ↓                                      ↓
            Column B = Jan 2025                    Exact column reads only
            Column I = Aug 2025
```

### CONFIGURATION RULES - NEVER BREAK THESE:
❌ **NEVER DO:**
- Auto-detect periods from Excel headers
- Guess which column contains which month  
- Use hardcoded date calculations
- Assume monthly progression (Jan, Feb, Mar...)
- Fall back to auto-detection when configuration exists
- Parse Excel date serial numbers for period detection

✅ **ALWAYS DO:**
- Use explicit configuration mapping ONLY
- Read exact columns specified in configuration
- Trust user's period definitions completely  
- Configuration overrides everything else
- Let user define any period format (monthly, quarterly, yearly, custom)

### New API Endpoints (Configuration-Based)
- `GET /api/processed-data/pnl/[companyId]` - P&L dashboard data
- `GET /api/processed-data/cashflow/[companyId]` - Cash Flow dashboard data  
- `GET /api/processed-data/companies/[companyId]/periods` - Available periods
- `GET /api/processed-data/[companyId]/summary` - Data summary

### Migration Completed Status
✅ **Phase 1**: Repository setup and documentation complete
🔄 **Phase 2**: Ready to begin database performance optimization
⏳ **Phase 3-10**: Execute remaining migration phases per MIGRATION_PLAN.md

## Critical Requirements

### UI/UX Standards
- **Font Readability**: All financial data must be clearly readable with appropriate font sizes
- **Card Structure**: Consistent, well-structured cards for all widgets
- **Help System**: Every card/widget must have a "?" help icon with multilingual explanations
- **Button Consistency**: Same text and styling for similar actions
- **No Page Refreshes**: Smooth SPA experience without unexpected refreshes

### Multilingual Support
- All UI elements must support multiple languages
- Use translations from `lib/translations.ts`
- Currency selector must show country flags
- Help content must be available in all supported languages

### Navigation Flow
1. **Upload Flow**: Upload → Configuration Selection → Mapping → Process → Dashboard
2. **Dashboard Access**: Only P&L and Cash Flow (NO Executive Dashboard)
3. **Company Context**: Must persist throughout all pages
4. **After Processing**: Show "View Dashboard" button that navigates to appropriate dashboard (P&L or Cash Flow)
5. **Data Source**: ALL data comes from `processedFinancialData` table (configuration-based)

### Dashboard Requirements

#### P&L Dashboard Must Include:
1. Company - Period - Last update (at top)
2. Filters: Period, Compare with, Currency, Units
3. YTD Section (improved design)
4. Revenue Section (readable fonts)
5. Costs Section (readable fonts)
6. Personnel Costs widget
7. Revenue Growth Analysis widget
8. Profitability Section
9. Operating Expenses Analysis (hide if no data)
10. Cost Efficiency & Tax Summary
11. Trends Analysis with proper 6-month view
12. Heatmaps with labels and click-to-recalculate
13. Bank Summary & Investment Portal with titles
14. Key Insights

#### Cash Flow Dashboard Must Include:
- Must show EXACTLY as Warren V2 (pixel-perfect match)
- ALL data from `processedFinancialData` table (configuration-based)
- All existing widgets: Growth Analysis, Forecast Trends, Scenario Planning, Runway Analysis
- Same calculations and metrics as Warren V2
- Same UI/UX as Warren V2 implementation

### Upload Process Requirements
1. Template selection at start (organization-wide templates)
2. Auto-detect units immediately
3. Clear instructions for Visual Mapper
4. Show AI analysis progress
5. Consistent button naming
6. Filter empty rows
7. Improved validation summary UI
8. Navigate to P&L after save

### Security & Authentication
- Platform Admin: Mandatory 2FA
- Organizations: Optional 2FA configuration
- Email invites for new users
- Proper session management

### Technical Requirements
- Database: NEON PostgreSQL
- Deployment: Vercel
- Email: AWS SES Lambda
- Testing: Jest + Playwright (80% coverage)
- Export: Professional PDF/Excel formats

## Development Guidelines

### Component Standards
```typescript
// Every dashboard widget must follow this pattern
interface WidgetProps {
  data: any;
  onHelp?: () => void;
  locale: string;
  companyId: string;
  period: string;
}

// Help modal for every widget
<HelpIcon onClick={() => showHelp('widget.help.key')} />
```

### State Management
- Company context in sessionStorage and React Context
- Persist user preferences (language, currency, units)
- Clear loading and error states

### API Patterns
```typescript
// All API calls must handle:
- Loading states
- Error messages (multilingual)
- Success notifications
- Proper type safety
```

### Testing Requirements
- Unit tests for all components
- Integration tests for flows
- E2E tests for user journeys
- Visual regression tests for dashboards

## Common Issues to Avoid
1. Don't create new dashboards - only P&L and Cash Flow
2. Don't add features not in User_Journey_Maps.md
3. Don't skip help icons or multilingual support
4. Don't create inconsistent UI patterns
5. Don't ignore readability issues
6. **NEVER use browser alerts** - Use toast notifications instead
7. **NEVER use hardcoded data** - All data must come from `processedFinancialData`
8. **NEVER change dashboard UI/UX** - Must be pixel-perfect match with Warren V2
9. **NEVER skip data accuracy testing** - All calculations must match Warren V2 exactly

## UI/UX Standards - CRITICAL
### Toast Notifications
- **NEVER** use `alert()`, `confirm()`, or `prompt()` - these are terrible UX
- **ALWAYS** use the toast notification system: `components/ui/Toast.tsx`
- Import: `import { useToast, ToastContainer } from '@/components/ui/Toast'`
- Usage: `toast.success()`, `toast.error()`, `toast.warning()`, `toast.info()`
- Add `<ToastContainer />` to render toasts

## Development Process (Configuration-Based System)

### Before Starting Any Task:
1. ✅ Check **MIGRATION_PLAN.md** for current phase and task status
2. ✅ Review **ARCHITECTURE.md** for data flow and system design
3. ✅ Check **API_DOCUMENTATION.md** for endpoint specifications
4. ✅ Review **TESTING_STRATEGY.md** for testing requirements
5. ✅ Ensure task aligns with User_Journey_Maps.md

### When Implementing:
1. **Data Source**: Use ONLY `processedFinancialData` table via new APIs
2. **UI/UX**: Maintain pixel-perfect match with Warren V2
3. **Testing**: Include data accuracy tests comparing to Warren V2
4. **Performance**: API responses must be <500ms
5. **Multilingual**: All UI elements must support multiple languages
6. **Help Content**: Every widget needs help icon with explanations
7. **Role-Based Access**: Verify permissions for all user types
8. **Error Handling**: Use toast notifications, never browser alerts

### Questions to Ask:
- Does this use configuration-based data from `processedFinancialData`?
- Are calculations identical to Warren V2?
- Is the UI pixel-perfect match with Warren V2?
- Does it work for all 3 user types (Platform Admin, Org Admin, Regular User)?
- Are there comprehensive tests (unit, integration, E2E, data accuracy)?
- Is performance optimized (<500ms API responses)?
- Is it multilingual with help content?

## 🚨 CRITICAL FINANCIAL DATA RULE 🚨
**NEVER USE MOCK DATA IN THIS PROJECT - EVER**

This is a financial dashboard where accuracy is paramount. Mock data can:
- Lead to incorrect financial decisions
- Hide bugs in calculations
- Give false confidence in numbers
- Create dangerous discrepancies between test and production

**Always use real data from:**
- Actual Excel files
- Real database records  
- Live API processing
- Configured mappings

**If data is not available:**
- Show loading states
- Display error messages
- Return empty/null values
- Never fabricate financial numbers

**Mock data is only acceptable for:**
- UI layout testing (with clear "DEMO" labels)
- Unit test fixtures (in test files only)
- Development scaffolding (removed before commit)

### Code Quality Standards:
- **TypeScript**: Full type safety, no `any` types
- **Error Handling**: Comprehensive error boundaries and API error handling
- **Performance**: Optimized queries, caching, lazy loading
- **Testing**: 90%+ coverage with data accuracy validation
- **Documentation**: Clear comments and API documentation
- **FINANCIAL DATA**: No mock data, ever - real data only