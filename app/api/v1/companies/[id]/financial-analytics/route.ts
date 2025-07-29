import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, companies, organizationSubcategories, companySubcategories, eq, and, sql, desc } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decrypt, decryptObject } from "@/lib/encryption";
import { FinancialClassifier } from "@/lib/financial-classifier";

interface ProcessedLineItem {
  id: string;
  accountCode: string;
  accountName: string;
  category: string;
  amount: number;
  subcategory?: string;
  isTotal?: boolean;
  isSubtotal?: boolean;
  parentTotalId?: string;
  detailRowReferences?: any;
}

// GET /api/v1/companies/[id]/financial-analytics - Get comprehensive P&L analytics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRBAC(request, async (req, user) => {
    try {
      const companyId = params.id;
      const { searchParams } = new URL(request.url);
      const statementId = searchParams.get('statementId');
      const selectedPeriod = searchParams.get('selectedPeriod');
      const comparisonPeriod = searchParams.get('comparisonPeriod') || 'lastMonth'; // lastMonth, lastQuarter, lastYear

      // Check permissions
      if (!hasPermission(user, PERMISSIONS.VIEW_FINANCIAL_DATA, companyId)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions to view financial data'
            }
          },
          { status: 403 }
        );
      }

      // Get the specific statement or latest P&L
      let statement;
      if (statementId) {
        [statement] = await db
          .select()
          .from(financialStatements)
          .where(and(
            eq(financialStatements.id, statementId),
            eq(financialStatements.companyId, companyId)
          ))
          .limit(1);
      } else {
        [statement] = await db
          .select()
          .from(financialStatements)
          .where(and(
            eq(financialStatements.companyId, companyId),
            eq(financialStatements.statementType, 'profit_loss')
          ))
          .orderBy(desc(financialStatements.createdAt))
          .limit(1);
      }

      if (!statement) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Financial statement not found'
            }
          },
          { status: 404 }
        );
      }

      // Get all line items
      const lineItems = await db
        .select()
        .from(financialLineItems)
        .where(eq(financialLineItems.statementId, statement.id));

      // Process and decrypt line items
      const processedItems: ProcessedLineItem[] = lineItems.map((item: any) => {
        let decryptedName = item.accountName;
        try {
          if (item.accountName && item.accountName.includes(':')) {
            decryptedName = decrypt(item.accountName);
          }
        } catch (e) {
          console.warn('Failed to decrypt:', e);
        }
        
        // Extract amount from metadata if available
        let amount = parseFloat(item.amount as any) || 0;
        
        // Check if we have period data in metadata
        if (item.metadata) {
          let metadata = item.metadata as any;
          
          // Decrypt metadata if it's encrypted
          try {
            if (typeof metadata === 'string' && metadata.includes(':')) {
              metadata = decryptObject(metadata);
            }
          } catch (e) {
            console.warn('Failed to decrypt metadata:', e);
          }
          
          // If a specific period is selected, try to get the value for that period
          if (selectedPeriod && selectedPeriod !== 'current' && selectedPeriod !== 'ytd') {
            // selectedPeriod format is "2025-05" for May 2025
            if (metadata.periodValues) {
              // Look for the specific period in periodValues
              const periodValue = metadata.periodValues[selectedPeriod];
              if (periodValue !== undefined) {
                // Clean and parse the value
                if (typeof periodValue === 'string') {
                  const cleanValue = periodValue.replace(/[$,\s()]/g, '').trim();
                  amount = parseFloat(cleanValue) || 0;
                  // Handle negative values in parentheses
                  if (periodValue.includes('(')) {
                    amount = -Math.abs(amount);
                  }
                } else {
                  amount = Number(periodValue) || 0;
                }
              } else {
                amount = 0;
              }
            } else if (metadata.originalRow && metadata.originalRow.periods) {
              // Alternative: look in originalRow.periods
              const periodKey = Object.keys(metadata.originalRow.periods).find(key => 
                key.includes(selectedPeriod.split('-')[1]) // Match month
              );
              if (periodKey) {
                const value = metadata.originalRow.periods[periodKey];
                const cleanValue = String(value).replace(/[$,\s()]/g, '').trim();
                amount = parseFloat(cleanValue) || 0;
                if (String(value).includes('(')) {
                  amount = -Math.abs(amount);
                }
              }
            }
          } else {
            // Default behavior for current period (use the latest period with data)
            if (metadata.originalRow && metadata.originalRow.periods) {
              const periods = metadata.originalRow.periods;
              const periodValues = Object.values(periods);
              
              // Find the first non-zero period value
              for (const value of periodValues) {
                const cleanValue = String(value).replace(/[$,\s]/g, '').trim();
                const parsedValue = parseFloat(cleanValue);
                if (!isNaN(parsedValue) && parsedValue !== 0) {
                  amount = Math.abs(parsedValue); // Use absolute value
                  break;
                }
              }
            } else if (metadata.periodData) {
              // Fallback to periodData if it exists
              const periodValues = Object.values(metadata.periodData);
              if (periodValues.length > 0) {
                const cleanValue = String(periodValues[0]).replace(/[$,\s]/g, '').trim();
                amount = parseFloat(cleanValue) || amount;
              }
            } else if (metadata.originalRow && metadata.originalRow.amount) {
              // Last fallback to originalRow.amount
              amount = parseFloat(metadata.originalRow.amount) || amount;
            }
          }
        }
        
        return {
          id: item.id,
          accountCode: item.accountCode || '',
          accountName: decryptedName || '',
          category: item.category || 'other',
          amount: amount,
          subcategory: item.subcategory,
          isTotal: item.isTotal,
          isSubtotal: item.isSubtotal,
          parentTotalId: item.parentItemId, // Map to actual database field
          detailRowReferences: item.detailRowReferences
        };
      });

      // Debug logging - also include in response for troubleshooting
      const debugInfo = {
        totalLineItems: processedItems.length,
        categoriesFound: Array.from(new Set(processedItems.map(item => item.category))),
        totalItems: processedItems.filter(item => item.isTotal).length,
        detailItems: processedItems.filter(item => !item.isTotal).length,
        itemsWithParents: processedItems.filter(item => item.parentTotalId).length,
        sampleItems: processedItems.slice(0, 5).map(item => ({
          name: item.accountName,
          category: item.category,
          isTotal: item.isTotal,
          parentTotalId: item.parentTotalId,
          amount: item.amount
        }))
      };
      
      console.log('=== Financial Analytics Debug ===');
      console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
      
      // Show totals by category
      const totalsByCategory = processedItems
        .filter(item => item.isTotal)
        .reduce((acc, item) => {
          const cat = item.category || 'uncategorized';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push({
            name: item.accountName,
            amount: item.amount,
            hasChildren: item.detailRowReferences?.length > 0
          });
          return acc;
        }, {} as Record<string, any[]>);
      
      console.log('\nTotals by category:');
      Object.entries(totalsByCategory).forEach(([cat, items]) => {
        console.log(`  ${cat}: ${items.length} totals`);
        items.forEach(item => {
          console.log(`    - ${item.name}: ${item.amount} (has children: ${item.hasChildren})`);
        });
      });
      console.log('Sample items:', processedItems.slice(0, 5).map(item => ({
        name: item.accountName,
        category: item.category,
        amount: item.amount
      })));
      console.log('Revenue items:', processedItems.filter(item => 
        item.category.toLowerCase().includes('revenue') || 
        item.accountName.toLowerCase().includes('ingreso') ||
        item.accountName.toLowerCase().includes('venta')
      ));
      console.log('Net Income/EBITDA items:', processedItems.filter(item => 
        item.accountName.toLowerCase().includes('net') ||
        item.accountName.toLowerCase().includes('ebit') ||
        item.accountName.toLowerCase().includes('resultado') ||
        item.accountName.toLowerCase().includes('utilidad')
      ).map(item => ({
        name: item.accountName,
        category: item.category,
        amount: item.amount
      })));
      console.log('Raw line items sample:', lineItems.slice(0, 2).map((item: any) => ({
        accountName: item.accountName,
        category: item.category,
        amount: item.amount,
        metadata: item.metadata
      })));

      // 🔥 CRITICAL FIX: Filter out totals, calculated items, and margins from current month calculations
      // These items should NOT be included in calculations as they cause double/triple counting
      const filteredCurrentItems = processedItems.filter(item => {
        // Exclude totals (which are sums of other items)
        if (item.isTotal || item.isSubtotal) {
          console.log(`❌ Excluding CURRENT TOTAL item: ${item.accountName} (${item.category}) - ${item.amount}`);
          return false;
        }
        
        // Exclude calculated items and margins (which are derived from other data)
        const excludeCategories = [
          'total', 'calculation', 'margin', 'margin_ratios', 
          'profitability_metrics', 'calculated'
        ];
        if (excludeCategories.includes(item.category)) {
          console.log(`❌ Excluding CURRENT ${item.category.toUpperCase()} item: ${item.accountName} - ${item.amount}`);
          return false;
        }
        
        // Include only base financial data
        console.log(`✅ Including CURRENT base item: ${item.accountName} (${item.category}) - ${item.amount}`);
        return true;
      });
      
      console.log(`📊 Current month: ${processedItems.length} total items → ${filteredCurrentItems.length} base items for calculations`);

      // Get mapped totals directly from line items (use filtered items for base calculations)
      const revenue = calculateRevenue(filteredCurrentItems);
      const cogs = calculateCOGS(filteredCurrentItems);
      
      // Get Gross Profit from mapped total first, calculate as fallback
      const grossProfit = getMappedTotal(processedItems, 'gross_profit') || (revenue - cogs);
      
      // Check if gross margin % is already mapped
      const grossMarginItem = processedItems.find(item => 
        (item.isTotal && item.category === 'gross_margin') ||
        (item.category === 'margin' && item.accountName && 
         item.accountName.toLowerCase().includes('gross'))
      );
      const grossMargin = grossMarginItem ? Math.abs(grossMarginItem.amount) : 
                         (revenue > 0 ? (grossProfit / revenue) * 100 : 0);
      
      console.log('📊 Gross Margin Decision:', {
        mappedValue: grossMarginItem?.amount,
        calculatedValue: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        finalValue: grossMargin,
        usedMapped: !!grossMarginItem
      });
      
      const operatingExpenses = calculateOperatingExpenses(filteredCurrentItems);
      
      // Get Operating Income from mapped total first, calculate as fallback
      const operatingIncome = getMappedTotal(processedItems, 'operating_income') || 
                             (grossProfit - operatingExpenses);
      
      // Check if operating margin % is already mapped
      const operatingMarginItem = processedItems.find(item => 
        (item.isTotal && item.category === 'operating_margin') ||
        (item.category === 'margin' && item.accountName && 
         item.accountName.toLowerCase().includes('operating'))
      );
      const operatingMargin = operatingMarginItem ? Math.abs(operatingMarginItem.amount) :
                             (revenue > 0 ? (operatingIncome / revenue) * 100 : 0);
      
      console.log('📊 Operating Margin Decision:', {
        mappedValue: operatingMarginItem?.amount,
        calculatedValue: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
        finalValue: operatingMargin,
        usedMapped: !!operatingMarginItem
      });
      
      // Other income/expenses (use filtered items for base calculations)
      const otherIncome = calculateOtherIncome(filteredCurrentItems);
      const otherExpenses = calculateOtherExpenses(filteredCurrentItems);
      
      // Taxes (use filtered items for base calculations)
      const taxes = calculateTaxes(filteredCurrentItems);
      const taxesBreakdown = getTaxesBreakdown(filteredCurrentItems);
      
      // Calculate Earnings Before Tax: Operating Income + Other Income - Other Expenses
      const earningsBeforeTax = getMappedTotal(processedItems, 'earnings_before_tax') || 
                               (operatingIncome + otherIncome - otherExpenses);
      
      const earningsBeforeTaxMargin = revenue > 0 ? (earningsBeforeTax / revenue) * 100 : 0;
      
      // Get Net Income from mapped total first
      const netIncome = getMappedTotal(processedItems, 'net_income') || 
                       (operatingIncome + otherIncome - otherExpenses - taxes);
      
      // Check if net margin % is already mapped
      const netMarginItem = processedItems.find(item => 
        (item.isTotal && item.category === 'net_margin') ||
        (item.category === 'margin' && item.accountName && 
         item.accountName.toLowerCase().includes('net'))
      );
      const netMargin = netMarginItem ? Math.abs(netMarginItem.amount) :
                       (revenue > 0 ? (netIncome / revenue) * 100 : 0);
      
      console.log('📊 Net Margin Decision:', {
        mappedValue: netMarginItem?.amount,
        calculatedValue: revenue > 0 ? (netIncome / revenue) * 100 : 0,
        finalValue: netMargin,
        usedMapped: !!netMarginItem
      });
      
      // Get EBITDA from mapped total first, calculate as fallback
      // EBITDA = Operating Income + Depreciation + Amortization (if available)
      const depreciation = calculateDepreciation(filteredCurrentItems);
      const amortization = calculateAmortization(filteredCurrentItems);
      const mappedEbitda = getMappedTotal(processedItems, 'ebitda');
      const calculatedEbitda = operatingIncome + depreciation + amortization;
      const ebitda = mappedEbitda || calculatedEbitda;
      
      console.log('💰 EBITDA Decision:', {
        mappedValue: mappedEbitda,
        calculatedValue: calculatedEbitda,
        finalValue: ebitda,
        usedMapped: !!mappedEbitda,
        components: { operatingIncome, depreciation, amortization }
      });
      
      // Check if EBITDA margin % is already mapped
      // Look for mapped EBITDA margin in multiple possible ways
      const ebitdaMarginItem = processedItems.find(item => 
        (item.isTotal && item.category === 'ebitda_margin') ||
        (item.category === 'margin' && item.accountName && 
         item.accountName.toLowerCase().includes('ebitda'))
      );
      
      console.log('🔍 EBITDA Margin Search Results:', {
        found: !!ebitdaMarginItem,
        item: ebitdaMarginItem ? {
          accountName: ebitdaMarginItem.accountName,
          category: ebitdaMarginItem.category,
          amount: ebitdaMarginItem.amount,
          isTotal: ebitdaMarginItem.isTotal
        } : null
      });
      
      const ebitdaMargin = ebitdaMarginItem ? Math.abs(ebitdaMarginItem.amount) :
                          (revenue > 0 ? (ebitda / revenue) * 100 : 0);
      
      // Debug calculations with detailed breakdown
      console.log('=== FINANCIAL CALCULATIONS DEBUG ===');
      console.log('Basic calculations:', {
        revenue,
        cogs,
        grossProfit: `${grossProfit} (revenue - cogs = ${revenue} - ${cogs})`,
        operatingExpenses,
        operatingIncome: `${operatingIncome} (grossProfit - opex = ${grossProfit} - ${operatingExpenses})`
      });
      
      console.log('Other income/expense calculations:', {
        otherIncome,
        otherExpenses,
        taxes,
        depreciation,
        amortization
      });
      
      console.log('Final calculations:', {
        netIncome: `${netIncome} (opIncome + otherIncome - otherExpenses - taxes = ${operatingIncome} + ${otherIncome} - ${otherExpenses} - ${taxes})`,
        ebitda: `${ebitda} (opIncome + depreciation + amortization = ${operatingIncome} + ${depreciation} + ${amortization})`
      });
      
      console.log('Mapped totals found:', {
        revenueFromMapped: getMappedTotal(processedItems, 'revenue'),
        cogsFromMapped: getMappedTotal(processedItems, 'cogs'),
        grossProfitFromMapped: getMappedTotal(processedItems, 'gross_profit'),
        operatingIncomeFromMapped: getMappedTotal(processedItems, 'operating_income'),
        netIncomeFromMapped: getMappedTotal(processedItems, 'net_income'),
        ebitdaFromMapped: getMappedTotal(processedItems, 'ebitda')
      });
      console.log('=== END DEBUG ===');

      // Personnel cost breakdown
      const personnelCosts = calculatePersonnelCosts(processedItems);
      const contractServices = calculateContractServices(processedItems);

      // Get comparison period data
      const comparisonStatement = await getComparisonStatement(companyId, statement, comparisonPeriod);
      const previousStatement = await getPreviousStatement(companyId, statement);
      let previousMonth = null;
      let comparisonData = null;
      
      if (previousStatement) {
        const prevItems = await getProcessedLineItems(previousStatement.id);
        previousMonth = {
          month: formatMonth(previousStatement.periodEnd),
          revenue: calculateRevenue(prevItems),
          cogs: calculateCOGS(prevItems),
          grossProfit: 0, // calculated below
          grossMargin: 0,
          operatingExpenses: calculateOperatingExpenses(prevItems),
          operatingIncome: 0,
          operatingMargin: 0,
          netIncome: 0,
          netMargin: 0,
          ebitda: 0,
          ebitdaMargin: 0
        };
        
        previousMonth.grossProfit = previousMonth.revenue - previousMonth.cogs;
        previousMonth.grossMargin = previousMonth.revenue > 0 ? (previousMonth.grossProfit / previousMonth.revenue) * 100 : 0;
        previousMonth.operatingIncome = previousMonth.grossProfit - previousMonth.operatingExpenses;
        previousMonth.operatingMargin = previousMonth.revenue > 0 ? (previousMonth.operatingIncome / previousMonth.revenue) * 100 : 0;
        
        const prevOtherIncome = calculateOtherIncome(prevItems);
        const prevOtherExpenses = calculateOtherExpenses(prevItems);
        const prevTaxes = calculateTaxes(prevItems);
        previousMonth.netIncome = getMappedTotal(prevItems, 'net_income') || (previousMonth.operatingIncome + prevOtherIncome - prevOtherExpenses - prevTaxes);
        previousMonth.netMargin = previousMonth.revenue > 0 ? (previousMonth.netIncome / previousMonth.revenue) * 100 : 0;
        
        const prevDepreciation = calculateDepreciation(prevItems);
        const prevAmortization = calculateAmortization(prevItems);
        previousMonth.ebitda = getMappedTotal(prevItems, 'ebitda') || 
                              (previousMonth.operatingIncome + prevDepreciation + prevAmortization);
        previousMonth.ebitdaMargin = previousMonth.revenue > 0 ? (previousMonth.ebitda / previousMonth.revenue) * 100 : 0;
      }

      // Calculate comparison data for growth percentages
      if (comparisonStatement) {
        console.log('💰 Building Comparison Data:', {
          comparisonPeriod,
          comparisonStatementId: comparisonStatement.id,
          comparisonPeriodEnd: comparisonStatement.periodEnd,
          formattedMonth: formatMonth(comparisonStatement.periodEnd)
        });
        
        const compItems = await getProcessedLineItems(comparisonStatement.id);
        const compRevenue = calculateRevenue(compItems);
        const compCogs = calculateCOGS(compItems);
        const compGrossProfit = getMappedTotal(compItems, 'gross_profit') || (compRevenue - compCogs);
        const compOperatingExpenses = calculateOperatingExpenses(compItems);
        const compOperatingIncome = getMappedTotal(compItems, 'operating_income') || (compGrossProfit - compOperatingExpenses);
        const compOtherIncome = calculateOtherIncome(compItems);
        const compOtherExpenses = calculateOtherExpenses(compItems);
        const compTaxes = calculateTaxes(compItems);
        const compNetIncome = getMappedTotal(compItems, 'net_income') || (compOperatingIncome + compOtherIncome - compOtherExpenses - compTaxes);
        const compEbitda = getMappedTotal(compItems, 'ebitda') || compOperatingIncome;

        // Calculate margins for comparison data
        const compGrossMargin = compRevenue > 0 ? (compGrossProfit / compRevenue) * 100 : 0;
        const compOperatingMargin = compRevenue > 0 ? (compOperatingIncome / compRevenue) * 100 : 0;
        const compNetMargin = compRevenue > 0 ? (compNetIncome / compRevenue) * 100 : 0;
        const compEbitdaMargin = compRevenue > 0 ? (compEbitda / compRevenue) * 100 : 0;
        
        // Extract year from period end date
        const comparisonDate = new Date(comparisonStatement.periodEnd);
        const comparisonYear = comparisonDate.getFullYear();
        
        comparisonData = {
          id: comparisonStatement.id,
          month: formatMonth(comparisonStatement.periodEnd),
          year: comparisonYear,
          revenue: compRevenue,
          cogs: compCogs,
          grossProfit: compGrossProfit,
          grossMargin: compGrossMargin,
          operatingExpenses: compOperatingExpenses,
          operatingIncome: compOperatingIncome,
          operatingMargin: compOperatingMargin,
          earningsBeforeTax: compOtherIncome - compOtherExpenses,
          earningsBeforeTaxMargin: compRevenue > 0 ? ((compOtherIncome - compOtherExpenses) / compRevenue) * 100 : 0,
          taxes: compTaxes,
          netIncome: compNetIncome,
          netMargin: compNetMargin,
          ebitda: compEbitda,
          ebitdaMargin: compEbitdaMargin
        };
        
        console.log('🔧 Comparison Data Construction:', {
          comparisonPeriodRequested: comparisonPeriod,
          comparisonStatementPeriodEnd: comparisonStatement.periodEnd,
          formattedMonth: formatMonth(comparisonStatement.periodEnd),
          comparisonDataMonth: comparisonData.month,
          comparisonDataYear: comparisonData.year,
          comparisonDataFields: Object.keys(comparisonData)
        });
        
        console.log('✅ Comparison Data Created:', {
          month: comparisonData.month,
          revenue: comparisonData.revenue,
          comparisonPeriod
        });
      } else {
        console.log('❌ No comparison statement found for period:', comparisonPeriod);
      }

      // DEBUG: Check what financial statements exist for this company
      const allStatements = await db
        .select()
        .from(financialStatements)
        .where(and(
          eq(financialStatements.companyId, companyId),
          eq(financialStatements.statementType, 'profit_loss')
        ))
        .orderBy(desc(financialStatements.periodEnd));
      
      console.log('\n=== DATABASE STATEMENTS DEBUG ===');
      console.log(`Found ${allStatements.length} total P&L statements for company ${companyId}`);
      allStatements.forEach((stmt: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${stmt.id}, Period: ${stmt.periodStart} to ${stmt.periodEnd}, File: ${stmt.sourceFile}`);
      });
      
      // DEBUG: Check metadata of current statement
      const currentLineItems = await db
        .select()
        .from(financialLineItems)
        .where(eq(financialLineItems.statementId, statement.id))
        .limit(3);
        
      console.log('\nSample metadata from current statement:');
      currentLineItems.forEach((item: any, index: number) => {
        let metadata = item.metadata as any;
        try {
          if (typeof metadata === 'string' && metadata.includes(':')) {
            metadata = decryptObject(metadata);
          }
        } catch (e) {
          // Silent fail
        }
        
        console.log(`  Item ${index + 1} (${item.accountName}):`, {
          hasMetadata: !!metadata,
          hasPeriodValues: !!(metadata?.periodValues),
          hasPeriodData: !!(metadata?.periodData),
          hasOriginalRowPeriods: !!(metadata?.originalRow?.periods),
          metadataKeys: metadata ? Object.keys(metadata) : []
        });
        
        if (metadata?.periodValues) {
          console.log(`    periodValues keys:`, Object.keys(metadata.periodValues));
        }
        if (metadata?.originalRow?.periods) {
          console.log(`    originalRow.periods keys:`, Object.keys(metadata.originalRow.periods));
        }
      });
      console.log('=== END DATABASE DEBUG ===\n');

      // Get historical data for charts (last 12 months)
      const chartData = await getHistoricalData(companyId, statement);
      
      console.log('\n=== CHART DATA SUMMARY ===');
      console.log(`Generated ${chartData.length} periods for charts`);
      console.log('=== END CHART DATA SUMMARY ===\n');

      // Get company details for currency and units
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      // Extract units from various sources since the database doesn't have a units column yet
      let displayUnits = 'normal'; // default fallback
      
      // Method 1: Try to get from line item metadata
      if (lineItems.length > 0) {
        const firstItem = lineItems[0];
        let metadata = firstItem.metadata as any;
        
        try {
          // Check if it's encrypted
          if (typeof metadata === 'string' && metadata.includes(':')) {
            metadata = decryptObject(metadata);
          }
          
          // Look for units in various places in metadata
          if (metadata && metadata.units) {
            displayUnits = metadata.units;
          } else if (metadata && metadata.originalRow && metadata.originalRow.units) {
            displayUnits = metadata.originalRow.units;
          } else if (metadata && metadata.statementMetadata && metadata.statementMetadata.units) {
            displayUnits = metadata.statementMetadata.units;
          }
        } catch (e) {
          console.warn('Failed to extract units from metadata:', e);
        }
      }
      
      // Method 2: Based on the CSV data analysis, default to 'thousands' for recent uploads
      // This is a temporary fix until the database schema includes units column
      if (displayUnits === 'normal' && statement.currency === 'ARS') {
        displayUnits = 'thousands'; // Based on CSV analysis showing all ARS entries use thousands
      }
      
      console.log('🎯 Units Debug:', {
        defaultUnits: displayUnits,
        statementCurrency: statement.currency,
        statementId: statement.id,
        lineItemsCount: lineItems.length,
        method: displayUnits === 'thousands' ? 'Currency-based fallback' : 'Metadata extraction'
      });

      // Build response matching the reference dashboard structure
      const dashboardData = {
        hasData: true,
        uploadedFileName: statement.sourceFile,
        currency: statement.currency || company?.baseCurrency || 'USD',
        displayUnits: displayUnits,
        periodRange: `${statement.periodStart} - ${statement.periodEnd}`,
        debugInfo: debugInfo, // Add debug info to response
        currentMonth: {
          month: selectedPeriod && selectedPeriod !== 'current' && selectedPeriod !== 'ytd' 
            ? formatMonthFromPeriodId(selectedPeriod) 
            : formatMonth(statement.periodEnd),
          revenue,
          cogs,
          grossProfit,
          grossMargin,
          operatingExpenses,
          operatingIncome,
          operatingMargin,
          earningsBeforeTax,
          earningsBeforeTaxMargin,
          netIncome,
          netMargin,
          ebitda,
          ebitdaMargin,
          // Cost efficiency metrics
          costOfRevenuePercentage: revenue > 0 ? ((revenue - grossProfit) / revenue) * 100 : 0,
          opexOfRevenuePercentage: revenue > 0 ? (operatingExpenses / revenue) * 100 : 0,
          // Growth percentages vs comparison period
          revenueGrowth: comparisonData ? calculateGrowthPercentage(revenue, comparisonData.revenue) : null,
          cogsGrowth: comparisonData ? calculateGrowthPercentage(cogs, comparisonData.cogs) : null,
          grossProfitGrowth: comparisonData ? calculateGrowthPercentage(grossProfit, comparisonData.grossProfit) : null,
          operatingExpensesGrowth: comparisonData ? calculateGrowthPercentage(operatingExpenses, comparisonData.operatingExpenses) : null,
          operatingIncomeGrowth: comparisonData ? calculateGrowthPercentage(operatingIncome, comparisonData.operatingIncome) : null,
          netIncomeGrowth: comparisonData ? calculateGrowthPercentage(netIncome, comparisonData.netIncome) : null,
          ebitdaGrowth: comparisonData ? calculateGrowthPercentage(ebitda, comparisonData.ebitda) : null,
          // Personnel costs
          totalPersonnelCost: personnelCosts.total,
          personnelSalariesCoR: personnelCosts.salariesCoR,
          payrollTaxesCoR: personnelCosts.taxesCoR,
          personnelSalariesOp: personnelCosts.salariesOp,
          payrollTaxesOp: personnelCosts.taxesOp,
          healthCoverage: personnelCosts.healthCoverage,
          personnelBenefits: personnelCosts.benefits,
          // Contract services
          contractServicesCoR: contractServices.cor,
          contractServicesOp: contractServices.operating,
          professionalServices: contractServices.professional,
          salesMarketing: calculateSalesMarketing(processedItems),
          facilitiesAdmin: calculateFacilitiesAdmin(processedItems)
        },
        comparisonPeriod: comparisonPeriod,
        comparisonData: comparisonData,
        previousMonth,
        yearToDate: (() => {
          // If chartData is empty, use current month data as fallback for YTD
          if (chartData.length === 0) {
            console.log('📊 YTD FALLBACK: chartData is empty, using current month data for YTD calculations');
            console.log('Current month values:', { revenue, cogs, operatingExpenses, netIncome, ebitda });
            return {
              revenue: revenue,
              cogs: cogs,
              grossProfit: grossProfit,
              grossMargin: grossMargin,
              operatingExpenses: operatingExpenses,
              operatingIncome: operatingIncome,
              operatingMargin: operatingMargin,
              earningsBeforeTax: earningsBeforeTax,
              earningsBeforeTaxMargin: earningsBeforeTaxMargin,
              taxes: taxes,
              otherExpenses: otherIncome - otherExpenses, // Net other expenses
              expenses: cogs + operatingExpenses + (otherIncome - otherExpenses) + taxes,
              netIncome: netIncome,
              netMargin: netMargin,
              ebitda: ebitda,
              ebitdaMargin: ebitdaMargin,
              monthsIncluded: 1 // Current month only
            };
          }
          
          // Normal calculation from chartData
          const ytdRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
          const ytdCogs = chartData.reduce((sum, d) => sum + d.cogs, 0);
          const ytdGrossProfit = chartData.reduce((sum, d) => sum + d.grossProfit, 0);
          const ytdOperatingExpenses = chartData.reduce((sum, d) => sum + d.operatingExpenses, 0);
          const ytdOperatingIncome = chartData.reduce((sum, d) => sum + d.operatingIncome, 0);
          const ytdEarningsBeforeTax = chartData.reduce((sum, d) => sum + (d.earningsBeforeTax || 0), 0);
          const ytdTaxes = chartData.reduce((sum, d) => sum + (d.taxes || 0), 0);
          const ytdOtherExpenses = chartData.reduce((sum, d) => sum + (d.otherExpenses || 0), 0);
          const ytdNetIncome = chartData.reduce((sum, d) => sum + d.netIncome, 0);
          const ytdEbitda = chartData.reduce((sum, d) => sum + (d.ebitda || 0), 0);
          
          return {
            revenue: ytdRevenue,
            cogs: ytdCogs,
            grossProfit: ytdGrossProfit,
            grossMargin: ytdRevenue > 0 ? (ytdGrossProfit / ytdRevenue) * 100 : 0,
            operatingExpenses: ytdOperatingExpenses,
            operatingIncome: ytdOperatingIncome,
            operatingMargin: ytdRevenue > 0 ? (ytdOperatingIncome / ytdRevenue) * 100 : 0,
            earningsBeforeTax: ytdEarningsBeforeTax,
            earningsBeforeTaxMargin: ytdRevenue > 0 ? (ytdEarningsBeforeTax / ytdRevenue) * 100 : 0,
            taxes: ytdTaxes,
            otherExpenses: ytdOtherExpenses,
            expenses: ytdCogs + ytdOperatingExpenses + ytdOtherExpenses + ytdTaxes,
            netIncome: ytdNetIncome,
            netMargin: ytdRevenue > 0 ? (ytdNetIncome / ytdRevenue) * 100 : 0,
            ebitda: ytdEbitda,
            ebitdaMargin: ytdRevenue > 0 ? (ytdEbitda / ytdRevenue) * 100 : 0,
            monthsIncluded: chartData.filter(d => d.revenue > 0).length
          };
        })(),
        summary: (() => {
          // If chartData is empty, use current month data
          if (chartData.length === 0) {
            return {
              totalRevenue: revenue,
              totalCOGS: cogs,
              totalGrossProfit: grossProfit,
              avgGrossMargin: grossMargin,
              totalOperatingExpenses: operatingExpenses,
              totalOperatingIncome: operatingIncome,
              avgOperatingMargin: operatingMargin,
              totalNetIncome: netIncome,
              avgNetMargin: netMargin
            };
          }
          
          // Normal calculation from chartData
          return {
            totalRevenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
            totalCOGS: chartData.reduce((sum, d) => sum + d.cogs, 0),
            totalGrossProfit: chartData.reduce((sum, d) => sum + d.grossProfit, 0),
            avgGrossMargin: chartData.reduce((sum, d) => sum + d.grossMargin, 0) / chartData.length,
            totalOperatingExpenses: chartData.reduce((sum, d) => sum + d.operatingExpenses, 0),
            totalOperatingIncome: chartData.reduce((sum, d) => sum + d.operatingIncome, 0),
            avgOperatingMargin: chartData.reduce((sum, d) => sum + d.operatingMargin, 0) / chartData.length,
            totalNetIncome: chartData.reduce((sum, d) => sum + d.netIncome, 0),
            avgNetMargin: chartData.reduce((sum, d) => sum + d.netMargin, 0) / chartData.length
          };
        })(),
        categories: await getCategoriesBreakdown(processedItems, companyId),
        taxesBreakdown: taxesBreakdown,
        chartData
      };

      return NextResponse.json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      console.error('Financial analytics error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch financial analytics',
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
          }
        },
        { status: 500 }
      );
    }
  });
}

// Helper function to get all child items of a parent total
function getChildrenOfTotal(items: ProcessedLineItem[], parentId: string): ProcessedLineItem[] {
  const children: ProcessedLineItem[] = [];
  
  // Get direct children
  const directChildren = items.filter(item => item.parentTotalId === parentId);
  children.push(...directChildren);
  
  // Recursively get children of subtotals
  directChildren.forEach(child => {
    if (child.isTotal || child.isSubtotal) {
      children.push(...getChildrenOfTotal(items, child.id));
    }
  });
  
  return children;
}

// Generic calculation function that works from totals down to details
function calculateByCategory(items: ProcessedLineItem[], targetCategory: string): number {
  console.log(`\nCalculating ${targetCategory}:`);
  
  // Step 1: Find all totals that match the target category
  const categoryTotals = items.filter(item => {
    if (!item.isTotal) return false;
    
    // First try exact match
    if (item.category === targetCategory) return true;
    
    // Try alternative category matching for broader coverage
    if (targetCategory === 'cogs') {
      return item.category === 'expenses' || item.category === 'costs';
    } else if (targetCategory === 'operating_expenses') {
      return item.category === 'expenses' || item.category === 'opex';
    }
    
    return false;
  });
  
  console.log(`Found ${categoryTotals.length} ${targetCategory} totals`);
  
  // Step 2: For each matching total, get ALL its detail items
  const allDetailItems: ProcessedLineItem[] = [];
  
  categoryTotals.forEach(total => {
    console.log(`Processing total: ${total.accountName} (${total.amount})`);
    
    // Get all children recursively
    const children = getChildrenOfTotal(items, total.id);
    
    // Add only detail items (not subtotals) to avoid double counting
    const detailChildren = children.filter(child => !child.isTotal);
    
    console.log(`  Found ${detailChildren.length} detail items`);
    detailChildren.forEach(child => {
      console.log(`    - ${child.accountName}: ${child.amount}`);
    });
    
    // Add to our collection
    detailChildren.forEach(child => {
      if (!allDetailItems.find(item => item.id === child.id)) {
        allDetailItems.push(child);
      }
    });
  });
  
  // Step 3: Calculate the total
  let total = 0;
  
  if (allDetailItems.length > 0) {
    // If we found detail items, sum them
    total = allDetailItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    console.log(`Total ${targetCategory}: ${total} from ${allDetailItems.length} detail items\n`);
  } else if (categoryTotals.length > 0) {
    // Fallback: If no detail items but we have totals, use the totals themselves
    total = categoryTotals.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    console.log(`Total ${targetCategory}: ${total} from ${categoryTotals.length} totals (no details found)\n`);
  } else {
    // Final fallback: Look for any detail items that match the category (not just children of totals)
    const directCategoryItems = items.filter(item => {
      if (item.isTotal) return false; // Skip totals, we already checked those
      
      // Direct category match
      if (item.category === targetCategory) return true;
      
      // Alternative category matching
      if (targetCategory === 'cogs') {
        return item.category === 'expenses' || item.category === 'costs';
      } else if (targetCategory === 'operating_expenses') {
        return item.category === 'expenses' || item.category === 'opex';
      } else if (targetCategory === 'taxes') {
        return item.category === 'tax' || item.category === 'impuestos';
      }
      
      return false;
    });
    
    if (directCategoryItems.length > 0) {
      total = directCategoryItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
      console.log(`Total ${targetCategory}: ${total} from ${directCategoryItems.length} direct category items\n`);
    } else {
      console.log(`No ${targetCategory} items found\n`);
    }
  }
  
  return total;
}

// Get mapped totals directly from line items
function getMappedTotal(items: ProcessedLineItem[], category: string): number {
  // First, look for a total line item that matches this category
  let totalItem = items.find(item => {
    return item.isTotal && item.category === category;
  });
  
  // Special handling for calculated items like EBITDA
  if (!totalItem && (category === 'ebitda' || category === 'net_income' || category === 'gross_profit' || category === 'operating_income')) {
    // Look for items with "calculation" category that match the expected name
    const calculationPatterns: Record<string, string[]> = {
      'ebitda': ['ebitda'],
      'net_income': ['net income', 'net loss', 'utilidad neta'],
      'gross_profit': ['gross profit', 'utilidad bruta'],
      'operating_income': ['operating income', 'utilidad operacional']
    };
    
    const patterns = calculationPatterns[category] || [];
    totalItem = items.find(item => 
      item.category === 'calculation' && 
      item.accountName && 
      patterns.some(pattern => 
        item.accountName.toLowerCase().includes(pattern.toLowerCase())
      )
    );
    
    if (totalItem) {
      console.log(`🔥 Found mapped CALCULATION for ${category}: ${totalItem.accountName} = ${totalItem.amount}`);
    }
  }
  
  if (totalItem) {
    console.log(`Found mapped total for ${category}: ${totalItem.accountName} = ${totalItem.amount}`);
    return Math.abs(totalItem.amount);
  }
  
  // Enhanced fallback: try alternative category names
  let alternativeCategories: string[] = [];
  if (category === 'cogs') {
    alternativeCategories = ['expenses', 'costs'];
  } else if (category === 'operating_expenses') {
    alternativeCategories = ['expenses', 'opex'];
  } else if (category === 'taxes') {
    alternativeCategories = ['tax', 'impuestos'];
  }
  
  // Try alternative categories
  for (const altCategory of alternativeCategories) {
    const altTotalItem = items.find(item => {
      return item.isTotal && item.category === altCategory;
    });
    
    if (altTotalItem) {
      console.log(`Found mapped total for ${category} using alternative category ${altCategory}: ${altTotalItem.accountName} = ${altTotalItem.amount}`);
      return Math.abs(altTotalItem.amount);
    }
  }
  
  // Fallback: calculate from detail items if no total is mapped
  console.log(`No mapped total found for ${category}, calculating from details`);
  const total = calculateByCategory(items, category);
  console.log(`Calculated ${category} from details:`, total);
  return total;
}

// Specific calculation functions using mapped totals
function calculateRevenue(items: ProcessedLineItem[]): number {
  // First try to get mapped total, then fall back to category calculation
  const mappedTotal = getMappedTotal(items, 'revenue');
  if (mappedTotal !== 0) { // Allow negative values, only fall back if exactly 0
    return mappedTotal;
  }
  return calculateByCategory(items, 'revenue');
}

function calculateCOGS(items: ProcessedLineItem[]): number {
  // First try to get mapped total, then fall back to category calculation
  const mappedTotal = getMappedTotal(items, 'cogs');
  if (mappedTotal !== 0) { // Allow negative values, only fall back if exactly 0
    return mappedTotal;
  }
  return calculateByCategory(items, 'cogs');
}

function calculateOperatingExpenses(items: ProcessedLineItem[]): number {
  // First try to get mapped total, then fall back to category calculation
  const mappedTotal = getMappedTotal(items, 'operating_expenses');
  if (mappedTotal !== 0) { // Allow negative values, only fall back if exactly 0
    return mappedTotal;
  }
  return calculateByCategory(items, 'operating_expenses');
}

function calculateOtherIncome(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'other_income');
}

function calculateOtherExpenses(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'other_expenses');
}

function calculateTaxes(items: ProcessedLineItem[]): number {
  console.log('\n=== TAX CALCULATION DEBUG ===');
  
  // First try to get taxes by category
  const taxesByCategory = calculateByCategory(items, 'taxes');
  console.log(`Taxes by category 'taxes': ${taxesByCategory}`);
  
  // Also try to find tax items by name patterns (fallback)
  const taxKeywords = ['tax', 'impuesto', 'fiscal', 'tributario', 'iva', 'isr', 'income tax'];
  const taxItemsByName = items.filter(item => {
    const name = item.accountName.toLowerCase();
    return taxKeywords.some(keyword => name.includes(keyword));
  });
  
  console.log(`Found ${taxItemsByName.length} items by tax keywords:`, 
    taxItemsByName.map(item => ({ name: item.accountName, amount: item.amount, category: item.category })));
  
  const taxesByName = taxItemsByName.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  console.log(`Taxes by name matching: ${taxesByName}`);
  
  // Prioritize category-based calculation if available, otherwise use keyword matching
  const finalTaxes = taxesByCategory > 0 ? taxesByCategory : taxesByName;
  console.log(`Final taxes value: ${finalTaxes} (using ${taxesByCategory > 0 ? 'category-based' : 'keyword-based'} calculation)`);
  console.log('=== END TAX DEBUG ===\n');
  
  return finalTaxes;
}

function calculateDepreciation(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'depreciation');
}

function calculateAmortization(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'amortization');
}

function getTaxesBreakdown(items: ProcessedLineItem[]) {
  console.log('\nCalculating taxes breakdown by subcategory:');
  
  // Get all items with category='taxes'
  const taxItems = items.filter(item => item.category === 'taxes');
  
  const total = taxItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  
  // Group by subcategory
  const subcategoryBreakdown: { [key: string]: { items: typeof taxItems, total: number } } = {};
  
  taxItems.forEach(item => {
    // Improve subcategory assignment based on account name if subcategory is generic
    let subcategoryKey = item.subcategory || 'other_taxes';
    
    // If subcategory is generic, try to infer from account name
    if (subcategoryKey === 'other_taxes' && item.accountName) {
      const accountName = item.accountName.toLowerCase();
      if (accountName.includes('gross income') || accountName.includes('iibb')) {
        subcategoryKey = 'gross_income_tax';
      } else if (accountName.includes('income tax') || accountName.includes('isr')) {
        subcategoryKey = 'income_tax';
      } else if (accountName.includes('iva') || accountName.includes('vat')) {
        subcategoryKey = 'vat_tax';
      } else if (accountName.includes('payroll') || accountName.includes('nomina')) {
        subcategoryKey = 'payroll_tax';
      }
    }
    
    if (!subcategoryBreakdown[subcategoryKey]) {
      subcategoryBreakdown[subcategoryKey] = { items: [], total: 0 };
    }
    subcategoryBreakdown[subcategoryKey].items.push(item);
    subcategoryBreakdown[subcategoryKey].total += Math.abs(item.amount);
  });
  
  // Convert to array format for frontend
  const breakdown = Object.entries(subcategoryBreakdown).map(([subcategory, group]) => ({
    subcategory,
    name: group.items.length === 1 ? group.items[0].accountName : subcategory,
    amount: group.total,
    percentage: total > 0 ? (group.total / total) * 100 : 0,
    items: group.items.map(item => ({
      accountName: item.accountName,
      amount: Math.abs(item.amount)
    }))
  }));
  
  console.log('Taxes breakdown:', {
    total,
    subcategories: breakdown.length,
    breakdown: breakdown.map(b => ({ name: b.name, amount: b.amount, percentage: b.percentage }))
  });
  
  return {
    total,
    breakdown
  };
}

// Removed getNetIncome and getEBITDA - now using getMappedTotal with fallback calculations

function calculatePersonnelCosts(items: ProcessedLineItem[]) {
  console.log('\nCalculating personnel costs using mapping-based subcategory lookup:');
  
  // Use mapping-based approach - look for specific subcategories as per HOW_TO_MAP.md
  const salaryWagesItems = items.filter(item => 
    item.subcategory === 'salaries_wages' || 
    item.subcategory === 'salary_wages' ||
    item.subcategory === 'salaries' ||
    item.accountName?.toLowerCase().includes('salary') ||
    item.accountName?.toLowerCase().includes('wages') ||
    item.accountName?.toLowerCase().includes('salario') ||
    item.accountName?.toLowerCase().includes('sueldo')
  );
  
  const payrollTaxItems = items.filter(item => 
    item.subcategory === 'payroll_taxes' ||
    item.subcategory === 'payroll_tax' ||
    item.accountName?.toLowerCase().includes('payroll tax') ||
    item.accountName?.toLowerCase().includes('social security') ||
    item.accountName?.toLowerCase().includes('employment tax')
  );
  
  const healthBenefitsItems = items.filter(item => 
    item.subcategory === 'health_coverage' ||
    item.subcategory === 'benefits' ||
    item.subcategory === 'personnel_benefits' ||
    item.accountName?.toLowerCase().includes('health') ||
    item.accountName?.toLowerCase().includes('benefit') ||
    item.accountName?.toLowerCase().includes('insurance') ||
    item.accountName?.toLowerCase().includes('medical')
  );
  
  // Calculate amounts from mapped subcategories
  const salariesWagesTotal = salaryWagesItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const payrollTaxesTotal = payrollTaxItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const healthBenefitsTotal = healthBenefitsItems.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  
  const totalPersonnelCost = salariesWagesTotal + payrollTaxesTotal + healthBenefitsTotal;
  
  console.log('Personnel costs breakdown (mapping-based):');
  console.log(`  Salary & Wages: ${salariesWagesTotal} (${salaryWagesItems.length} items)`);
  console.log(`  Payroll Taxes: ${payrollTaxesTotal} (${payrollTaxItems.length} items)`);
  console.log(`  Health & Benefits: ${healthBenefitsTotal} (${healthBenefitsItems.length} items)`);
  console.log(`  Total Personnel Cost: ${totalPersonnelCost}`);
  
  // Debug: Show which items were found for each category
  if (salaryWagesItems.length > 0) {
    console.log('  Salary & Wages items:', salaryWagesItems.map(item => ({ name: item.accountName, subcategory: item.subcategory, amount: item.amount })));
  }
  if (payrollTaxItems.length > 0) {
    console.log('  Payroll Tax items:', payrollTaxItems.map(item => ({ name: item.accountName, subcategory: item.subcategory, amount: item.amount })));
  }
  if (healthBenefitsItems.length > 0) {
    console.log('  Health & Benefits items:', healthBenefitsItems.map(item => ({ name: item.accountName, subcategory: item.subcategory, amount: item.amount })));
  }
  
  const result = {
    total: totalPersonnelCost,
    salariesCoR: 0, // Not applicable for current implementation
    taxesCoR: 0, // Not applicable for current implementation
    salariesOp: salariesWagesTotal,
    taxesOp: payrollTaxesTotal,
    healthCoverage: healthBenefitsTotal,
    benefits: healthBenefitsTotal // Same as health coverage for now
  };
  
  console.log('Final personnel costs result:', result);
  console.log(''); // Empty line for readability
  
  return result;
}

function calculateContractServices(items: ProcessedLineItem[]) {
  const contractItems = items.filter(item => 
    ['contract', 'service', 'consulting', 'professional', 'outsource'].some(keyword => 
      item.accountName.toLowerCase().includes(keyword)
    )
  );

  return {
    cor: contractItems
      .filter(item => item.category.toLowerCase().includes('cost'))
      .reduce((sum, item) => sum + Math.abs(item.amount), 0),
    operating: contractItems
      .filter(item => item.category.toLowerCase().includes('operating'))
      .reduce((sum, item) => sum + Math.abs(item.amount), 0),
    professional: contractItems
      .filter(item => item.accountName.toLowerCase().includes('professional'))
      .reduce((sum, item) => sum + Math.abs(item.amount), 0)
  };
}

function calculateSalesMarketing(items: ProcessedLineItem[]): number {
  return items
    .filter(item => ['sales', 'marketing', 'advertising', 'ventas', 'mercadeo', 'publicidad'].some(keyword => 
      item.accountName.toLowerCase().includes(keyword)
    ))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

function calculateFacilitiesAdmin(items: ProcessedLineItem[]): number {
  return items
    .filter(item => ['facilities', 'rent', 'utilities', 'admin', 'instalaciones', 'renta', 'servicios'].some(keyword => 
      item.accountName.toLowerCase().includes(keyword)
    ))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

async function getPreviousStatement(companyId: string, currentStatement: any) {
  const [previous] = await db
    .select()
    .from(financialStatements)
    .where(and(
      eq(financialStatements.companyId, companyId),
      eq(financialStatements.statementType, currentStatement.statementType),
      sql`${financialStatements.periodEnd} < ${currentStatement.periodEnd}`
    ))
    .orderBy(desc(financialStatements.periodEnd))
    .limit(1);
    
  return previous;
}

async function getComparisonStatement(companyId: string, currentStatement: any, comparisonPeriod: string) {
  const currentDate = new Date(currentStatement.periodEnd);
  let targetDate: Date;
  
  console.log('🔍 Comparison Statement Debug:', {
    comparisonPeriod,
    currentStatementPeriodEnd: currentStatement.periodEnd,
    currentDate: currentDate.toISOString(),
    currentMonth: currentDate.getMonth() + 1, // +1 because getMonth() is 0-based
    currentYear: currentDate.getFullYear()
  });
  
  switch (comparisonPeriod) {
    case 'lastMonth':
      targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() - 1);
      break;
    case 'lastQuarter':
      targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() - 3);
      console.log('📅 Last Quarter Calculation:', {
        originalMonth: currentDate.getMonth() + 1,
        targetMonth: targetDate.getMonth() + 1,
        targetYear: targetDate.getFullYear(),
        targetDateISO: targetDate.toISOString()
      });
      break;
    case 'lastYear':
      targetDate = new Date(currentDate);
      targetDate.setFullYear(currentDate.getFullYear() - 1);
      console.log('📅 Last Year Calculation:', {
        originalMonth: currentDate.getMonth() + 1,
        originalYear: currentDate.getFullYear(),
        targetMonth: targetDate.getMonth() + 1,
        targetYear: targetDate.getFullYear(),
        targetDateISO: targetDate.toISOString()
      });
      break;
    default:
      // Default to last month
      targetDate = new Date(currentDate);
      targetDate.setMonth(currentDate.getMonth() - 1);
  }
  
  // Find the closest statement to the target date
  const [comparison] = await db
    .select()
    .from(financialStatements)
    .where(and(
      eq(financialStatements.companyId, companyId),
      eq(financialStatements.statementType, currentStatement.statementType),
      sql`${financialStatements.periodEnd} <= ${targetDate.toISOString().split('T')[0]}`
    ))
    .orderBy(desc(financialStatements.periodEnd))
    .limit(1);
    
  console.log('🎯 Comparison Statement Result:', {
    found: !!comparison,
    comparisonPeriodEnd: comparison?.periodEnd,
    comparisonSourceFile: comparison?.sourceFile,
    targetDateFormatted: targetDate.toISOString().split('T')[0],
    comparisonPeriod: comparisonPeriod,
    searchedForYear: targetDate.getFullYear(),
    searchedForMonth: targetDate.getMonth() + 1
  });
    
  return comparison;
}

function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function findCommonWords(accountNames: string[]): string[] {
  if (accountNames.length === 0) return [];
  if (accountNames.length === 1) return accountNames[0].split(' ');
  
  // Split all names into words and find common words
  const wordSets = accountNames.map(name => 
    new Set(name.toLowerCase().split(' ').filter(word => word.length > 2)) // Filter short words
  );
  
  // Find intersection of all word sets
  const commonWords = Array.from(wordSets[0]).filter(word =>
    wordSets.every(wordSet => wordSet.has(word))
  );
  
  // Return capitalized common words
  return commonWords.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

async function getProcessedLineItems(statementId: string): Promise<ProcessedLineItem[]> {
  const items = await db
    .select()
    .from(financialLineItems)
    .where(eq(financialLineItems.statementId, statementId));
    
  return items.map((item: any) => {
    let decryptedName = item.accountName;
    try {
      if (item.accountName && item.accountName.includes(':')) {
        decryptedName = decrypt(item.accountName);
      }
    } catch (e) {
      // Silent fail
    }
    
    // Extract amount from metadata if available
    let amount = parseFloat(item.amount as any) || 0;
    
    // Check if we have period data in metadata
    if (item.metadata) {
      let metadata = item.metadata as any;
      
      // Decrypt metadata if it's encrypted
      try {
        if (typeof metadata === 'string' && metadata.includes(':')) {
          metadata = decryptObject(metadata);
        }
      } catch (e) {
        console.warn('Failed to decrypt metadata:', e);
      }
      
      // Try to get period data from originalRow.periods
      if (metadata.originalRow && metadata.originalRow.periods) {
        const periods = metadata.originalRow.periods;
        const periodValues = Object.values(periods);
        
        // Find the first non-zero period value
        for (const value of periodValues) {
          const cleanValue = String(value).replace(/[$,\s]/g, '').trim();
          const parsedValue = parseFloat(cleanValue);
          if (!isNaN(parsedValue) && parsedValue !== 0) {
            amount = Math.abs(parsedValue); // Use absolute value
            break;
          }
        }
      } else if (metadata.periodData) {
        // Fallback to periodData if it exists
        const periodValues = Object.values(metadata.periodData);
        if (periodValues.length > 0) {
          const cleanValue = String(periodValues[0]).replace(/[$,\s]/g, '').trim();
          amount = parseFloat(cleanValue) || amount;
        }
      } else if (metadata.originalRow && metadata.originalRow.amount) {
        // Last fallback to originalRow.amount
        amount = parseFloat(metadata.originalRow.amount) || amount;
      }
    }
    
    return {
      id: item.id,
      accountCode: item.accountCode || '',
      accountName: decryptedName || '',
      category: item.category || 'other',
      amount: amount,
      subcategory: item.subcategory,
      isTotal: item.isTotal,
      isSubtotal: item.isSubtotal,
      parentTotalId: item.parentItemId
    };
  });
}

async function getHistoricalData(companyId: string, currentStatement: any) {
  console.log('\n=== getHistoricalData DEBUG START ===');
  console.log('Input parameters:', { companyId, statementId: currentStatement.id });
  
  // First, try to get the current statement's line items with period data
  const lineItems = await db
    .select()
    .from(financialLineItems)
    .where(eq(financialLineItems.statementId, currentStatement.id));
    
  console.log(`Found ${lineItems.length} line items for statement ${currentStatement.id}`);
    
  // Check if we have period data in the metadata
  let hasPeriodData = false;
  const periodData: Record<string, any> = {};
  
  // Extract all unique periods from line items
  lineItems.forEach((item: any) => {
    if (item.metadata) {
      let metadata = item.metadata as any;
      
      // Decrypt metadata if needed
      try {
        if (typeof metadata === 'string' && metadata.includes(':')) {
          metadata = decryptObject(metadata);
        }
      } catch (e) {
        console.warn('Failed to decrypt metadata:', e);
      }
      
      // Check for period data in multiple possible fields
      const periodsToCheck = metadata.periodValues || metadata.periods || {};
      
      if (periodsToCheck && Object.keys(periodsToCheck).length > 0) {
        hasPeriodData = true;
        Object.keys(periodsToCheck).forEach(period => {
          if (!periodData[period]) {
            periodData[period] = {
              revenue: [],
              cogs: [],
              operatingExpenses: [],
              otherIncome: [],
              otherExpenses: [],
              taxes: []
            };
          }
        });
      }
    }
  });
  
  const chartData = [];
  
  console.log('Period data analysis:', { hasPeriodData, periodsFound: Object.keys(periodData).length });
  if (Object.keys(periodData).length > 0) {
    console.log('Available periods:', Object.keys(periodData));
  } else {
    console.log('❌ NO PERIOD DATA FOUND - will fall back to individual statements');
    console.log('Sample metadata inspection (first 3 items):');
    lineItems.slice(0, 3).forEach((item: any, index: number) => {
      if (item.metadata) {
        let metadata = item.metadata;
        try {
          if (typeof metadata === 'string' && metadata.includes(':')) {
            metadata = decryptObject(metadata);
          }
        } catch (e) {
          // ignore
        }
        console.log(`  Item ${index + 1}: ${item.accountName}`);
        console.log(`    Raw metadata type: ${typeof item.metadata}`);
        console.log(`    Metadata keys: ${Object.keys(metadata || {}).join(', ')}`);
        if (metadata?.periods) {
          console.log(`    ✅ Has periods: ${Object.keys(metadata.periods).join(', ')}`);
        }
        if (metadata?.periodValues) {
          console.log(`    ✅ Has periodValues: ${Object.keys(metadata.periodValues).join(', ')}`);
        }
      }
    });
  }
  
  if (hasPeriodData && Object.keys(periodData).length > 0) {
    // Process each period from the metadata
    const processedItems = lineItems.map((item: any) => {
      let decryptedName = item.accountName;
      try {
        if (item.accountName && item.accountName.includes(':')) {
          decryptedName = decrypt(item.accountName);
        }
      } catch (e) {
        console.warn('Failed to decrypt:', e);
      }
      
      let metadata = item.metadata as any;
      try {
        if (typeof metadata === 'string' && metadata.includes(':')) {
          metadata = decryptObject(metadata);
        }
      } catch (e) {
        console.warn('Failed to decrypt metadata:', e);
      }
      
      return {
        ...item,
        accountName: decryptedName,
        metadata
      };
    });
    
    // Calculate metrics for each period
    const allPeriods = Object.keys(periodData);
    console.log('Found periods for processing:', allPeriods);
    
    // Sort periods chronologically (handle both formats)
    const sortedPeriods = allPeriods.sort((a, b) => {
      // Convert both periods to comparable format
      const getDateFromPeriod = (period: string) => {
        if (period.includes('-') && period.split('-')[0].length === 4) {
          // Format: "2025-01"
          const [year, month] = period.split('-');
          return new Date(parseInt(year), parseInt(month) - 1);
        } else {
          // Format: "Jan-25"
          const [monthAbbr, yearAbbr] = period.split('-');
          const monthMapping: Record<string, number> = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          const monthIndex = monthMapping[monthAbbr];
          const year = parseInt('20' + yearAbbr);
          return new Date(year, monthIndex);
        }
      };
      
      return getDateFromPeriod(a).getTime() - getDateFromPeriod(b).getTime();
    });
    
    console.log('Sorted periods:', sortedPeriods);
    
    for (const period of sortedPeriods) {
      console.log(`\n=== Processing period: ${period} ===`);
      
      // Create period-specific items with amounts for this period
      const periodItems = processedItems.map((item: any) => {
        const periodValue = item.metadata?.periodValues?.[period] || 
                           item.metadata?.periods?.[period] || 0;
        
        // Debug period extraction
        if (periodValue !== 0) {
          console.log(`  Found period data - ${item.accountName}: ${periodValue} (category: ${item.category})`);
        }
        
        return {
          id: item.id,
          accountCode: item.accountCode || '',
          accountName: item.accountName || '',
          category: item.category || 'other',
          amount: typeof periodValue === 'string' ? 
            parseFloat(periodValue.replace(/[$,\s()]/g, '')) || 0 : 
            periodValue,
          subcategory: item.subcategory,
          isTotal: item.isTotal || false,
          isSubtotal: item.isSubtotal || false,
          parentId: item.parentId || null
        };
      });
      
      // 🔥 CRITICAL FIX: Filter out totals, calculated items, and margins from YTD calculations
      // These items should NOT be included in YTD aggregation as they cause double/triple counting
      const filteredPeriodItems = periodItems.filter((item: any) => {
        // Exclude totals (which are sums of other items)
        if (item.isTotal || item.isSubtotal) {
          console.log(`  ❌ Excluding TOTAL item: ${item.accountName} (${item.category}) - ${item.amount}`);
          return false;
        }
        
        // Exclude calculated items and margins (which are derived from other data)
        const excludeCategories = [
          'total', 'calculation', 'margin', 'margin_ratios', 
          'profitability_metrics', 'calculated'
        ];
        if (excludeCategories.includes(item.category)) {
          console.log(`  ❌ Excluding ${item.category.toUpperCase()} item: ${item.accountName} - ${item.amount}`);
          return false;
        }
        
        // Include only base financial data
        console.log(`  ✅ Including base item: ${item.accountName} (${item.category}) - ${item.amount}`);
        return true;
      });
      
      console.log(`  📊 Period ${period}: ${periodItems.length} total items → ${filteredPeriodItems.length} base items for YTD`);
      
      // Use the same enhanced calculation logic as currentMonth, but with filtered items
      // 🔥 CRITICAL: All base calculations use filteredPeriodItems to avoid double-counting
      const revenue = calculateRevenue(filteredPeriodItems);
      const cogs = calculateCOGS(filteredPeriodItems);
      
      // Get Gross Profit from mapped total first, calculate as fallback
      const grossProfit = getMappedTotal(periodItems, 'gross_profit') || (revenue - cogs);
      
      const operatingExpenses = calculateOperatingExpenses(filteredPeriodItems);
      
      // Get Operating Income from mapped total first, calculate as fallback
      const operatingIncome = getMappedTotal(periodItems, 'operating_income') || 
                             (grossProfit - operatingExpenses);
      
      const otherIncome = calculateOtherIncome(filteredPeriodItems);
      const otherExpenses = calculateOtherExpenses(filteredPeriodItems);
      const taxes = calculateTaxes(filteredPeriodItems);
      
      // Calculate Earnings Before Tax: Operating Income + Other Income - Other Expenses
      const earningsBeforeTax = getMappedTotal(periodItems, 'earnings_before_tax') || 
                               (operatingIncome + otherIncome - otherExpenses);
      
      // Get Net Income from mapped total first
      const netIncome = getMappedTotal(periodItems, 'net_income') || 
                       (operatingIncome + otherIncome - otherExpenses - taxes);
      
      // Get EBITDA from mapped total first
      const depreciation = calculateDepreciation(filteredPeriodItems);
      const amortization = calculateAmortization(filteredPeriodItems);
      const mappedEbitdaYtd = getMappedTotal(periodItems, 'ebitda');
      const calculatedEbitdaYtd = operatingIncome + depreciation + amortization;
      const ebitda = mappedEbitdaYtd || calculatedEbitdaYtd;
      
      if (mappedEbitdaYtd) {
        console.log(`  💰 YTD ${period}: Using MAPPED EBITDA = ${mappedEbitdaYtd}`);
      } else {
        console.log(`  💰 YTD ${period}: Using CALCULATED EBITDA = ${calculatedEbitdaYtd} (${operatingIncome} + ${depreciation} + ${amortization})`);
      }
      
      // Convert period format for display
      // Handle both formats: "2025-01" and "Jan-25"
      let monthName, periodYear, monthIndex;
      
      if (period.includes('-') && period.split('-')[0].length === 4) {
        // Format: "2025-01"
        const [year, month] = period.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        monthIndex = parseInt(month) - 1;
        monthName = monthNames[monthIndex];
        periodYear = parseInt(year);
      } else {
        // Format: "Jan-25", "Feb-25", etc.
        const [monthAbbr, yearAbbr] = period.split('-');
        const monthMapping: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const monthNamesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        monthIndex = monthMapping[monthAbbr];
        if (monthIndex === undefined) {
          console.warn(`Invalid month abbreviation ${monthAbbr} for period ${period}`);
          continue;
        }
        
        monthName = monthNamesEs[monthIndex];
        periodYear = parseInt('20' + yearAbbr); // Convert "25" to 2025
      }
      
      // Validate month index
      if (monthIndex < 0 || monthIndex > 11) {
        console.warn(`Invalid month index ${monthIndex} for period ${period}`);
        continue;
      }
      
      // Skip invalid years
      if (isNaN(periodYear) || periodYear < 2000 || periodYear > 2100) {
        console.warn(`Invalid year ${periodYear} for period ${period}`);
        continue;
      }
      
      // Skip future periods
      const periodDate = new Date(periodYear, monthIndex);
      const currentDate = new Date();
      if (periodDate > currentDate) {
        console.warn(`Skipping future period ${period}`);
        continue;
      }
      
      // Skip periods only if absolutely no financial data exists
      if (revenue === 0 && cogs === 0 && operatingExpenses === 0 && taxes === 0 && otherIncome === 0) {
        console.warn(`Skipping period ${period} with absolutely no financial data`);
        continue;
      }
      
      // Log what data we found for this period
      console.log(`Including period ${period} (${monthName} ${periodYear}) with data:`, {
        revenue, cogs, operatingExpenses, taxes, otherIncome, netIncome, ebitda
      });
      
      chartData.push({
        id: period,
        month: monthName,
        year: periodYear,
        revenue,
        cogs,
        grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        operatingExpenses,
        operatingIncome,
        operatingMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
        otherIncome,
        otherExpenses,
        earningsBeforeTax,
        earningsBeforeTaxMargin: revenue > 0 ? (earningsBeforeTax / revenue) * 100 : 0,
        ebitda,
        ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
        taxes,
        netIncome,
        netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0
      });
    }
  } else {
    // Fallback to old behavior if no period data
    console.log('No period data found in metadata, falling back to separate statements');
    const statements = await db
      .select()
      .from(financialStatements)
      .where(and(
        eq(financialStatements.companyId, companyId),
        eq(financialStatements.statementType, 'profit_loss')
      ))
      .orderBy(desc(financialStatements.periodEnd))
      .limit(12);
      
    console.log(`Found ${statements.length} historical statements for company ${companyId}`);

    for (const stmt of statements.reverse()) {
      const items = await getProcessedLineItems(stmt.id);
      
      // 🔥 CRITICAL FIX: Filter out totals, calculated items, and margins from historical calculations
      const filteredHistoricalItems = items.filter(item => {
        // Exclude totals (which are sums of other items)
        if (item.isTotal || item.isSubtotal) {
          return false;
        }
        
        // Exclude calculated items and margins (which are derived from other data)
        const excludeCategories = [
          'total', 'calculation', 'margin', 'margin_ratios', 
          'profitability_metrics', 'calculated'
        ];
        if (excludeCategories.includes(item.category)) {
          return false;
        }
        
        return true;
      });
      
      console.log(`📊 Historical ${stmt.id}: ${items.length} total items → ${filteredHistoricalItems.length} base items`);
      
      // Use the same enhanced calculation logic as currentMonth with filtered items
      const revenue = calculateRevenue(filteredHistoricalItems);
      const cogs = calculateCOGS(filteredHistoricalItems);
      
      // Get Gross Profit from mapped total first, calculate as fallback
      const grossProfit = getMappedTotal(items, 'gross_profit') || (revenue - cogs);
      
      const operatingExpenses = calculateOperatingExpenses(filteredHistoricalItems);
      
      // Get Operating Income from mapped total first, calculate as fallback
      const operatingIncome = getMappedTotal(items, 'operating_income') || 
                             (grossProfit - operatingExpenses);
      
      const otherIncome = calculateOtherIncome(filteredHistoricalItems);
      const otherExpenses = calculateOtherExpenses(filteredHistoricalItems);
      const taxes = calculateTaxes(filteredHistoricalItems);
      
      // Calculate Earnings Before Tax: Operating Income + Other Income - Other Expenses
      const earningsBeforeTax = getMappedTotal(items, 'earnings_before_tax') || 
                               (operatingIncome + otherIncome - otherExpenses);
      
      // Get Net Income from mapped total first
      const netIncome = getMappedTotal(items, 'net_income') || 
                       (operatingIncome + otherIncome - otherExpenses - taxes);
      
      // Get EBITDA from mapped total first
      const depreciation = calculateDepreciation(filteredHistoricalItems);
      const amortization = calculateAmortization(filteredHistoricalItems);
      const ebitda = getMappedTotal(items, 'ebitda') || 
                    (operatingIncome + depreciation + amortization);
      
      // Skip future periods
      const periodDate = new Date(stmt.periodEnd);
      const currentDate = new Date();
      if (periodDate > currentDate) {
        console.warn(`Skipping future period from statement ${stmt.id}`);
        continue;
      }
      
      // Skip periods only if absolutely no financial data exists
      if (revenue === 0 && cogs === 0 && operatingExpenses === 0 && taxes === 0 && otherIncome === 0) {
        console.warn(`Skipping statement ${stmt.id} with absolutely no financial data`);
        continue;
      }
      
      // Process period from database date
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthIndex = periodDate.getMonth();
      const monthName = months[monthIndex];
      const year = periodDate.getFullYear();
      
      // Debug invalid dates
      if (monthIndex < 0 || monthIndex > 11 || !monthName) {
        console.error(`❌ Invalid date processing for statement ${stmt.id}:`, {
          rawPeriodEnd: stmt.periodEnd,
          periodDate: periodDate,
          monthIndex: monthIndex,
          monthName: monthName,
          year: year
        });
        continue; // Skip this invalid period
      }
      
      console.log(`📊 Including ${monthName} ${year} - Revenue: ${revenue}`);
      
      chartData.push({
        id: stmt.id,
        month: monthName,
        year: year,
        revenue,
        cogs,
        grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        operatingExpenses,
        operatingIncome,
        operatingMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
        otherIncome,
        otherExpenses,
        earningsBeforeTax,
        earningsBeforeTaxMargin: revenue > 0 ? (earningsBeforeTax / revenue) * 100 : 0,
        ebitda,
        ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
        taxes,
        netIncome,
        netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0
      });
    }
  }
  
  // Remove duplicates based on period ID using year-month numeric key
  const uniquePeriods = new Map<string, any>();
  
  console.log(`🔍 Deduplicating ${chartData.length} periods`);
  
  chartData.forEach(period => {
    // Create consistent numeric key for deduplication
    const monthOrderEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthIndex = monthOrderEs.indexOf(period.month);
    
    if (monthIndex === -1) {
      console.warn(`❌ Unknown month name: ${period.month}. Skipping period.`);
      return; // Skip invalid month names
    }
    
    const monthNumber = (monthIndex + 1).toString().padStart(2, '0');
    const periodKey = `${period.year}-${monthNumber}`;
    
    if (!uniquePeriods.has(periodKey) || period.revenue > (uniquePeriods.get(periodKey)?.revenue || 0)) {
      uniquePeriods.set(periodKey, period);
    }
  });
  
  // Convert back to array and sort by date (OLDEST first for chronological display)
  const sortedChartData = Array.from(uniquePeriods.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year; // Oldest year first
    const monthOrderEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthA = monthOrderEs.indexOf(a.month);
    const monthB = monthOrderEs.indexOf(b.month);
    return monthA - monthB; // January first, then February, etc.
  });
  
  console.log(`📋 Final sorted chart data (${sortedChartData.length} periods):`);
  sortedChartData.forEach((period, index) => {
    console.log(`  [${index}] ${period.month} ${period.year} - Revenue: ${period.revenue}`);
  });
  
  console.log('🎯 Final chartData after deduplication and sorting:');
  sortedChartData.forEach((period, index) => {
    console.log(`  ${index + 1}. ${period.month} ${period.year}: Revenue=${period.revenue}, ID=${period.id}`);
  });
  
  console.log('Final chartData summary:', {
    totalPeriods: sortedChartData.length,
    periodsWithRevenue: sortedChartData.filter(d => d.revenue > 0).length,
    firstPeriod: sortedChartData[0]?.month + ' ' + sortedChartData[0]?.year,
    lastPeriod: sortedChartData[sortedChartData.length - 1]?.month + ' ' + sortedChartData[sortedChartData.length - 1]?.year,
    totalRevenue: sortedChartData.reduce((sum, d) => sum + d.revenue, 0),
    samplePeriods: sortedChartData.slice(0, 3).map(d => ({
      period: `${d.month} ${d.year}`,
      revenue: d.revenue,
      cogs: d.cogs,
      operatingExpenses: d.operatingExpenses
    }))
  });
  console.log('=== getHistoricalData DEBUG END ===\n');
  
  return sortedChartData;
}

function formatMonth(date: string): string {
  const d = new Date(date);
  // Validate the date
  if (isNaN(d.getTime())) {
    console.warn('Invalid date provided to formatMonth:', date);
    return 'Unknown';
  }
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthIndex = d.getMonth();
  if (monthIndex < 0 || monthIndex > 11) {
    console.warn('Invalid month index:', monthIndex, 'for date:', date);
    return 'Unknown';
  }
  const formatted = `${months[monthIndex]} ${d.getFullYear()}`;
  
  console.log('🗓️ formatMonth Debug:', {
    inputDate: date,
    parsedDate: d.toISOString(),
    monthIndex: monthIndex,
    monthName: months[monthIndex],
    year: d.getFullYear(),
    formatted: formatted
  });
  
  return formatted;
}

function formatMonthFromPeriodId(periodId: string): string {
  // periodId format is "2025-05" for May 2025
  const [year, month] = periodId.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex]} ${year}`;
}

// Helper function to resolve subcategory labels
async function resolveSubcategoryLabels(companyId: string): Promise<Map<string, string>> {
  const labelMap = new Map<string, string>();
  
  try {
    // Get company from database to find organization
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!company) {
      console.warn(`Company ${companyId} not found for subcategory resolution`);
      return labelMap;
    }
    
    // Get organization subcategories (defaults)
    const orgSubcategories = await db
      .select()
      .from(organizationSubcategories)
      .where(eq(organizationSubcategories.organizationId, company.organizationId));
    
    // Get company-specific subcategories (overrides)
    const companySubcats = await db
      .select()
      .from(companySubcategories)
      .where(eq(companySubcategories.companyId, companyId));
    
    // Build label map - organization defaults first
    for (const sub of orgSubcategories) {
      labelMap.set(sub.value, sub.label);
    }
    
    // Override with company-specific labels
    for (const sub of companySubcats) {
      labelMap.set(sub.value, sub.label);
    }
    
    console.log(`Resolved ${labelMap.size} subcategory labels for company ${companyId}`);
    console.log('Subcategory label map:', Array.from(labelMap.entries()));
    return labelMap;
  } catch (error) {
    console.error('Error resolving subcategory labels:', error);
    return labelMap;
  }
}

