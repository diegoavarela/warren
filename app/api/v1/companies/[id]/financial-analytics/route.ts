import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, companies, eq, and, sql, desc } from "@/lib/db";
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
          parentTotalId: item.parentTotalId,
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

      // Calculate comprehensive metrics
      const revenue = calculateRevenue(processedItems);
      const cogs = calculateCOGS(processedItems);
      const grossProfit = revenue - cogs;
      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      
      const operatingExpenses = calculateOperatingExpenses(processedItems);
      const operatingIncome = grossProfit - operatingExpenses;
      const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
      
      // Other income/expenses
      const otherIncome = calculateOtherIncome(processedItems);
      const otherExpenses = calculateOtherExpenses(processedItems);
      
      // Taxes
      const taxes = calculateTaxes(processedItems);
      
      // Get Net Income directly from mapped line items
      const netIncome = getNetIncome(processedItems) || (operatingIncome + otherIncome - otherExpenses - taxes);
      const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;
      
      // Get EBITDA directly from mapped line items
      const ebitda = getEBITDA(processedItems) || operatingIncome;
      const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;
      
      // Debug calculations
      console.log('Financial calculations:', {
        revenue,
        cogs,
        grossProfit,
        operatingExpenses,
        operatingIncome,
        otherIncome,
        otherExpenses,
        taxes,
        netIncome,
        ebitda
      });

      // Personnel cost breakdown
      const personnelCosts = calculatePersonnelCosts(processedItems);
      const contractServices = calculateContractServices(processedItems);

      // Get previous period for comparison
      const previousStatement = await getPreviousStatement(companyId, statement);
      let previousMonth = null;
      
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
        previousMonth.netIncome = getNetIncome(prevItems) || (previousMonth.operatingIncome + prevOtherIncome - prevOtherExpenses - prevTaxes);
        previousMonth.netMargin = previousMonth.revenue > 0 ? (previousMonth.netIncome / previousMonth.revenue) * 100 : 0;
        
        previousMonth.ebitda = getEBITDA(prevItems) || previousMonth.operatingIncome;
        previousMonth.ebitdaMargin = previousMonth.revenue > 0 ? (previousMonth.ebitda / previousMonth.revenue) * 100 : 0;
      }

      // Get historical data for charts (last 12 months)
      const chartData = await getHistoricalData(companyId, statement);

      // Get company details for currency and units
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      // Extract units from the first line item's metadata
      let displayUnits = 'units';
      if (lineItems.length > 0) {
        const firstItem = lineItems[0];
        let metadata = firstItem.metadata as any;
        try {
          if (typeof metadata === 'string' && metadata.includes(':')) {
            metadata = decryptObject(metadata);
          }
          if (metadata && metadata.units) {
            displayUnits = metadata.units;
          }
        } catch (e) {
          console.warn('Failed to extract units from metadata:', e);
        }
      }

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
          netIncome,
          netMargin,
          ebitda,
          ebitdaMargin,
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
        previousMonth,
        yearToDate: {
          revenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
          cogs: chartData.reduce((sum, d) => sum + d.cogs, 0),
          grossProfit: chartData.reduce((sum, d) => sum + d.grossProfit, 0),
          grossMargin: chartData.length > 0 && chartData.reduce((sum, d) => sum + d.revenue, 0) > 0 
            ? (chartData.reduce((sum, d) => sum + d.grossProfit, 0) / chartData.reduce((sum, d) => sum + d.revenue, 0)) * 100 
            : 0,
          operatingExpenses: chartData.reduce((sum, d) => sum + d.operatingExpenses, 0),
          operatingIncome: chartData.reduce((sum, d) => sum + d.operatingIncome, 0),
          operatingMargin: chartData.length > 0 && chartData.reduce((sum, d) => sum + d.revenue, 0) > 0
            ? (chartData.reduce((sum, d) => sum + d.operatingIncome, 0) / chartData.reduce((sum, d) => sum + d.revenue, 0)) * 100
            : 0,
          taxes: chartData.reduce((sum, d) => sum + (d.taxes || 0), 0),
          netIncome: chartData.reduce((sum, d) => sum + d.netIncome, 0),
          netMargin: chartData.length > 0 && chartData.reduce((sum, d) => sum + d.revenue, 0) > 0
            ? (chartData.reduce((sum, d) => sum + d.netIncome, 0) / chartData.reduce((sum, d) => sum + d.revenue, 0)) * 100
            : 0,
          ebitda: chartData.reduce((sum, d) => sum + (d.ebitda || 0), 0),
          ebitdaMargin: chartData.length > 0 && chartData.reduce((sum, d) => sum + d.revenue, 0) > 0
            ? (chartData.reduce((sum, d) => sum + (d.ebitda || 0), 0) / chartData.reduce((sum, d) => sum + d.revenue, 0)) * 100
            : 0,
          monthsIncluded: chartData.filter(d => d.revenue > 0).length
        },
        summary: {
          totalRevenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
          totalCOGS: chartData.reduce((sum, d) => sum + d.cogs, 0),
          totalGrossProfit: chartData.reduce((sum, d) => sum + d.grossProfit, 0),
          avgGrossMargin: chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.grossMargin, 0) / chartData.length : 0,
          totalOperatingExpenses: chartData.reduce((sum, d) => sum + d.operatingExpenses, 0),
          totalOperatingIncome: chartData.reduce((sum, d) => sum + d.operatingIncome, 0),
          avgOperatingMargin: chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.operatingMargin, 0) / chartData.length : 0,
          totalNetIncome: chartData.reduce((sum, d) => sum + d.netIncome, 0),
          avgNetMargin: chartData.length > 0 ? chartData.reduce((sum, d) => sum + d.netMargin, 0) / chartData.length : 0
        },
        categories: getCategoriesBreakdown(processedItems),
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
    if (child.isTotal) {
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
    
    // Only check the category - it was already classified during import
    return item.category === targetCategory;
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
    console.log(`No ${targetCategory} items found\n`);
  }
  
  return total;
}

