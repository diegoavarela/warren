// Test the enhanced period detection functionality
const testPeriodDetection = () => {
  console.log('🧪 Testing Enhanced Period Detection');
  
  // Test Excel date serial number conversion
  function excelDateToJSDate(serial) {
    let utcDays;
    if (serial > 59) { // After Feb 28, 1900
      utcDays = serial - 25569;
    } else {
      utcDays = serial - 25567;
    }
    
    const utcValue = utcDays * 86400; // 86400 seconds in a day
    const date = new Date(utcValue * 1000);
    
    return date;
  }

  function parsePeriodValue(rawValue, cellAddress) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Handle Excel date serial numbers (most common issue)
    if (typeof rawValue === 'number' && rawValue > 25000) {
      const excelDate = excelDateToJSDate(rawValue);
      const periodValue = `${monthNames[excelDate.getMonth()]} ${excelDate.getFullYear()}`;
      console.log(`🔄 Converted Excel date serial ${rawValue} to: ${periodValue} at ${cellAddress}`);
      return periodValue;
    }
    
    // Handle string-based periods
    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      
      // Check for quarterly formats (Q1 2025, Q1-2025, 1Q25, etc.)
      const quarterMatch = trimmed.match(/^(?:Q|q)?(\d{1})[\s-]?(?:20)?(\d{2})$/i) ||
                          trimmed.match(/^(\d{1})(?:Q|q)[\s-]?(?:20)?(\d{2})$/i);
      if (quarterMatch) {
        const quarter = parseInt(quarterMatch[1]);
        const year = quarterMatch[2].length === 2 ? 2000 + parseInt(quarterMatch[2]) : parseInt(quarterMatch[2]);
        if (quarter >= 1 && quarter <= 4) {
          const result = `Q${quarter} ${year}`;
          console.log(`🔄 Converted quarterly format "${trimmed}" to: ${result} at ${cellAddress}`);
          return result;
        }
      }
      
      // Check for yearly formats (2025, FY2025, FY 2025, etc.)
      const yearMatch = trimmed.match(/^(?:FY|fy)?[\s-]?(20\d{2})$/i);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        const result = `${year}`;
        console.log(`🔄 Converted yearly format "${trimmed}" to: ${result} at ${cellAddress}`);
        return result;
      }
      
      console.log(`⚠️ Could not parse period format "${trimmed}" at ${cellAddress}, using as-is`);
      return trimmed;
    }
    
    return String(rawValue);
  }

  // Test cases
  console.log('\n📊 Testing Excel Date Serials (2025 months):');
  const testSerials = [
    { serial: 45688, expected: 'Jan 2025' },  // B3
    { serial: 45900, expected: 'Aug 2025' },  // I3 - THE AUGUST ISSUE
    { serial: 46022, expected: 'Dec 2025' }   // M3
  ];

  testSerials.forEach(({ serial, expected }, index) => {
    const result = parsePeriodValue(serial, `TEST${index}`);
    const isCorrect = result === expected;
    console.log(`${isCorrect ? '✅' : '❌'} Serial ${serial}: ${result} (expected: ${expected})`);
  });

  console.log('\n📊 Testing Quarterly Formats:');
  const testQuarterly = [
    { input: 'Q1 2025', expected: 'Q1 2025' },
    { input: '2Q25', expected: 'Q2 2025' },
    { input: 'q4-25', expected: 'Q4 2025' }
  ];

  testQuarterly.forEach(({ input, expected }, index) => {
    const result = parsePeriodValue(input, `Q${index}`);
    const isCorrect = result === expected;
    console.log(`${isCorrect ? '✅' : '❌'} "${input}": ${result} (expected: ${expected})`);
  });

  console.log('\n📊 Testing Yearly Formats:');
  const testYearly = [
    { input: '2025', expected: '2025' },
    { input: 'FY2025', expected: '2025' },
    { input: 'fy 25', expected: '2025' }
  ];

  testYearly.forEach(({ input, expected }, index) => {
    const result = parsePeriodValue(input, `Y${index}`);
    const isCorrect = result === expected;
    console.log(`${isCorrect ? '✅' : '❌'} "${input}": ${result} (expected: ${expected})`);
  });
  
  console.log('\n🎯 Key Test - August 2025 Serial (45900):');
  const augustResult = parsePeriodValue(45900, 'I3');
  console.log(`Result: ${augustResult}`);
  console.log(`Expected: Aug 2025`);
  console.log(`Status: ${augustResult === 'Aug 2025' ? '✅ FIXED' : '❌ STILL BROKEN'}`);
};

testPeriodDetection();