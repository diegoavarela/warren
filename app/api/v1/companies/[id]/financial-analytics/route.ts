import { NextRequest, NextResponse } from "next/server";
import { db, financialStatements, financialLineItems, eq, and, sql, desc } from "@/lib/db";
import { withRBAC, hasPermission, PERMISSIONS } from "@/lib/auth/rbac";
import { decrypt, decryptObject } from "@/lib/encryption";
import { LocalAccountClassifier } from "@/lib/local-classifier";

interface ProcessedLineItem {
  id: string;
  accountCode: string;
  accountName: string;
  category: string;
  amount: number;
  subcategory?: string;
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

      // Debug logging
      console.log('Total line items:', processedItems.length);
      console.log('Categories found:', Array.from(new Set(processedItems.map(item => item.category))));
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
      
      // Calculate EBITDA (simplified - excluding D&A for now)
      const ebitda = operatingIncome;
      const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;
      
      // Other income/expenses
      const otherIncome = calculateOtherIncome(processedItems);
      const otherExpenses = calculateOtherExpenses(processedItems);
      const taxes = calculateTaxes(processedItems);
      
      const netIncome = operatingIncome + otherIncome - otherExpenses - taxes;
      const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

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
        previousMonth.ebitda = previousMonth.operatingIncome;
        previousMonth.ebitdaMargin = previousMonth.revenue > 0 ? (previousMonth.ebitda / previousMonth.revenue) * 100 : 0;
        