// Specific calculation functions using the generic approach
function calculateRevenue(items: ProcessedLineItem[]): number {
  const revenue = calculateByCategory(items, 'revenue');
  console.log('Revenue calculation:', revenue, 'from', items.length, 'total items');
  return revenue;
}

function calculateCOGS(items: ProcessedLineItem[]): number {
  const cogs = calculateByCategory(items, 'cogs');
  console.log('COGS calculation:', cogs, 'from', items.length, 'total items');
  return cogs;
}

function calculateOperatingExpenses(items: ProcessedLineItem[]): number {
  const opex = calculateByCategory(items, 'operating_expenses');
  console.log('Operating expenses:', opex, 'from', items.length, 'total items');
  return opex;
}

function calculateOtherIncome(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'other_income');
}

function calculateOtherExpenses(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'other_expenses');
}

function calculateTaxes(items: ProcessedLineItem[]): number {
  return calculateByCategory(items, 'taxes');
}

function getNetIncome(items: ProcessedLineItem[]): number {
  // Look for line items specifically marked as Net Income, Net Profit, Utilidad Neta, etc.
  const netIncomeItem = items.find(item => {
    const name = item.accountName.toLowerCase();
    return name.includes('net income') || 
           name.includes('net profit') || 
           name.includes('utilidad neta') ||
           name.includes('resultado neto') ||
           name.includes('ganancia neta') ||
           (item.category === 'net_income');
  });
  
  if (netIncomeItem) {
    console.log('Found Net Income item:', netIncomeItem.accountName, netIncomeItem.amount);
    return Math.abs(netIncomeItem.amount);
  }
  
  return 0;
}

function getEBITDA(items: ProcessedLineItem[]): number {
  // Look for line items specifically marked as EBITDA
  const ebitdaItem = items.find(item => {
    const name = item.accountName.toLowerCase();
    return name.includes('ebitda') || 
           name.includes('ebit') ||
           (item.category === 'ebitda');
  });
  
  if (ebitdaItem) {
    console.log('Found EBITDA item:', ebitdaItem.accountName, ebitdaItem.amount);
    return Math.abs(ebitdaItem.amount);
  }
  
  return 0;
}

