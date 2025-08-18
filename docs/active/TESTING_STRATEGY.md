# Warren Configuration-Based Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for the Warren configuration-based system migration, ensuring 100% feature parity with Warren V2 and bulletproof reliability.

## Testing Objectives

### Primary Goals
1. **Data Accuracy**: Configuration-based dashboards show identical values to Warren V2
2. **UI/UX Parity**: Pixel-perfect visual match with Warren V2
3. **Performance**: Dashboard load times ≤ Warren V2 performance
4. **Reliability**: Zero regressions in existing functionality
5. **User Experience**: Seamless migration with no workflow disruption

### Success Criteria
- ✅ 100% feature parity with Warren V2
- ✅ All calculations match exactly (0% variance)
- ✅ 90%+ automated test coverage
- ✅ <500ms API response times
- ✅ Zero critical bugs in production

## Testing Phases

## PHASE 1: Unit Testing (Continuous)

### 1.1 API Endpoint Testing
**Scope**: All new processed-data endpoints
**Framework**: Jest + Supertest
**Coverage Target**: 95%

#### Test Cases:
```typescript
// /api/processed-data/pnl/[companyId]
describe('GET /api/processed-data/pnl/:companyId', () => {
  test('returns P&L data for valid company', async () => {
    const response = await request(app)
      .get('/api/processed-data/pnl/company-123')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('periods');
    expect(response.body.data).toHaveProperty('currentPeriod');
    expect(response.body.data).toHaveProperty('categories');
  });

  test('filters data by period correctly', async () => {
    const response = await request(app)
      .get('/api/processed-data/pnl/company-123?period=2024-01')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
      
    expect(response.body.data.currentPeriod.period).toBe('2024-01');
  });

  test('handles currency conversion', async () => {
    const response = await request(app)
      .get('/api/processed-data/pnl/company-123?currency=EUR')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
      
    expect(response.body.data.metadata.currency).toBe('EUR');
  });

  test('returns 404 for invalid company', async () => {
    await request(app)
      .get('/api/processed-data/pnl/invalid-company')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(404);
  });

  test('returns 401 without authentication', async () => {
    await request(app)
      .get('/api/processed-data/pnl/company-123')
      .expect(401);
  });
});
```

### 1.2 Service Layer Testing
**Scope**: ProcessedDataService, data transformation functions
**Framework**: Jest
**Coverage Target**: 95%

#### Test Cases:
```typescript
describe('ProcessedDataService', () => {
  describe('transformToPnLFormat', () => {
    test('transforms processed data to P&L format correctly', () => {
      const processedData = {
        data_json: { /* mock processed data */ },
        period_start: '2024-01-01',
        period_end: '2024-01-31',
        currency: 'USD',
        units: 'normal'
      };
      
      const result = service.transformToPnLFormat(processedData);
      
      expect(result).toHaveProperty('periods');
      expect(result).toHaveProperty('categories');
      expect(result.categories).toHaveProperty('revenue');
      expect(result.categories).toHaveProperty('cogs');
    });

    test('handles missing data gracefully', () => {
      const processedData = { data_json: {} };
      const result = service.transformToPnLFormat(processedData);
      
      expect(result.categories.revenue).toEqual([]);
      expect(result.categories.cogs).toEqual([]);
    });
  });

  describe('getCachedData', () => {
    test('returns cached data when available', async () => {
      const cachedData = { test: 'data' };
      mockCache.get.mockResolvedValue(cachedData);
      
      const result = await service.getCachedData('test-key');
      expect(result).toEqual(cachedData);
    });

    test('returns null when cache miss', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const result = await service.getCachedData('test-key');
      expect(result).toBeNull();
    });
  });
});
```

### 1.3 React Hook Testing
**Scope**: useProcessedPnLData, useProcessedCashFlowData hooks
**Framework**: React Testing Library + Jest
**Coverage Target**: 90%

#### Test Cases:
```typescript
describe('useProcessedPnLData', () => {
  test('fetches P&L data on mount', async () => {
    const { result } = renderHook(() => 
      useProcessedPnLData('company-123')
    );

    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeDefined();
    });
  });

  test('refetches data when period changes', async () => {
    const { result } = renderHook(() => 
      useProcessedPnLData('company-123')
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => {
      result.current.updatePeriod('2024-02');
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(mockApi.getPnLData).toHaveBeenCalledWith('company-123', 
        expect.objectContaining({ period: '2024-02' })
      );
    });
  });

  test('handles errors gracefully', async () => {
    mockApi.getPnLData.mockRejectedValue(new Error('API Error'));
    
    const { result } = renderHook(() => 
      useProcessedPnLData('company-123')
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('API Error');
    });
  });
});
```

