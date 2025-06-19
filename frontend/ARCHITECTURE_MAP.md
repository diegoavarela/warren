# Warren Frontend Architecture Map

## Overview
Warren is a React-based financial dashboard application built with TypeScript, featuring secure authentication, multi-language support, currency conversion, and comprehensive financial data visualization.

## Technology Stack
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Context API (AuthContext)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Internationalization**: i18next
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios
- **Icons**: Heroicons

## Directory Structure

```
frontend/
├── src/
│   ├── App.tsx                 # Main app component with routing
│   ├── main.tsx               # Application entry point
│   ├── components/            # Reusable UI components
│   ├── pages/                 # Page components
│   ├── services/              # API services
│   ├── hooks/                 # Custom React hooks
│   ├── interfaces/            # TypeScript interfaces
│   ├── config/                # Configuration files
│   ├── i18n/                  # Internationalization
│   └── utils/                 # Utility functions
├── public/                    # Static assets
└── [configuration files]      # Package.json, tsconfig, etc.
```

## Routing Structure

### Public Routes
- `/` - Landing page
- `/login` - User authentication
- `/request-license` - License request form
- `/terms` - Terms of service
- `/privacy` - Privacy policy
- `/cookies` - Cookie policy

### Protected Routes (require authentication)
- `/home` - User home page
- `/cashflow` - Cash flow dashboard
- `/pnl` - Profit & Loss dashboard
- `/analysis` - AI-powered analysis
- `/configuration` - Company configuration
- `/admin` - Admin panel
- `/debug` - Debug information
- `/screenshot` - Screenshot tools

### Demo Routes (no auth required)
- `/demo/cashflow` - Demo cash flow dashboard
- `/demo/pnl` - Demo P&L dashboard
- `/demo/analysis` - Demo analysis page

## Component Hierarchy

### Layout Components
```
Layout
├── Navbar
│   ├── Logo
│   ├── Navigation Links
│   ├── User Menu
│   └── Language Switcher
└── Footer
    └── VortexFooter
```

### Page Components

#### DashboardPage (Cash Flow)
```
DashboardPage
├── CurrencySelector
├── FileUploadSection
├── Key Metrics Cards
│   ├── Current Month Card
│   └── Year to Date Card
├── CashflowChart
├── Widget Grid
│   ├── CashRunwayWidget
│   ├── BurnRateTrend
│   ├── ScenarioPlanning
│   ├── CashFlowStackedBar
│   ├── InvestmentsWidget
│   ├── BankingWidget
│   ├── TaxesWidget
│   └── OperationalAnalysisWidget
└── ExchangeRateModal
```

#### PnLDashboardPage
```
PnLDashboardPage
├── CurrencySelector
├── Revenue Metrics
├── Cost Metrics
├── Profit Analysis
└── Charts & Visualizations
```

#### AnalysisPage
```
AnalysisPage
├── AI Analysis Section
├── InteractiveChart
├── InteractiveTable
├── DrillDownModal
├── FollowUpQuestions
└── DataValidationChart
```

#### ConfigurationPageV2
```
ConfigurationPageV2
├── Company Selection
├── Company Form
├── Currency Settings
├── Data Upload Section
└── Integration Settings
```

## State Management

### Global State (Context)
1. **AuthContext**
   - User authentication state
   - Login/logout functionality
   - User profile information

### Hook-based State
1. **useCurrency**
   - Display currency preference
   - Unit scaling (thousands/millions)
   - Currency conversion
   - Exchange rate management

2. **useAuth**
   - Authentication state wrapper
   - Protected route handling

### Local Component State
- Form inputs
- Modal visibility
- Loading states
- Error handling
- Data fetching results

## Service Layer

### API Services
```
services/
├── authService.ts          # Authentication API
├── cashflowService.ts      # Cash flow data API
├── pnlService.ts          # P&L data API
├── configurationService.ts # Company config API
├── currencyService.ts      # Currency conversion
├── analysisService.ts      # AI analysis API
├── pdfExportService.ts     # PDF generation
└── mockDataService.ts      # Demo/screenshot data
```

### Service Pattern
- Axios-based HTTP client
- JWT token interceptor
- Error handling
- Type-safe responses

## Data Flow

### Authentication Flow
```
LoginPage → authService.login() → AuthContext → Protected Routes
```

### Data Loading Flow
```
Page Component → Service → API → Response → State Update → UI Render
```

### Currency Conversion Flow
```
useCurrency Hook → currencyService → Exchange Rate API → Converted Values
```

## UI Components

### Core Components
- **MetricCard**: Display key financial metrics
- **CurrencyValue**: Format and display currency values
- **CurrencySelector**: Switch display currency/unit
- **ChartRenderer**: Wrapper for Chart.js charts
- **TableRenderer**: Data table component

### Widget Components
- **CashRunwayWidget**: Cash runway projection
- **BurnRateTrend**: Burn rate analysis
- **ScenarioPlanning**: What-if scenarios
- **InvestmentsWidget**: Investment overview
- **BankingWidget**: Banking information
- **TaxesWidget**: Tax obligations
- **OperationalAnalysisWidget**: Operations metrics

### Form Components
- **FileUploadSection**: Excel file upload
- **ExchangeRateModal**: Manual exchange rate input
- **LicenseRequestModal**: License request form

### Navigation Components
- **Navbar**: Main navigation bar
- **ProtectedRoute**: Auth route wrapper
- **Footer**: Application footer

## Internationalization

### Supported Languages
- English (en)
- Spanish (es)

### Translation Structure
```
i18n/
├── index.ts           # i18n configuration
└── locales/
    ├── en.json       # English translations
    └── es.json       # Spanish translations
```

### Translation Keys
- `common.*` - Common UI elements
- `nav.*` - Navigation items
- `dashboard.*` - Dashboard content
- `auth.*` - Authentication messages
- `config.*` - Configuration labels

## Styling Architecture

### Tailwind CSS Classes
- Utility-first approach
- Custom gradient backgrounds
- Responsive design breakpoints
- Dark mode support (partial)

### Design System
- **Colors**: Purple/violet primary, gray secondary
- **Typography**: Inter font family
- **Spacing**: 4px base unit
- **Shadows**: Multiple elevation levels
- **Borders**: Rounded corners (xl)

## API Integration

### Base Configuration
```typescript
API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001'
```

### API Endpoints
- `/api/auth/*` - Authentication
- `/api/cashflow/*` - Cash flow data
- `/api/pnl/*` - P&L data
- `/api/configuration/*` - Settings
- `/api/analysis/*` - AI analysis

### Request Interceptors
- JWT token attachment
- Debug logging
- Error handling

## Security Features

1. **Authentication**
   - JWT-based auth
   - Protected routes
   - Session management

2. **Data Protection**
   - Encrypted API communication
   - Secure token storage
   - Input validation

## Performance Optimizations

1. **Code Splitting**
   - Route-based splitting
   - Lazy loading for heavy components

2. **Data Caching**
   - Service-level caching
   - Memoized calculations

3. **Rendering Optimizations**
   - React.memo for expensive components
   - useCallback for event handlers
   - Virtual scrolling for large lists

## Development Features

### Debug Mode
- Request/response logging
- Performance monitoring
- Error tracking

### Screenshot Mode
- Mock data injection
- Consistent demo state
- Screenshot-friendly layouts

### Demo Mode
- Pre-populated data
- No authentication required
- Feature showcase

## Build & Deployment

### Build Process
```bash
npm run build
```

### Environment Variables
- `VITE_API_URL` - Backend API URL
- Additional env vars in `.env` files

### Output
- Static files in `dist/`
- Optimized bundles
- Asset hashing for caching