function calculatePersonnelCosts(items: ProcessedLineItem[]) {
  console.log('\nCalculating personnel costs:');
  
  // Find all items that are operating expenses
  const opexItems = items.filter(item => 
    item.category === 'operating_expenses' || 
    item.category === 'gastos_operativos' ||
    item.category === 'opex'
  );
  
  // From those, find personnel-related totals
  const personnelKeywords = ['personnel', 'personal', 'employee', 'empleado', 'salary', 'salario', 
                            'sueldo', 'nomina', 'payroll', 'wages', 'remuneracion', 
                            'benefit', 'prestacion', 'compensacion'];
  
  const personnelTotals = opexItems.filter(item => {
    if (!item.isTotal) return false;
    const lowerName = item.accountName.toLowerCase();
    return personnelKeywords.some(keyword => lowerName.includes(keyword));
  });
  
  console.log(`Found ${personnelTotals.length} personnel totals`);
  
  // Get all detail items under personnel totals
  const allPersonnelDetails: ProcessedLineItem[] = [];
  
  personnelTotals.forEach(total => {
    console.log(`Processing personnel total: ${total.accountName} (${total.amount})`);
    
    const children = getChildrenOfTotal(items, total.id);
    const detailChildren = children.filter(child => !child.isTotal);
    
    console.log(`  Found ${detailChildren.length} detail items`);
    
    detailChildren.forEach(child => {
      if (!allPersonnelDetails.find(item => item.id === child.id)) {
        allPersonnelDetails.push(child);
      }
    });
  });
  
  // Calculate totals
  const total = allPersonnelDetails.reduce((sum, item) => sum + Math.abs(item.amount), 0);
  
  // For now, use simple allocations (can be refined based on actual data structure)
  const salariesEstimate = total * 0.7; // Assume 70% is salaries
  const benefitsEstimate = total * 0.3; // Assume 30% is benefits
  
  const result = {
    total: total,
    salariesCoR: 0, // Would need more specific categorization
    taxesCoR: 0,
    salariesOp: salariesEstimate,
    taxesOp: salariesEstimate * 0.15, // Estimated payroll taxes
    healthCoverage: benefitsEstimate * 0.6,
    benefits: benefitsEstimate * 0.4
  };
  
  console.log('Personnel costs result:', result);
  console.log(`Total from ${allPersonnelDetails.length} detail items\n`);
  
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
      subcategory: item.subcategory
    };
  });
}

