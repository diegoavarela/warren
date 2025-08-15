// Test different Excel date conversion formulas
function testExcelDateConversion() {
  const testValues = [
    { cell: 'B3', serial: 45688, expected: 'Jan 2025' },
    { cell: 'I3', serial: 45900, expected: 'Aug 2025' }
  ];
  
  console.log('🧪 Testing Excel date conversion formulas...\n');
  
  testValues.forEach(({ cell, serial, expected }) => {
    console.log(`Testing ${cell}: ${serial} (should be ${expected})`);
    
    // Formula 1: Original (wrong) formula
    const wrongDate = new Date((serial - 25569) * 86400 * 1000);
    const wrongResult = formatDate(wrongDate);
    console.log(`  Formula 1 (wrong): ${wrongResult}`);
    
    // Formula 2: Corrected formula
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const correctDate = new Date(utcValue * 1000);
    const correctResult = formatDate(correctDate);
    console.log(`  Formula 2 (corrected): ${correctResult}`);
    
    // Formula 3: Alternative approach (accounting for Excel's leap year bug)
    // Excel incorrectly treats 1900 as a leap year
    const adjustedSerial = serial > 59 ? serial - 1 : serial; // Adjust for leap year bug
    const altDate = new Date((adjustedSerial - 25569) * 86400 * 1000);
    const altResult = formatDate(altDate);
    console.log(`  Formula 3 (with leap year adjustment): ${altResult}`);
    
    console.log(`  ✅ Expected: ${expected}\n`);
  });
}

function formatDate(date) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

testExcelDateConversion();