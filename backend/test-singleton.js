// Test if the singleton pattern is working correctly
const { CashflowController } = require('./dist/controllers/CashflowController');

console.log('=== TESTING SINGLETON PATTERN ===\n');

// Create multiple instances of the controller
const controller1 = new CashflowController();
const controller2 = new CashflowController();

// Check if they share the same service instance
console.log('Controller 1 service:', controller1.cashflowService);
console.log('Controller 2 service:', controller2.cashflowService);
console.log('Same service instance?', controller1.cashflowService === controller2.cashflowService);

// Check if the service has any stored data
const storedMetrics = controller1.cashflowService.getStoredMetrics();
console.log('\nStored metrics count:', storedMetrics.length);
if (storedMetrics.length > 0) {
  console.log('First metric:', storedMetrics[0]);
  console.log('June metric:', storedMetrics.find(m => m.month === 'June'));
}