async function getHistoricalData(companyId: string, currentStatement: any) {
  // First, try to get the current statement's line items with period data
  const lineItems = await db
    .select()
    .from(financialLineItems)
    .where(eq(financialLineItems.statementId, currentStatement.id));
    
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
      
      if (metadata.periodValues) {
        hasPeriodData = true;
        Object.keys(metadata.periodValues).forEach(period => {
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
    const sortedPeriods = Object.keys(periodData).sort();
    
    for (const period of sortedPeriods) {
      // Create period-specific items with amounts for this period
      const periodItems = processedItems.map((item: any) => {
        const periodValue = item.metadata?.periodValues?.[period] || 0;
        return {
          id: item.id,
          accountCode: item.accountCode || '',
          accountName: item.accountName || '',
          category: item.category || 'other',
          amount: typeof periodValue === 'string' ? 
            parseFloat(periodValue.replace(/[$,\s()]/g, '')) || 0 : 
            periodValue,
          subcategory: item.subcategory
        };
      });
      
      const revenue = calculateRevenue(periodItems);
      const cogs = calculateCOGS(periodItems);
      const grossProfit = revenue - cogs;
      const operatingExpenses = calculateOperatingExpenses(periodItems);
      const operatingIncome = grossProfit - operatingExpenses;
      
      const otherIncome = calculateOtherIncome(periodItems);
      const otherExpenses = calculateOtherExpenses(periodItems);
      const taxes = calculateTaxes(periodItems);
      const netIncome = getNetIncome(periodItems) || (operatingIncome + otherIncome - otherExpenses - taxes);
      const ebitda = getEBITDA(periodItems) || operatingIncome;
      
      // Convert period format for display
      const [year, month] = period.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthName = monthNames[parseInt(month) - 1];
      
      chartData.push({
        id: period,
        month: `${monthName} ${year}`,
        revenue,
        cogs,
        grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        operatingExpenses,
        operatingIncome,
        operatingMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
        otherIncome,
        otherExpenses,
        ebitda,
        ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
        taxes,
        netIncome,
        netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0
      });
    }
  } else {
    // Fallback to old behavior if no period data
    const statements = await db
      .select()
      .from(financialStatements)
      .where(and(
        eq(financialStatements.companyId, companyId),
        eq(financialStatements.statementType, 'profit_loss')
      ))
      .orderBy(desc(financialStatements.periodEnd))
      .limit(12);

    for (const stmt of statements.reverse()) {
      const items = await getProcessedLineItems(stmt.id);
      const revenue = calculateRevenue(items);
      const cogs = calculateCOGS(items);
      const grossProfit = revenue - cogs;
      const operatingExpenses = calculateOperatingExpenses(items);
      const operatingIncome = grossProfit - operatingExpenses;
      
      const otherIncome = calculateOtherIncome(items);
      const otherExpenses = calculateOtherExpenses(items);
      const taxes = calculateTaxes(items);
      const netIncome = getNetIncome(items) || (operatingIncome + otherIncome - otherExpenses - taxes);
      const ebitda = getEBITDA(items) || operatingIncome;
      
      chartData.push({
        id: stmt.id,
        month: formatMonth(stmt.periodEnd),
        revenue,
        cogs,
        grossProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        operatingExpenses,
        operatingIncome,
        operatingMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
        otherIncome,
        otherExpenses,
        ebitda,
        ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
        taxes,
        netIncome,
        netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0
      });
    }
  }
  
  return chartData;
}

function formatMonth(date: string): string {
  const d = new Date(date);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatMonthFromPeriodId(periodId: string): string {
  // periodId format is "2025-05" for May 2025
  const [year, month] = periodId.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex]} ${year}`;
}

// Helper function to get categories breakdown for detailed display
function getCategoriesBreakdown(items: ProcessedLineItem[]) {
  const categories: {
    revenue: Array<{category: string; subcategory: string; amount: number; percentage: number}>;
    cogs: Array<{category: string; subcategory: string; amount: number; percentage: number}>;
    operatingExpenses: Array<{category: string; subcategory: string; amount: number; percentage: number}>;
  } = {
    revenue: [],
    cogs: [],
    operatingExpenses: []
  };

  // Group items by category
  const categorizedItems = {
    revenue: items.filter(item => item.category === 'revenue' && !item.isTotal),
    cogs: items.filter(item => item.category === 'cogs' && !item.isTotal),
    operatingExpenses: items.filter(item => item.category === 'operating_expenses' && !item.isTotal)
  };

  // Calculate totals for percentage calculations
  const totals = {
    revenue: categorizedItems.revenue.reduce((sum, item) => sum + item.amount, 0),
    cogs: categorizedItems.cogs.reduce((sum, item) => sum + item.amount, 0),
    operatingExpenses: categorizedItems.operatingExpenses.reduce((sum, item) => sum + item.amount, 0)
  };

  // Build breakdown for each category
  Object.keys(categorizedItems).forEach(categoryKey => {
    const categoryItems = categorizedItems[categoryKey as keyof typeof categorizedItems];
    const categoryTotal = totals[categoryKey as keyof typeof totals];
    
    if (categoryItems.length > 0 && categoryTotal > 0) {
      categories[categoryKey as keyof typeof categories] = categoryItems.map(item => ({
        category: item.accountName,
        subcategory: item.subcategory || 'other',
        amount: item.amount,
        percentage: (item.amount / categoryTotal) * 100
      }));
    }
  });

  return categories;
}