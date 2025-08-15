// Test the live API directly
const { configurationService } = require('./lib/services/configuration-service');
const { excelProcessingService } = require('./lib/services/excel-processing-service');

async function testLiveAPI() {
  try {
    console.log('🧪 Testing live API components...');
    
    // Test 1: Get configuration
    console.log('📋 Step 1: Getting configuration...');
    const configurations = await configurationService.getConfigurationsByCompany('b1dea3ff-cac4-45cc-be78-5488e612c2a8');
    const cashFlowConfig = configurations.find(config => config.type === 'cashflow' && config.isActive);
    
    if (!cashFlowConfig) {
      console.log('❌ No active cash flow configuration found');
      return;
    }
    
    console.log('✅ Found configuration:', cashFlowConfig.name);
    console.log('📋 Configuration structure:');
    console.log('- Has structure:', !!cashFlowConfig.configJson.structure);
    console.log('- Structure keys:', Object.keys(cashFlowConfig.configJson.structure || {}));
    
    // Test 2: Test Excel processing (mock it for now)
    console.log('\n🔄 Step 2: Testing Excel processing method...');
    
    // Create a mock worksheet to test the processing method
    const XLSX = require('xlsx');
    
    // Test just the configuration passing
    console.log('📋 Testing configuration passing...');
    console.log('Configuration type:', typeof cashFlowConfig.configJson);
    console.log('Configuration structure type:', typeof cashFlowConfig.configJson.structure);
    console.log('Configuration structure:', cashFlowConfig.configJson.structure ? 'exists' : 'missing');
    
    if (cashFlowConfig.configJson.structure) {
      console.log('✅ Configuration looks good for processing');
    } else {
      console.log('❌ Configuration is missing structure');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLiveAPI();