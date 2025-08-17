/**
 * Debug Column Parsing for Period Mapping
 * Test the getColumnsFromRange function to see if it's correctly parsing B8:M8
 */

console.log('🔍 TESTING COLUMN PARSING FOR PERIOD MAPPING');
console.log('============================================');

// Replicate the exact function from PeriodMappingEditor
const getColumnsFromRange = (range) => {
  const match = range.match(/^([A-Z]+)\d+:([A-Z]+)\d+$/);
  if (!match) return [];
  
  const startCol = match[1];
  const endCol = match[2];
  
  const columns = [];
  let current = startCol.charCodeAt(0);
  const end = endCol.charCodeAt(0);
  
  while (current <= end) {
    columns.push(String.fromCharCode(current));
    current++;
  }
  
  return columns;
};

// Test with the actual range
const periodsRange = "B8:M8";
const columns = getColumnsFromRange(periodsRange);

console.log('📋 Input range:', periodsRange);
console.log('📋 Parsed columns:', columns);
console.log('📋 Number of columns:', columns.length);
console.log('📋 First column:', columns[0]);
console.log('📋 Last column:', columns[columns.length - 1]);
console.log('');

// Test char codes
console.log('🔤 Character codes:');
console.log('B =', 'B'.charCodeAt(0));
console.log('C =', 'C'.charCodeAt(0));
console.log('M =', 'M'.charCodeAt(0));
console.log('');

// Expected vs actual
const expected = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
console.log('✅ Expected columns:', expected);
console.log('🎯 Actual columns:  ', columns);
console.log('🔍 Match?', JSON.stringify(expected) === JSON.stringify(columns));

if (JSON.stringify(expected) !== JSON.stringify(columns)) {
  console.log('❌ MISMATCH DETECTED!');
  console.log('   Missing columns:', expected.filter(col => !columns.includes(col)));
  console.log('   Extra columns:', columns.filter(col => !expected.includes(col)));
} else {
  console.log('✅ Column parsing is CORRECT');
  console.log('   The issue must be elsewhere in the period mapping display');
}