// Helper function to format subcategory codes as fallback labels
function formatSubcategoryCodeAsFallback(code: string): string {
  if (!code || typeof code !== 'string') return 'Other';
  
  // Convert snake_case or kebab-case to title case
  return code
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper function to suggest standardized subcategory codes
function suggestStandardizedSubcategoryCode(code: string): string {
  if (!code || typeof code !== 'string') return 'other';
  
  // Common standardization mappings
  const standardMappings: Record<string, string> = {
    'salary': 'salaries',
    'personnel': 'salaries',
    'hr': 'salaries',
    'payroll': 'salaries',
    'marketing': 'marketing',
    'advertising': 'marketing',
    'promotion': 'marketing',
    'travel': 'travel_accommodation',
    'accommodation': 'travel_accommodation',
    'professional': 'professional_services',
    'consulting': 'professional_services',
    'legal': 'professional_services',
    'office': 'office_supplies',
    'supplies': 'office_supplies',
    'training': 'training_development',
    'development': 'training_development',
    'software': 'software_subscriptions',
    'subscriptions': 'software_subscriptions',
    'health': 'health_coverage',
    'insurance': 'health_coverage',
    'benefits': 'personnel_benefits',
    'bank': 'bank_fees',
    'fees': 'bank_fees',
    'meals': 'meals_entertainment',
    'entertainment': 'meals_entertainment',
    'phone': 'cell_phones',
    'mobile': 'cell_phones',
    'miscellaneous': 'miscellaneous',
    'other': 'other'
  };
  
  const normalized = code.toLowerCase().replace(/[_-\s]/g, '');
  
  // Find best match
  for (const [key, value] of Object.entries(standardMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // If no match found, return formatted version
  return code.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Helper function to get categories breakdown for detailed display
async function getCategoriesBreakdown(items: ProcessedLineItem[], companyId: string) {
  // Resolve subcategory labels
  const subcategoryLabels = await resolveSubcategoryLabels(companyId);
  
  // Debug: Log all unique subcategory codes found in items
  const uniqueSubcategoryCodes = new Set(items.map(item => item.subcategory).filter(Boolean) as string[]);
  console.log('Unique subcategory codes in financial line items:', Array.from(uniqueSubcategoryCodes));
  
  // Debug: Check which codes have matching labels
  const matchingCodes = Array.from(uniqueSubcategoryCodes).filter(code => subcategoryLabels.has(code));
  const missingCodes = Array.from(uniqueSubcategoryCodes).filter(code => !subcategoryLabels.has(code));
  console.log('Matching subcategory codes:', matchingCodes);
  console.log('Missing subcategory codes:', missingCodes);
  
  // Add validation warnings for missing subcategory labels
  if (missingCodes.length > 0) {
    console.warn(`⚠️  Found ${missingCodes.length} subcategory codes without corresponding labels in database:`);
    missingCodes.forEach(code => {
      const fallbackLabel = formatSubcategoryCodeAsFallback(code);
      const suggestedCode = suggestStandardizedSubcategoryCode(code);
      console.warn(`   - "${code}" → "${fallbackLabel}" (suggested standard code: "${suggestedCode}")`);
    });
    console.warn('Consider adding these subcategory codes to the organization_subcategories or company_subcategories tables');
    console.warn('Example SQL to add missing subcategories:');
    missingCodes.forEach(code => {
      const fallbackLabel = formatSubcategoryCodeAsFallback(code);
      const suggestedCode = suggestStandardizedSubcategoryCode(code);
      console.warn(`   INSERT INTO organization_subcategories (organization_id, value, label) VALUES ('{org_id}', '${suggestedCode}', '${fallbackLabel}');`);
    });
  }
  const categories: {
    revenue: Array<{category: string; subcategory: string; amount: number; percentage: number; items?: Array<{accountName: string; amount: number; percentage: number}>}>;
    cogs: Array<{category: string; subcategory: string; amount: number; percentage: number; items?: Array<{accountName: string; amount: number; percentage: number}>}>;
    operatingExpenses: Array<{category: string; subcategory: string; amount: number; percentage: number; items?: Array<{accountName: string; amount: number; percentage: number}>}>;
    taxes: Array<{category: string; subcategory: string; amount: number; percentage: number; items?: Array<{accountName: string; amount: number; percentage: number}>}>;
  } = {
    revenue: [],
    cogs: [],
    operatingExpenses: [],
    taxes: []
  };

  // Helper function to get detail items for a category using the same logic as calculateByCategory
  function getDetailItemsForCategory(items: ProcessedLineItem[], targetCategory: string): ProcessedLineItem[] {
    // Find all totals that match the target category
    const categoryTotals = items.filter(item => {
      if (!item.isTotal) return false;
      return item.category === targetCategory;
    });
    
    // For each matching total, get ALL its detail items
    const allDetailItems: ProcessedLineItem[] = [];
    
    categoryTotals.forEach(total => {
      // Get all children recursively
      const children = getChildrenOfTotal(items, total.id);
      
      // Add only detail items (not subtotals) to avoid double counting
      const detailChildren = children.filter(child => !child.isTotal && !child.isSubtotal);
      
      // Add to our collection
      detailChildren.forEach(child => {
        if (!allDetailItems.find(item => item.id === child.id)) {
          allDetailItems.push(child);
        }
      });
    });
    
    // FALLBACK: If no hierarchical relationship is established, 
    // get all detail items of the same category
    if (allDetailItems.length === 0) {
      const detailItems = items.filter(item => 
        item.category === targetCategory && 
        !item.isTotal && 
        !item.isSubtotal
      );
      allDetailItems.push(...detailItems);
    }
    
    return allDetailItems;
  }

  // Get detail items for each category using the same logic as main calculations
  const categorizedItems = {
    revenue: getDetailItemsForCategory(items, 'revenue'),
    cogs: getDetailItemsForCategory(items, 'cogs'),
    operatingExpenses: getDetailItemsForCategory(items, 'operating_expenses'),
    taxes: getDetailItemsForCategory(items, 'taxes')
  };

  // Calculate totals for percentage calculations (using same logic as main calculations)
  const totals = {
    revenue: calculateRevenue(items),
    cogs: calculateCOGS(items),
    operatingExpenses: calculateOperatingExpenses(items),
    taxes: calculateTaxes(items)
  };

  // Debug: Log what we found for each category
  console.log('\n=== getCategoriesBreakdown Debug ===');
  console.log('Categorized items:', {
    revenue: categorizedItems.revenue.length,
    cogs: categorizedItems.cogs.length,
    operatingExpenses: categorizedItems.operatingExpenses.length,
    taxes: categorizedItems.taxes.length
  });
  console.log('Totals:', totals);
  
  // Build breakdown for each category
  Object.keys(categorizedItems).forEach(categoryKey => {
    const categoryItems = categorizedItems[categoryKey as keyof typeof categorizedItems];
    const categoryTotal = totals[categoryKey as keyof typeof totals];
    
    if (categoryTotal > 0) {
      if (categoryItems.length > 0) {
        // Group items by subcategory
        const subcategoryGroups: { [key: string]: { items: typeof categoryItems, total: number } } = {};
        
        categoryItems.forEach(item => {
          const subcategoryKey = item.subcategory || 'Other';
          if (!subcategoryGroups[subcategoryKey]) {
            subcategoryGroups[subcategoryKey] = { items: [], total: 0 };
          }
          subcategoryGroups[subcategoryKey].items.push(item);
          subcategoryGroups[subcategoryKey].total += Math.abs(item.amount);
        });
        
        // Convert subcategory groups to the expected format
        categories[categoryKey as keyof typeof categories] = Object.entries(subcategoryGroups).map(([subcategoryCode, group]) => {
          const subcategoryLabel = subcategoryLabels.get(subcategoryCode) || formatSubcategoryCodeAsFallback(subcategoryCode);
          
          // Debug: Log the resolution for this subcategory
          if (!subcategoryLabels.has(subcategoryCode)) {
            console.log(`Using fallback for subcategory code "${subcategoryCode}" -> "${subcategoryLabel}"`);
          }
          
          // Always group by subcategory from the Excel mapping
          // Use the subcategory code directly from the mapping - no made-up labels
          let displayName = subcategoryCode; // Use the actual subcategory from Excel
          
          // Only use database labels if they exist, otherwise use the raw subcategory code
          if (subcategoryLabels.has(subcategoryCode)) {
            displayName = subcategoryLabels.get(subcategoryCode) || subcategoryCode;
          }
          
          // 🔍 DEBUG: Log what we're actually sending to frontend
          console.log(`🏷️ Category being sent to frontend:`, {
            subcategoryCode,
            displayName,
            hasDbLabel: subcategoryLabels.has(subcategoryCode),
            dbLabel: subcategoryLabels.get(subcategoryCode)
          });
          
          return {
            category: displayName, // Use consistent display name
            subcategory: subcategoryCode, // Keep original code for reference
            amount: group.total,
            percentage: (group.total / categoryTotal) * 100,
            // Add detailed items for drill-down functionality
            items: group.items.map(item => ({
              accountName: item.accountName,
              amount: Math.abs(item.amount),
              percentage: (Math.abs(item.amount) / group.total) * 100
            }))
          };
        });
        
        console.log(`${categoryKey} grouped by subcategory:`, categories[categoryKey as keyof typeof categories]);
      } else {
        // Fallback: if no detail items, use the totals themselves
        const targetCategory = categoryKey === 'operatingExpenses' ? 'operating_expenses' : categoryKey;
        const categoryTotals = items.filter(item => {
          if (!item.isTotal) return false;
          return item.category === targetCategory;
        });
        
        if (categoryTotals.length > 0) {
          categories[categoryKey as keyof typeof categories] = categoryTotals.map(item => {
            const subcategoryCode = item.subcategory || 'other';
            const subcategoryLabel = subcategoryLabels.get(subcategoryCode) || formatSubcategoryCodeAsFallback(subcategoryCode);
            
            // Debug: Log the resolution for this subcategory  
            if (!subcategoryLabels.has(subcategoryCode)) {
              console.log(`Using fallback for subcategory code "${subcategoryCode}" -> "${subcategoryLabel}"`);
            }
            
            // Use the account name for consistency if available, otherwise use subcategory label
            const displayName = item.accountName || subcategoryLabel;
            
            return {
              category: displayName,
              subcategory: subcategoryCode,
              amount: Math.abs(item.amount),
              percentage: (Math.abs(item.amount) / categoryTotal) * 100
            };
          });
        } else {
          // Last resort: create a single entry if we have a total but no line items
          categories[categoryKey as keyof typeof categories] = [{
            category: `Total ${categoryKey}`,
            subcategory: 'other',
            amount: categoryTotal,
            percentage: 100
          }];
        }
      }
    }
  });

  // Debug: Log final result
  console.log('Final categories breakdown:', {
    revenue: categories.revenue.length,
    cogs: categories.cogs.length,
    operatingExpenses: categories.operatingExpenses.length
  });
  console.log('Operating expenses breakdown:', categories.operatingExpenses);
  console.log('=== End getCategoriesBreakdown Debug ===\n');

  return categories;
}