## PHASE 2: Integration Testing (Weekly)

### 2.1 Database Integration Testing
**Scope**: API endpoints with real database operations
**Framework**: Jest + Test Database
**Environment**: Isolated test database

#### Test Cases:
```typescript
describe('P&L API Database Integration', () => {
  beforeEach(async () => {
    await seedTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('retrieves P&L data with proper joins', async () => {
    // Insert test data
    const company = await createTestCompany();
    const config = await createTestConfiguration(company.id, 'pnl');
    const processedData = await createTestProcessedData(company.id, config.id);

    const response = await request(app)
      .get(`/api/processed-data/pnl/${company.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.data.metadata.configurationName).toBe(config.name);
    expect(response.body.data.periods).toHaveLength(1);
  });

  test('filters by processing status correctly', async () => {
    const company = await createTestCompany();
    const config = await createTestConfiguration(company.id, 'pnl');
    
    // Create completed and failed processed data
    await createTestProcessedData(company.id, config.id, 'completed');
    await createTestProcessedData(company.id, config.id, 'failed');

    const response = await request(app)
      .get(`/api/processed-data/pnl/${company.id}`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    // Should only return completed data
    expect(response.body.data.periods).toHaveLength(1);
  });
});
```

### 2.2 End-to-End API Flow Testing
**Scope**: Complete file upload → process → dashboard flow
**Framework**: Jest + Real API calls

#### Test Cases:
```typescript
describe('Complete Processing Flow', () => {
  test('upload → process → retrieve P&L data', async () => {
    // 1. Upload Excel file
    const uploadResponse = await request(app)
      .post('/api/files/upload')
      .attach('file', 'test-data/sample-pnl.xlsx')
      .field('companyId', testCompanyId)
      .field('uploadSession', 'test-session')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const fileId = uploadResponse.body.data.fileId;

    // 2. Process file with configuration
    const processResponse = await request(app)
      .post('/api/files/process')
      .send({
        fileId,
        configId: testConfigId,
        companyId: testCompanyId
      })
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(processResponse.body.data.processingStatus).toBe('completed');

    // 3. Retrieve dashboard data
    const dashboardResponse = await request(app)
      .get(`/api/processed-data/pnl/${testCompanyId}`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(dashboardResponse.body.data.periods).toHaveLength(1);
    expect(dashboardResponse.body.data.categories.revenue).toBeDefined();
  });
});
```

## PHASE 3: Data Accuracy Testing (Critical)

### 3.1 Side-by-Side Comparison Testing
**Objective**: Ensure configuration-based data matches Warren V2 exactly
**Framework**: Custom comparison scripts
**Tolerance**: 0% variance for identical inputs

#### Comparison Framework:
```typescript
interface ComparisonResult {
  metric: string;
  warrenV2Value: number;
  configBasedValue: number;
  variance: number;
  variancePercent: number;
  status: 'PASS' | 'FAIL';
}

class DataAccuracyTester {
  async compareP&LDashboards(companyId: string, period: string): Promise<ComparisonResult[]> {
    // Get Warren V2 data (old system)
    const warrenV2Data = await this.getWarrenV2PnLData(companyId, period);
    
    // Get configuration-based data (new system)
    const configBasedData = await this.getConfigBasedPnLData(companyId, period);
    
    // Compare key metrics
    const comparisons: ComparisonResult[] = [];
    
    // Revenue comparison
    comparisons.push(this.compareMetric(
      'Total Revenue',
      warrenV2Data.totalRevenue,
      configBasedData.categories.revenue.reduce((sum, cat) => sum + cat.value, 0)
    ));
    
    // COGS comparison
    comparisons.push(this.compareMetric(
      'Total COGS',
      warrenV2Data.totalCOGS,
      configBasedData.categories.cogs.reduce((sum, cat) => sum + cat.value, 0)
    ));
    
    // Gross Profit comparison
    comparisons.push(this.compareMetric(
      'Gross Profit',
      warrenV2Data.grossProfit,
      configBasedData.calculations.grossProfit
    ));
    
    return comparisons;
  }
  
  private compareMetric(name: string, v2Value: number, configValue: number): ComparisonResult {
    const variance = configValue - v2Value;
    const variancePercent = v2Value !== 0 ? (variance / v2Value) * 100 : 0;
    
    return {
      metric: name,
      warrenV2Value: v2Value,
      configBasedValue: configValue,
      variance,
      variancePercent,
      status: Math.abs(variancePercent) < 0.01 ? 'PASS' : 'FAIL' // 0.01% tolerance
    };
  }
}
```

#### Test Data Sets:
```typescript
// Test with real Warren V2 data from multiple companies and periods
const testScenarios = [
  {
    company: 'Vortex Solutions SRL',
    periods: ['2024-01', '2024-02', '2024-03'],
    type: 'pnl',
    expectedMetrics: ['revenue', 'cogs', 'grossProfit', 'operatingIncome', 'netIncome']
  },
  {
    company: 'Test Company B',
    periods: ['2023-12', '2024-01'],
    type: 'cashflow',
    expectedMetrics: ['totalInflows', 'totalOutflows', 'netCashFlow', 'runningBalance']
  }
];

describe('Data Accuracy Tests', () => {
  test.each(testScenarios)('$company - $type data accuracy', async (scenario) => {
    for (const period of scenario.periods) {
      const comparisons = await dataTester.compare(scenario.type, scenario.company, period);
      
      for (const comparison of comparisons) {
        expect(comparison.status).toBe('PASS');
        expect(Math.abs(comparison.variancePercent)).toBeLessThan(0.01);
      }
    }
  });
});
```

### 3.2 Multi-Period Testing
**Objective**: Test calculations across multiple periods
**Focus**: YTD calculations, growth rates, trends

#### Test Cases:
```typescript
describe('Multi-Period Calculations', () => {
  test('YTD calculations match Warren V2', async () => {
    const periods = ['2024-01', '2024-02', '2024-03'];
    
    for (const period of periods) {
      const v2YTD = await getWarrenV2YTD(testCompanyId, period);
      const configYTD = await getConfigBasedYTD(testCompanyId, period);
      
      expect(configYTD.revenue).toBeCloseTo(v2YTD.revenue, 2);
      expect(configYTD.expenses).toBeCloseTo(v2YTD.expenses, 2);
      expect(configYTD.netIncome).toBeCloseTo(v2YTD.netIncome, 2);
    }
  });

  test('Growth rate calculations are accurate', async () => {
    const currentPeriod = '2024-03';
    const previousPeriod = '2024-02';
    
    const v2Growth = await getWarrenV2GrowthRate(testCompanyId, currentPeriod, previousPeriod);
    const configGrowth = await getConfigBasedGrowthRate(testCompanyId, currentPeriod, previousPeriod);
    
    expect(configGrowth.revenueGrowth).toBeCloseTo(v2Growth.revenueGrowth, 4);
    expect(configGrowth.profitGrowth).toBeCloseTo(v2Growth.profitGrowth, 4);
  });
});
```

## PHASE 4: UI/UX Testing (Visual & Functional)

### 4.1 Visual Regression Testing
**Tool**: Playwright + Percy/Chromatic
**Scope**: All dashboard components
**Objective**: Pixel-perfect UI match

#### Test Setup:
```typescript
// visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('P&L Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto('/dashboard/company-admin/pnl');
    await page.waitForLoadState('networkidle');
  });

  test('P&L dashboard matches baseline', async ({ page }) => {
    // Wait for all charts to load
    await page.waitForSelector('[data-testid="revenue-chart"]');
    await page.waitForSelector('[data-testid="profitability-chart"]');
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('pnl-dashboard.png', {
      fullPage: true,
      threshold: 0.2 // 0.2% visual difference tolerance
    });
  });

  test('Cash Flow dashboard matches baseline', async ({ page }) => {
    await page.goto('/dashboard/company-admin/cashflow');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="cashflow-composition"]');
    
    await expect(page).toHaveScreenshot('cashflow-dashboard.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('Mobile responsive layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone dimensions
    
    await page.goto('/dashboard/company-admin/pnl');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('pnl-dashboard-mobile.png');
  });
});
```

### 4.2 Component Testing
**Framework**: React Testing Library + Jest
**Scope**: All dashboard components
**Focus**: Interactive behavior, data display

#### Test Cases:
```typescript
describe('PnLDashboard Component', () => {
  test('renders all required sections', async () => {
    const mockData = createMockPnLData();
    
    render(<PnLDashboard companyId="test-company" data={mockData} />);
    
    // Check all major sections are present
    expect(screen.getByTestId('company-context-bar')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-filters')).toBeInTheDocument();
    expect(screen.getByTestId('ytd-section')).toBeInTheDocument();
    expect(screen.getByTestId('revenue-section')).toBeInTheDocument();
    expect(screen.getByTestId('profitability-section')).toBeInTheDocument();
    expect(screen.getByTestId('key-insights')).toBeInTheDocument();
  });

  test('updates data when period filter changes', async () => {
    const mockData = createMockPnLData();
    const user = userEvent.setup();
    
    render(<PnLDashboard companyId="test-company" data={mockData} />);
    
    // Change period filter
    const periodSelect = screen.getByLabelText(/period/i);
    await user.selectOptions(periodSelect, '2024-02');
    
    // Verify API call was made with new period
    await waitFor(() => {
      expect(mockApi.getPnLData).toHaveBeenCalledWith(
        'test-company',
        expect.objectContaining({ period: '2024-02' })
      );
    });
  });

  test('displays loading state correctly', () => {
    render(<PnLDashboard companyId="test-company" data={null} loading={true} />);
    
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('revenue-section')).not.toBeInTheDocument();
  });

  test('handles error state gracefully', () => {
    const error = new Error('Failed to load data');
    
    render(<PnLDashboard companyId="test-company" data={null} error={error} />);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
  });
});
```

### 4.3 Accessibility Testing
**Tool**: @axe-core/playwright
**Scope**: All dashboard pages
**Standard**: WCAG 2.1 AA compliance

#### Test Cases:
```typescript
test.describe('Accessibility Tests', () => {
  test('P&L dashboard is accessible', async ({ page }) => {
    await page.goto('/dashboard/company-admin/pnl');
    await page.waitForLoadState('networkidle');
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/dashboard/company-admin/pnl');
    
    // Test tab navigation through all interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="period-filter"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="currency-filter"]')).toBeFocused();
    
    // Test all major interactive elements are keyboard accessible
    const interactiveElements = [
      'period-filter',
      'currency-filter', 
      'units-filter',
      'help-button-revenue',
      'help-button-profitability'
    ];
    
    for (const elementId of interactiveElements) {
      const element = page.locator(`[data-testid="${elementId}"]`);
      await element.focus();
      await expect(element).toBeFocused();
    }
  });
});
```

## PHASE 5: Performance Testing

### 5.1 Load Testing
**Tool**: k6 + Artillery
**Scope**: All API endpoints
**Targets**: 
- Response time: <500ms (95th percentile)
- Throughput: 100 RPS
- Error rate: <1%

#### Load Test Script:
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

const API_BASE = 'http://localhost:4000/api';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test P&L data endpoint
  let pnlResponse = http.get(`${API_BASE}/processed-data/pnl/company-123`, { headers });
  check(pnlResponse, {
    'P&L status is 200': (r) => r.status === 200,
    'P&L response time < 500ms': (r) => r.timings.duration < 500,
    'P&L has required data': (r) => r.json('data.periods') != null,
  });

  // Test Cash Flow data endpoint
  let cashflowResponse = http.get(`${API_BASE}/processed-data/cashflow/company-123`, { headers });
  check(cashflowResponse, {
    'Cash Flow status is 200': (r) => r.status === 200,
    'Cash Flow response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test configurations endpoint
  let configResponse = http.get(`${API_BASE}/configurations`, { headers });
  check(configResponse, {
    'Configurations status is 200': (r) => r.status === 200,
  });
}
```

