import { db, financialStatements, financialLineItems, companies, eq, desc } from '@/lib/db';
import { decryptObject, decrypt } from '@/lib/encryption';
import { FinancialClassifier } from '@/lib/financial-classifier';

async function checkFinancialData() {
  const companyId = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8';
  
  console.log('Checking financial data for company:', companyId);
  
  // Get latest statement
  const [statement] = await db
    .select()
    .from(financialStatements)
    .where(eq(financialStatements.companyId, companyId))
    .orderBy(desc(financialStatements.createdAt))
    .limit(1);
    
  if (!statement) {
    console.log('No financial statements found!');
    return;
  }
  
  console.log('\nLatest statement:');
  console.log('- ID:', statement.id);
  console.log('- Type:', statement.statementType);
  console.log('- Period:', statement.periodStart, 'to', statement.periodEnd);
  console.log('- Created:', statement.createdAt);
  
  // Get line items
  const lineItems = await db
    .select()
    .from(financialLineItems)
    .where(eq(financialLineItems.statementId, statement.id))
;
    
  console.log('\nCalculating May 2025 totals:');
  
  let revenue = 0;
  let cogs = 0;
  let operatingExpenses = 0;
  let otherIncome = 0;
  let otherExpenses = 0;
  let otherNet = 0;
  let taxes = 0;
  
  console.log('\nLine items:');
  for (const item of lineItems) {
    let accountName = item.accountName;
    try {
      if (accountName && accountName.includes(':')) {
        accountName = decrypt(accountName);
      }
    } catch (e) {
      console.log('Failed to decrypt name');
    }
    
    let metadata = item.metadata as any;
    try {
      if (typeof metadata === 'string' && metadata.includes(':')) {
        metadata = decryptObject(metadata);
      }
    } catch (e) {
      console.log('Failed to decrypt metadata');
    }
    
    console.log('\n- Account:', accountName);
    console.log('  Category:', item.category);
    console.log('  Amount:', item.amount);
    if (metadata && metadata.units) {
      console.log('  Units:', metadata.units);
    }
    
    if (metadata && metadata.periodValues) {
      console.log('  Period values:', Object.keys(metadata.periodValues).join(', '));
      // Check May 2025 specifically
      if (metadata.periodValues['2025-05']) {
        console.log('  May 2025 value:', metadata.periodValues['2025-05']);
      }
    } else if (metadata && metadata.originalRow && metadata.originalRow.periods) {
      console.log('  Original periods:', Object.keys(metadata.originalRow.periods).join(', '));
    }
    
    // Accumulate totals for May 2025
    if (metadata && metadata.periodValues && metadata.periodValues['2025-05']) {
      const mayValue = parseFloat(metadata.periodValues['2025-05']) || 0;
      
      // Use the financial classifier
      const categories = FinancialClassifier.classifyAccount(accountName, metadata);
      
      if (categories.includes('revenue')) {
        revenue += Math.abs(mayValue);
        console.log(`  Revenue item: ${accountName} = ${mayValue}`);
      } else if (categories.includes('cogs')) {
        cogs += Math.abs(mayValue);
      } else if (categories.includes('operating_expenses')) {
        operatingExpenses += Math.abs(mayValue);
      } else if (categories.includes('other_income')) {
        otherIncome += Math.abs(mayValue);
      } else if (categories.includes('other_expenses')) {
        otherExpenses += Math.abs(mayValue);
      } else if (categories.includes('other_net')) {
        otherNet = mayValue; // Don't use abs, keep the sign
      } else if (categories.includes('taxes')) {
        taxes += Math.abs(mayValue);
      }
      
      // Debug specific items
      if (accountName.toLowerCase().includes('total other') || accountName.toLowerCase().includes('ebitda')) {
        console.log(`  Special item: ${accountName} = ${mayValue}, categories: ${categories.join(', ')}`);
      }
    }
  }
  
  console.log('\n\nMay 2025 Calculations:');
  console.log('========================');
  console.log('Revenue:', revenue);
  console.log('COGS:', cogs);
  console.log('Gross Profit:', revenue - cogs);
  console.log('Gross Margin:', revenue > 0 ? ((revenue - cogs) / revenue * 100).toFixed(1) + '%' : '0%');
  console.log('Operating Expenses:', operatingExpenses);
  const operatingIncome = revenue - cogs - operatingExpenses;
  console.log('Operating Income:', operatingIncome);
  console.log('Other Income:', otherIncome);
  console.log('Other Expenses:', otherExpenses);
  console.log('Net Other Income/Expense (from line item):', otherNet);
  console.log('Net Other Income/Expense (calculated):', otherIncome - otherExpenses);
  const netOther = otherNet !== 0 ? otherNet : (otherIncome - otherExpenses);
  console.log('EBITDA:', operatingIncome + netOther);
  console.log('Taxes:', taxes);
  console.log('Net Income:', operatingIncome + netOther - taxes);
  
  console.log('\nNote: Values in database are in thousands');
  console.log('\nExpected values from user (already in currency format):');
  console.log('Revenue: $56,708');
  console.log('COGS: $25,529');
  console.log('Operating Expenses: $20,663');
  console.log('EBITDA: $9,898');
  console.log('Net Income: $9,910');
  
  process.exit(0);
}

checkFinancialData().catch(console.error);