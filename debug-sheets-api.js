/**
 * Debug Excel Sheets API Response
 * This tool will help us see what the API is actually returning
 */

console.log('🔍 EXCEL SHEETS API DEBUG TOOL');
console.log('===============================');
console.log('');

console.log('📋 TO DEBUG THE SHEET SELECTOR ISSUE:');
console.log('1. Open browser console (F12)');
console.log('2. Go to your configuration editor');
console.log('3. Navigate to "Filas de Datos" tab');
console.log('4. In console, run this command:');
console.log('');
console.log('// Debug command to check API response:');
console.log('fetch("/api/configurations/YOUR_CONFIG_ID/excel-preview")');
console.log('  .then(r => r.json())');
console.log('  .then(data => {');
console.log('    console.log("📊 API Response:", data);');
console.log('    console.log("📋 Available Sheets:", data.data?.preview?.availableSheets);');
console.log('    console.log("📋 Sheet Count:", data.data?.preview?.availableSheets?.length);');
console.log('    console.log("🎯 Current Sheet:", data.data?.preview?.sheetName);');
console.log('    console.log("🔍 Detected Sheet:", data.data?.preview?.detectedSheetName);');
console.log('    console.log("👤 Is Manual:", data.data?.preview?.isManualSelection);');
console.log('  });');
console.log('');

console.log('🔧 EXPECTED BEHAVIOR:');
console.log('- availableSheets should be an array with 10+ sheet names');
console.log('- If length > 1: Sheet selector should appear');
console.log('- If length <= 1: Sheet selector is hidden (correct behavior)');
console.log('');

console.log('🚨 POSSIBLE ISSUES:');
console.log('1. API returns empty availableSheets array');
console.log('2. React component condition is not met');
console.log('3. Configuration ID is not passed correctly');
console.log('4. Excel file is not properly uploaded/stored');
console.log('');

console.log('💡 QUICK TEST:');
console.log('Replace YOUR_CONFIG_ID with your actual configuration ID');
console.log('You can find it in the URL when editing a configuration');
console.log('Example: /configurations/abc123-def456/edit → use "abc123-def456"');
console.log('');

console.log('🔧 IF API RETURNS CORRECT DATA:');
console.log('The issue is in the React component rendering logic');
console.log('');

console.log('🔧 IF API RETURNS WRONG DATA:');
console.log('The issue is in the backend Excel processing or database storage');