### 5.2 Database Performance Testing
**Tool**: pgbench + Custom scripts
**Scope**: Dashboard queries under load
**Target**: <100ms query response time

#### Database Load Test:
```sql
-- dashboard-query-load-test.sql
-- Simulate concurrent dashboard queries

BEGIN;

-- P&L dashboard query
SELECT 
    pfd.data_json,
    pfd.period_start,
    pfd.period_end,
    cc.name as config_name
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
AND cc.type = 'pnl'
AND pfd.processing_status = 'completed'
AND cc.is_active = true
ORDER BY pfd.period_start DESC
LIMIT 12;

-- Cash Flow dashboard query
SELECT 
    pfd.data_json,
    pfd.period_start,
    pfd.period_end,
    cc.name as config_name  
FROM processed_financial_data pfd
JOIN company_configurations cc ON pfd.config_id = cc.id
WHERE pfd.company_id = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8'
AND cc.type = 'cashflow'
AND pfd.processing_status = 'completed'
AND cc.is_active = true
ORDER BY pfd.period_start DESC
LIMIT 12;

COMMIT;
```

### 5.3 Frontend Performance Testing
**Tool**: Lighthouse + Web Vitals
**Scope**: Dashboard pages
**Targets**:
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1

#### Performance Test Script:
```typescript
// performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('P&L dashboard performance metrics', async ({ page }) => {
    // Start performance measurement
    await page.goto('/dashboard/company-admin/pnl');
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="revenue-chart"]');
    
    // Get Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'FCP') vitals.fcp = entry.value;
            if (entry.name === 'LCP') vitals.lcp = entry.value;
            if (entry.name === 'CLS') vitals.cls = entry.value;
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['web-vitals'] });
      });
    });
    
    // Assert performance metrics
    expect(webVitals.fcp).toBeLessThan(1500); // < 1.5s
    expect(webVitals.lcp).toBeLessThan(2500); // < 2.5s
    expect(webVitals.cls).toBeLessThan(0.1);  // < 0.1
  });

  test('Bundle size is optimized', async ({ page }) => {
    const response = await page.goto('/dashboard/company-admin/pnl');
    
    // Check main bundle size
    const resources = await page.evaluate(() => 
      performance.getEntriesByType('resource')
        .filter(r => r.name.includes('/_next/static/chunks/'))
        .map(r => ({ name: r.name, size: r.transferSize }))
    );
    
    const totalBundleSize = resources.reduce((sum, r) => sum + r.size, 0);
    
    // Should be under 1MB total
    expect(totalBundleSize).toBeLessThan(1024 * 1024);
  });
});
```

