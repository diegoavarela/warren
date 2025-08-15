// Debug script to properly decode Excel date serial numbers
function excelDateToJS(serial) {
  // Excel's epoch starts at January 1, 1900, but due to a leap year bug in Excel,
  // we need to subtract 1 day if the serial is >= 60
  const utcDays = Math.floor(serial - 25569); // 25569 = days between 1900-01-01 and 1970-01-01
  const utcValue = utcDays * 86400; // 86400 seconds in a day
  const date = new Date(utcValue * 1000);
  return date;
}

console.log('🗓️ Decoding Excel date serial numbers:');

const excelDates = [
  { cell: 'B3', serial: 45688 },
  { cell: 'C3', serial: 45716 },
  { cell: 'D3', serial: 45747 },
  { cell: 'E3', serial: 45777 },
  { cell: 'F3', serial: 45808 },
  { cell: 'G3', serial: 45838 },
  { cell: 'H3', serial: 45869 },
  { cell: 'I3', serial: 45900 },
  { cell: 'J3', serial: 45930 },
  { cell: 'K3', serial: 45961 },
  { cell: 'L3', serial: 45991 },
  { cell: 'M3', serial: 46022 }
];

excelDates.forEach(({ cell, serial }) => {
  const date = excelDateToJS(serial);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  console.log(`${cell}: ${serial} → ${monthName} ${year} (${date.toISOString().split('T')[0]})`);
});

// Find August 2025
const augustIndex = excelDates.findIndex(({ serial }) => {
  const date = excelDateToJS(serial);
  return date.getMonth() === 7 && date.getFullYear() === 2025; // Month 7 = August (0-indexed)
});

if (augustIndex >= 0) {
  const augustData = excelDates[augustIndex];
  console.log(`\n🎯 August 2025 is in column ${augustData.cell}`);
} else {
  console.log(`\n❌ August 2025 not found in the periods`);
}