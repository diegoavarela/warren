// Test script for smart mapping functionality
const { suggestCategoryForAccount, suggestCategoriesForSection } = require('./lib/smart-account-mapping.ts');

// Mock available categories (simplified)
const mockCategories = [
  { value: 'service_revenue', label: 'Ingresos por Servicios', isInflow: true, statementType: 'profit_loss' },
  { value: 'cost_of_sales', label: 'Costo de Ventas', isInflow: false, statementType: 'profit_loss' },
  { value: 'direct_labor', label: 'Mano de Obra Directa', isInflow: false, statementType: 'profit_loss' },
  { value: 'cash_from_customers', label: 'Efectivo de Clientes', isInflow: true, statementType: 'cash_flow' },
  { value: 'cash_to_suppliers', label: 'Efectivo a Proveedores', isInflow: false, statementType: 'cash_flow' },
];

// Test cases
console.log('=== Testing Smart Mapping ===\n');

// Test 1: COR detection
console.log('Test 1: COR Detection');
const corTest = suggestCategoryForAccount('Personal Directo (CoR)', 'Cost of Revenue', mockCategories, 'es');
console.log('Account: "Personal Directo (CoR)"');
console.log('Suggestion:', corTest);
console.log('Expected: direct_labor or cost_of_sales\n');

// Test 2: Spanish service account
console.log('Test 2: Spanish Service Account');
const serviceTest = suggestCategoryForAccount('Ingresos por Servicios', 'Ingresos', mockCategories, 'es');
console.log('Account: "Ingresos por Servicios"');
console.log('Suggestion:', serviceTest);
console.log('Expected: service_revenue\n');

// Test 3: Cash flow account
console.log('Test 3: Cash Flow Account');
const cashTest = suggestCategoryForAccount('Efectivo de Clientes', 'Actividades Operativas', mockCategories, 'es');
console.log('Account: "Efectivo de Clientes"');
console.log('Suggestion:', cashTest);
console.log('Expected: cash_from_customers\n');

// Test 4: Inflow type enforcement
console.log('Test 4: Inflow Type Enforcement');
const enforcedTest = suggestCategoryForAccount('Service Revenue', 'Revenue', mockCategories, 'en', false); // Force outflow
console.log('Account: "Service Revenue" (forced to outflow)');
console.log('Suggestion:', enforcedTest);
console.log('Expected: null (no outflow match for service revenue)\n');

console.log('=== Tests Complete ===');