## PHASE 6: End-to-End Testing

### 6.1 User Journey Testing
**Tool**: Playwright
**Scope**: Complete user workflows
**Scenarios**: Real user behavior simulation

#### Test Cases:
```typescript
test.describe('Complete User Journeys', () => {
  test('Company Admin - Upload and view P&L dashboard', async ({ page }) => {
    // 1. Login as company admin
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'admin@company.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 2. Navigate to configurations
    await page.click('[data-testid="nav-configurations"]');
    await expect(page).toHaveURL(/.*configurations/);
    
    // 3. Select configuration
    await page.click('[data-testid="config-select-button"]');
    await page.click('[data-testid="config-option-pnl"]');
    
    // 4. Upload file
    await page.click('[data-testid="process-file-button"]');
    await page.setInputFiles('[data-testid="file-input"]', 'test-data/sample-pnl.xlsx');
    await page.click('[data-testid="upload-process-button"]');
    
    // 5. Wait for processing to complete
    await page.waitForSelector('[data-testid="processing-complete"]', { timeout: 30000 });
    
    // 6. Navigate to P&L dashboard
    await page.click('[data-testid="view-dashboard-button"]');
    await expect(page).toHaveURL(/.*pnl/);
    
    // 7. Verify dashboard loads with data
    await page.waitForSelector('[data-testid="revenue-section"]');
    await page.waitForSelector('[data-testid="profitability-section"]');
    
    // 8. Test dashboard interactions
    await page.selectOption('[data-testid="period-filter"]', '2024-01');
    await page.waitForLoadState('networkidle');
    
    // 9. Verify data updates
    const revenueValue = await page.textContent('[data-testid="total-revenue-value"]');
    expect(revenueValue).toBeTruthy();
    expect(parseFloat(revenueValue.replace(/[^\d.-]/g, ''))).toBeGreaterThan(0);
  });

  test('Regular User - View only access', async ({ page }) => {
    // 1. Login as regular user
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@company.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 2. Verify limited navigation
    await expect(page.locator('[data-testid="nav-configurations"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="nav-pnl"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-cashflow"]')).toBeVisible();
    
    // 3. Access P&L dashboard
    await page.click('[data-testid="nav-pnl"]');
    await page.waitForSelector('[data-testid="revenue-section"]');
    
    // 4. Verify no edit capabilities
    await expect(page.locator('[data-testid="edit-button"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="upload-button"]')).not.toBeVisible();
  });
});
```

