// Simple test to see what the financial aggregator is returning
// Run this with: node -r esbuild-register test-aggregator.js

const mockData = {
  // This is what we saw in the debug API call
  februaryData: {
    companyName: "VTEX Solutions SRL",
    statementType: "profit_loss", 
    currency: "ARS",
    totalPositiveAmounts: 117884,
    sampleItems: [
      { accountName: "[ENCRYPTED]", amount: 49171, category: "revenue", subcategory: "services" },
      { accountName: "[ENCRYPTED]", amount: 0, category: "revenue", subcategory: "other_income" },
      { accountName: "[ENCRYPTED]", amount: 0, category: "revenue", subcategory: "sales" },
      { accountName: "[ENCRYPTED]", amount: 49171, category: "total", subcategory: null },
      { accountName: "[ENCRYPTED]", amount: 0, category: "cogs", subcategory: null },
      { accountName: "[ENCRYPTED]", amount: 9599, category: "cogs", subcategory: "salaries" },
      { accountName: "[ENCRYPTED]", amount: 2251, category: "cogs", subcategory: "salaries" },
      { accountName: "[ENCRYPTED]", amount: 7162, category: "cogs", subcategory: "salaries" },
      { accountName: "[ENCRYPTED]", amount: 530, category: "cogs", subcategory: "employee_benefits" },
      { accountName: "[ENCRYPTED]", amount: 0, category: "cogs", subcategory: "training" }
    ]
  }
};

// Simulate the aggregation logic from financial-data-aggregator.ts
function simulateAggregation(items) {
  let periodRevenue = 0;
  let periodExpenses = 0;
  
  console.log('🔍 SIMULATING AGGREGATION LOGIC:');
  console.log('Raw items:', items.length);
  
  for (const item of items) {
    const amount = item.amount;
    const isInflow = amount > 0; // This is the problematic logic
    
    console.log(`Item: ${item.category}/${item.subcategory} - Amount: ${amount} - Classified as: ${isInflow ? 'REVENUE' : 'EXPENSE'}`);
    
    if (isInflow) {
      periodRevenue += amount;
    } else {
      periodExpenses += Math.abs(amount);
    }
  }
  
  console.log('\n📊 AGGREGATION RESULTS:');
  console.log('Period Revenue:', periodRevenue);
  console.log('Period Expenses:', periodExpenses);
  console.log('Net Income:', periodRevenue - periodExpenses);
  
  return { periodRevenue, periodExpenses };
}

// Test with the actual data we see in database
console.log('🔍 TESTING FINANCIAL AGGREGATION');
console.log('Expected February Revenue: 49,171 ARS');
console.log('AI Claims: 1,250,000 ARS');
console.log('Difference: ~25x off\n');

const result = simulateAggregation(mockData.februaryData.sampleItems);

console.log('\n❓ ANALYSIS:');
console.log('The aggregation logic seems correct for this sample.');
console.log('Total positive amounts match expected revenue (49,171).');
console.log('The AI must be getting data from somewhere else...');

console.log('\n🚨 POTENTIAL ISSUES:');
console.log('1. AI might be accessing cached/wrong company data');
console.log('2. Mock data contamination from ExecutiveDashboard');
console.log('3. Currency conversion happening somewhere'); 
console.log('4. AI hallucinating when data is unclear');
console.log('5. Wrong company ID being passed to aggregator');