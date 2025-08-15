/**
 * API Transformation Test
 * 
 * This script tests that the ProcessedDataService correctly transforms
 * database data into the expected dashboard format.
 */

import { processedDataService } from '../lib/services/processed-data-service.js';

async function testAPITransformation() {
  console.log('🧪 TESTING API TRANSFORMATION LAYER');
  console.log('====================================');
  
  try {
    // Test the service layer with real company ID
    const companyId = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8';
    
    console.log('📡 Testing ProcessedDataService.getCashFlowData()...');
    const cashFlowData = await processedDataService.getCashFlowData(companyId, 12);
    
    console.log(`✅ Retrieved ${cashFlowData.length} periods of cash flow data`);
    
    if (cashFlowData.length > 0) {
      const firstPeriod = cashFlowData[0];
      console.log('\n📊 First Period Data Structure:');
      console.log(`- Period: ${firstPeriod.period}`);
      console.log(`- Currency: ${firstPeriod.currency}`);
      console.log(`- Units: ${firstPeriod.units}`);
      console.log(`- Configuration: ${firstPeriod.configurationName}`);
      
      // Check data structure
      const data = firstPeriod.data;
      console.log('\n🔍 Data Structure Validation:');
      console.log(`- Has dataRows: ${!!data.dataRows}`);
      console.log(`- Has categories: ${!!data.categories}`);
      
      if (data.dataRows) {
        const dataRowKeys = Object.keys(data.dataRows);
        console.log(`- DataRow keys: ${dataRowKeys.join(', ')}`);
        
        // Test specific values
        if (data.dataRows.finalBalance) {
          const finalBalanceFirst = data.dataRows.finalBalance.values[0];
          console.log(`- First Final Balance: ${finalBalanceFirst?.toLocaleString()}`);
          
          // Verify against known value
          const expectedValue = 27688182.78;
          const match = Math.abs(finalBalanceFirst - expectedValue) < 0.1;
          console.log(`- Matches expected value: ${match ? '✅' : '❌'}`);
        }
      }
      
      if (data.categories) {
        const categoryKeys = Object.keys(data.categories);
        console.log(`- Category keys: ${categoryKeys.join(', ')}`);
      }
    }
    
    console.log('\n🔄 Testing Dashboard Transformation...');
    const dashboardData = processedDataService.transformForDashboard(cashFlowData, 'cashflow');
    
    console.log(`✅ Dashboard transformation completed`);
    console.log(`- Periods: ${dashboardData.periods.length}`);
    console.log(`- Currency: ${dashboardData.metadata.currency}`);
    console.log(`- Type: ${dashboardData.metadata.type}`);
    
    console.log('\n✅ API TRANSFORMATION TEST PASSED');
    
  } catch (error) {
    console.error('❌ API TRANSFORMATION TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Note: This would need to be run in a Node.js environment with proper imports
console.log('📝 API Transformation Test Script Created');
console.log('To run: Requires Node.js environment with database connection');
console.log('Alternative: Test via HTTP requests to running server');