### 6.2 Cross-Browser Testing
**Browsers**: Chrome, Firefox, Safari, Edge
**Scope**: All major dashboard functionality

```typescript
['chromium', 'firefox', 'webkit'].forEach(browserName => {
  test.describe(`${browserName} - Cross-browser tests`, () => {
    test('P&L dashboard works correctly', async ({ page }) => {
      await page.goto('/dashboard/company-admin/pnl');
      await page.waitForLoadState('networkidle');
      
      // Test core functionality
      await page.waitForSelector('[data-testid="revenue-chart"]');
      await page.selectOption('[data-testid="currency-filter"]', 'EUR');
      
      // Verify chart updates
      await page.waitForLoadState('networkidle');
      const currencyDisplay = await page.textContent('[data-testid="currency-display"]');
      expect(currencyDisplay).toContain('EUR');
    });
  });
});
```

## PHASE 7: Regression Testing

### 7.1 Automated Regression Suite
**Trigger**: Every deployment
**Scope**: All critical user paths
**Framework**: Playwright + CI/CD integration

### 7.2 Comparison Testing Framework
**Purpose**: Continuous validation against Warren V2
**Frequency**: Daily with fresh data

```typescript
// regression-comparison.spec.ts
test.describe('Daily Regression Comparison', () => {
  const testCompanies = ['company-1', 'company-2', 'company-3'];
  const testPeriods = ['2024-01', '2024-02', '2024-03'];
  
  test.beforeAll(async () => {
    // Sync test data between Warren V2 and Configuration-based systems
    await syncTestData();
  });
  
  testCompanies.forEach(companyId => {
    testPeriods.forEach(period => {
      test(`${companyId} - ${period} - P&L data accuracy`, async () => {
        const comparison = await compareP&LData(companyId, period);
        
        comparison.forEach(result => {
          expect(result.status).toBe('PASS');
          expect(Math.abs(result.variancePercent)).toBeLessThan(0.01);
        });
      });
      
      test(`${companyId} - ${period} - Cash Flow data accuracy`, async () => {
        const comparison = await compareCashFlowData(companyId, period);
        
        comparison.forEach(result => {
          expect(result.status).toBe('PASS');
          expect(Math.abs(result.variancePercent)).toBeLessThan(0.01);
        });
      });
    });
  });
});
```