        const prevOtherIncome = calculateOtherIncome(prevItems);
        const prevOtherExpenses = calculateOtherExpenses(prevItems);
        const prevTaxes = calculateTaxes(prevItems);
        previousMonth.netIncome = previousMonth.operatingIncome + prevOtherIncome - prevOtherExpenses - prevTaxes;
        previousMonth.netMargin = previousMonth.revenue > 0 ? (previousMonth.netIncome / previousMonth.revenue) * 100 : 0;
      }

      // Get historical data for charts (last 12 months)
      const chartData = await getHistoricalData(companyId, statement);

      // Build response matching the reference dashboard structure
      const dashboardData = {
        hasData: true,
        uploadedFileName: statement.sourceFile,
        currentMonth: {
          month: formatMonth(statement.periodEnd),
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
          operatingExpenses: chartData.reduce((sum, d) => sum + d.operatingExpenses, 0),
          netIncome: chartData.reduce((sum, d) => sum + d.netIncome, 0)
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

// Helper functions
function calculateRevenue(items: ProcessedLineItem[]): number {
  const revenue = items
    .filter(item => {
      const category = item.category.toLowerCase();
      
      // Check if category indicates revenue
      if (category === 'revenue' || category === 'service_revenue' || 
          category === 'other_revenue' || category === 'sales') {
        return true;
      }
      
      // If category is miscategorized, use local classifier
      if (category === 'other_revenue' || category === 'other' || !category) {
        const localResult = LocalAccountClassifier.classifyAccount(
          item.accountName,
          item.amount,
          { statementType: 'profit_loss' }
        );
        return localResult.suggestedCategory.includes('revenue') && localResult.isInflow;
      }
      
      return false;
    })
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
  console.log('Revenue calculation:', revenue, 'from', items.filter(i => {
    const name = i.accountName.toLowerCase();
    return name.includes('revenue') || name.includes('sales') || name.includes('service');
  }).length, 'items');
  return revenue;
}

function calculateCOGS(items: ProcessedLineItem[]): number {
  const cogs = items
    .filter(item => {
      const category = item.category.toLowerCase();
      
      // Check if category indicates COGS
      if (category === 'cost_of_sales' || category === 'direct_materials' || 
          category === 'direct_labor' || category === 'manufacturing_overhead') {
        return true;
      }
      
      // If category is miscategorized, use local classifier
      if (category === 'other_revenue' || category === 'other' || !category) {
        const localResult = LocalAccountClassifier.classifyAccount(
          item.accountName,
          item.amount,
          { statementType: 'profit_loss' }
        );
        return localResult.suggestedCategory === 'cost_of_sales' && !localResult.isInflow;
      }
      
      return false;
    })
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
  console.log('COGS calculation:', cogs, 'from', items.filter(i => {
    const name = i.accountName.toLowerCase();
    return name.includes('cost') && (name.includes('sale') || name.includes('revenue'));
  }).length, 'cost items');
  return cogs;
}

function calculateOperatingExpenses(items: ProcessedLineItem[]): number {
  const opex = items
    .filter(item => {
      const category = item.category.toLowerCase();
      
      // Check if category indicates operating expense
      const opexCategories = [
        'salaries_wages', 'payroll_taxes', 'benefits', 'rent_utilities',
        'marketing_advertising', 'professional_services', 'office_supplies',
        'travel_entertainment', 'insurance', 'depreciation', 'operating_expense',
        'bank_fees', 'other_expense'
      ];
      
      if (opexCategories.includes(category)) {
        return true;
      }
      
      // If category is miscategorized, use local classifier
      if (category === 'other_revenue' || category === 'other' || !category) {
        const localResult = LocalAccountClassifier.classifyAccount(
          item.accountName,
          item.amount,
          { statementType: 'profit_loss' }
        );
        return opexCategories.includes(localResult.suggestedCategory) && !localResult.isInflow;
      }
      
      return false;
    })
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
  console.log('Operating expenses:', opex, 'from', items.filter(i => {
    const name = i.accountName.toLowerCase();
    return name.includes('expense') || name.includes('gasto') || name.includes('operating');
  }).length, 'expense items');
  return opex;
}

function calculateOtherIncome(items: ProcessedLineItem[]): number {
  return items
    .filter(item => ['other_income', 'otros_ingresos'].some(keyword => 
      item.category.toLowerCase().includes(keyword)
    ))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

function calculateOtherExpenses(items: ProcessedLineItem[]): number {
  return items
    .filter(item => ['other_expense', 'otros_gastos', 'financial_expense'].some(keyword => 
      item.category.toLowerCase().includes(keyword)
    ))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

function calculateTaxes(items: ProcessedLineItem[]): number {
  return items
    .filter(item => ['tax', 'taxes', 'impuesto', 'impuestos'].some(keyword => 
      item.category.toLowerCase().includes(keyword) || 
      item.accountName.toLowerCase().includes(keyword)
    ))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
}

function calculatePersonnelCosts(items: ProcessedLineItem[]) {
  const salaryItems = items.filter(item => 
    ['salary', 'salario', 'sueldo', 'nomina', 'payroll', 'wages'].some(keyword => 
      item.accountName.toLowerCase().includes(keyword)
    )
  );
  
  const benefitItems = items.filter(item => 
    ['benefit', 'health', 'insurance', 'seguro', 'prestacion'].some(keyword => 
      item.accountName.toLowerCase().includes(keyword)
    )
  );

  const salariesCoR = salaryItems
    .filter(item => item.category.toLowerCase().includes('cost'))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
  const salariesOp = salaryItems
    .filter(item => !item.category.toLowerCase().includes('cost'))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);

  return {
    total: salaryItems.concat(benefitItems).reduce((sum, item) => sum + Math.abs(item.amount), 0),
    salariesCoR,
    taxesCoR: salariesCoR * 0.15, // Estimated payroll taxes
    salariesOp,
    taxesOp: salariesOp * 0.15,
    healthCoverage: benefitItems.reduce((sum, item) => sum + Math.abs(item.amount), 0) * 0.6,
    benefits: benefitItems.reduce((sum, item) => sum + Math.abs(item.amount), 0) * 0.4
  };
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
  // Get last 12 months of statements
  const statements = await db
    .select()
    .from(financialStatements)
    .where(and(
      eq(financialStatements.companyId, companyId),
      eq(financialStatements.statementType, 'profit_loss')
    ))
    .orderBy(desc(financialStatements.periodEnd))
    .limit(12);

  const chartData = [];
  
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
    const netIncome = operatingIncome + otherIncome - otherExpenses - taxes;
    
    chartData.push({
      month: formatMonth(stmt.periodEnd),
      revenue,
      cogs,
      grossProfit,
      grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
      operatingExpenses,
      operatingIncome,
      operatingMargin: revenue > 0 ? (operatingIncome / revenue) * 100 : 0,
      netIncome,
      netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0
    });
  }
  
  return chartData;
}

function formatMonth(date: string): string {
  const d = new Date(date);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return months[d.getMonth()];
}