## Test Data Management

### Test Data Strategy
1. **Static Test Data**: Committed to repository for consistent testing
2. **Generated Test Data**: Created on-demand for specific scenarios
3. **Production-like Data**: Sanitized real data for comprehensive testing
4. **Synthetic Data**: Generated data for edge cases and load testing

### Test Data Files:
```
test-data/
├── configurations/
│   ├── pnl-basic.json
│   ├── pnl-complex.json
│   ├── cashflow-basic.json
│   └── cashflow-complex.json
├── excel-files/
│   ├── sample-pnl.xlsx
│   ├── sample-cashflow.xlsx
│   ├── edge-case-empty-rows.xlsx
│   └── edge-case-missing-data.xlsx
├── processed-data/
│   ├── pnl-expected-output.json
│   └── cashflow-expected-output.json
└── comparison-data/
    ├── warren-v2-baseline.json
    └── config-based-baseline.json
```

## CI/CD Integration

### Testing Pipeline:
```yaml
# .github/workflows/test.yml
name: Comprehensive Testing

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install Playwright
        run: npx playwright install
      - run: npm run test:e2e
  
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run test:performance
  
  data-accuracy-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3  
      - run: npm run test:data-accuracy
```

## Success Metrics & Reporting

### Test Coverage Targets:
- **Unit Tests**: 95% line coverage
- **Integration Tests**: 90% API endpoint coverage
- **E2E Tests**: 100% critical user path coverage
- **Visual Tests**: 100% dashboard component coverage

### Quality Gates:
- All tests must pass for deployment
- Performance benchmarks must be met
- Data accuracy tests must show 0% variance
- Accessibility tests must pass WCAG 2.1 AA

### Test Reporting:
- Daily test reports with trend analysis
- Performance regression alerts
- Data accuracy variance reports
- Test coverage tracking

This comprehensive testing strategy ensures bulletproof reliability and 100% feature parity during the Warren configuration-based system migration.