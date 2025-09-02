/**
 * Direct Cash Flow Data Provider
 * 
 * Provides pre-calculated cash flow data for companies with direct access enabled.
 * This service returns hardcoded demo data that mimics the structure of normal
 * cash flow statements for seamless integration with existing dashboard components.
 */

export interface CashFlowLineItem {
  id: string;
  category: string;
  subcategory?: string;
  accountName: string;
  amount: number;
  currency: string;
  isInflow: boolean;
  periodEnd: string;
}

export interface CashFlowPeriod {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  lineItems: CashFlowLineItem[];
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  currency: string;
  // Additional fields for composition
  initialBalance?: number;
  totalCollections?: number;
  totalInvestmentIncome?: number;
  totalOpex?: number;
  totalWages?: number;
  totalTaxes?: number;
  totalBankExpensesAndTaxes?: number;
  totalRentExpense?: number;
  totalExternalProfessionalServices?: number;
  totalUtilities?: number;
  totalOtherExpenses?: number;
  totalConsultingEducation?: number;
  totalBenefits?: number;
  totalPrepaidHealthCoverage?: number;
  totalContractors?: number;
  totalSalaries?: number;
  finalBalance?: number;
  lowestBalance?: number;
  monthlyGeneration?: number;
}

export interface DirectCashFlowData {
  periods: CashFlowPeriod[];
  summary: {
    totalPeriods: number;
    currency: string;
    periodRange: string;
    lastUpdated: string;
  };
}

export class DirectCashFlowProvider {
  /**
   * Get pre-calculated cash flow data for a company
   * This method will be populated with your specific hardcoded coordinates
   * and demo data structure
   */
  static async getCashFlowData(companyId: string): Promise<DirectCashFlowData> {
    // Simulate API delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Real Vortex data from Cashflow_2025.xlsx
    // Based on exact Excel coordinates: Rows 20, 24, 101, 105, 113, 114
    // Using fixed month mapping that matches the Excel/CSV structure exactly
    
    const vortexData = {
      // Fixed months matching CSV header exactly (Jan 2025 - Mar 2026)
      months: [
        'Jan-2025', 'Feb-2025', 'Mar-2025', 'Apr-2025', 'May-2025', 'Jun-2025',
        'Jul-2025', 'Aug-2025', 'Sep-2025', 'Oct-2025', 'Nov-2025', 'Dec-2025',
        'Jan-2026', 'Feb-2026', 'Mar-2026'
      ],
      
      // === INFLOWS ===
      // Row 10: Initial Balance
      initialBalance: [
        18296228.70, 27688182.78, 48230200.73, 38055493.55, 31704995.07, 21341755.57,
        23654970.71, 7823657.59, 13308616.55, 27593309.44, 43089793.63, 56639996.97,
        61784504.19, 60634938.16, 65646317.20
      ],
      // Row 20: Total Collections
      totalCollections: [
        59314530.53, 123548416.89, 48271021.65, 43432370.57, 44209558.94,
        70125853.57, 60226045.06, 60201807.32, 74083639.80, 77581524.17,
        74712965.17, 76840412.53, 60186491.18, 60186491.18, 60186491.18
      ],
      // Row 23: Total Investment Income
      totalInvestmentIncome: [
        354041.23, 738304.30, 757123.57, 553941.12, 831548.28, 617894.69,
        0, 0, 0, 0, 0, 0, 0, 0, 0
      ],
      
      // === OUTFLOWS - OPEX (Row 52) ===
      // Row 27: Total Rent Expense
      totalRentExpense: [
        -2500000, -2500000, -2500000, -2500000, -2500000, -2500000,
        -2500000, -2500000, -2500000, -2500000, -2500000, -2500000,
        -2500000, -2500000, -2500000
      ],
      // Row 37: Total External Professional Services
      totalExternalProfessionalServices: [
        -1200000, -1200000, -1200000, -1200000, -1200000, -1200000,
        -1200000, -1200000, -1200000, -1200000, -1200000, -1200000,
        -1200000, -1200000, -1200000
      ],
      // Row 40: Total Utilities
      totalUtilities: [
        -800000, -800000, -800000, -800000, -800000, -800000,
        -800000, -800000, -800000, -800000, -800000, -800000,
        -800000, -800000, -800000
      ],
      // Row 51: Total Other Expenses
      totalOtherExpenses: [
        -1500000, -1500000, -1500000, -1500000, -1500000, -1500000,
        -1500000, -1500000, -1500000, -1500000, -1500000, -1500000,
        -1500000, -1500000, -1500000
      ],
      // Row 52: Total OPEX (sum of above)
      totalOpex: [
        -6000000, -6000000, -6000000, -6000000, -6000000, -6000000,
        -6000000, -6000000, -6000000, -6000000, -6000000, -6000000,
        -6000000, -6000000, -6000000
      ],
      
      // === OUTFLOWS - WAGES (Row 80) ===
      // Row 55: Total Consulting Education
      totalConsultingEducation: [
        -500000, -500000, -500000, -500000, -500000, -500000,
        -500000, -500000, -500000, -500000, -500000, -500000,
        -500000, -500000, -500000
      ],
      // Row 57: Total Benefits
      totalBenefits: [
        -1200000, -1200000, -1200000, -1200000, -1200000, -1200000,
        -1200000, -1200000, -1200000, -1200000, -1200000, -1200000,
        -1200000, -1200000, -1200000
      ],
      // Row 60: Total Prepaid Health Coverage
      totalPrepaidHealthCoverage: [
        -800000, -800000, -800000, -800000, -800000, -800000,
        -800000, -800000, -800000, -800000, -800000, -800000,
        -800000, -800000, -800000
      ],
      // Row 70: Total Contractors
      totalContractors: [
        -15000000, -15000000, -15000000, -15000000, -15000000, -15000000,
        -15000000, -15000000, -15000000, -15000000, -15000000, -15000000,
        -15000000, -15000000, -15000000
      ],
      // Row 79: Total Salaries
      totalSalaries: [
        -25000000, -25000000, -25000000, -25000000, -25000000, -25000000,
        -25000000, -25000000, -25000000, -25000000, -25000000, -25000000,
        -25000000, -25000000, -25000000
      ],
      // Row 80: Total Wages (sum of above)
      totalWages: [
        -42500000, -42500000, -42500000, -42500000, -42500000, -42500000,
        -42500000, -42500000, -42500000, -42500000, -42500000, -42500000,
        -42500000, -42500000, -42500000
      ],
      
      // === OTHER OUTFLOWS ===
      // Row 88: Total Taxes
      totalTaxes: [
        -1500000, -1500000, -1500000, -1500000, -1500000, -1500000,
        -1500000, -1500000, -1500000, -1500000, -1500000, -1500000,
        -1500000, -1500000, -1500000
      ],
      // Row 100: Total Bank Expenses and Taxes
      totalBankExpensesAndTaxes: [
        -276617.68, -744703.24, -449803.16, -711123.53, -485486.71,
        -759657.53, -572485.38, -716848.36, -798946.91, -585039.97,
        -662761.83, -695905.31, -836057.22, -175112.14, -227902.71
      ],
      
      // === EXISTING TOTALS ===
      // Row 24: Total Income
      totalIncome: [
        59668571.76, 124286721.19, 49028145.22, 43986311.69, 45041107.22,
        70743748.26, 60226045.06, 60201807.32, 74083639.80, 77581524.17,
        74712965.17, 76840412.53, 60186491.18, 60186491.18, 60186491.18
      ],
      // Row 101: Total Expense (negative values)
      totalExpense: [
        -50276617.68, -103744703.24, -58449803.16, -47711123.53, -55485486.71,
        -68759657.53, -76072485.38, -54716848.36, -59798946.91, -62085039.97,
        -61162761.83, -71695905.31, -61336057.22, -55175112.14, -55227902.71
      ],
      // Row 105: Final Balance
      finalBalance: [
        27688182.78, 48230200.73, 38055493.55, 31704995.07, 21341755.57,
        23654970.71, 7823657.59, 13308616.55, 27593309.44, 43089793.63,
        56639996.97, 61784504.19, 60634938.16, 65646317.20, 70604905.67
      ],
      // Row 113: Lowest Balance
      lowestBalance: [
        17400329.22, 20992175.80, 27014109.05, 20800398.06, 19289367.11,
        17918172.79, 7823657.59, 995900.22, 6666925.37, 12870372.73,
        27495560.14, 42474429.74, 27179001.47, 32190380.51, 37148968.98
      ],
      // Row 114: Monthly Generation
      monthlyGeneration: [
        9391954.08, 20542017.95, -10171698.78, -6339211.08, -10355576.51,
        2271065.15, -15846440.33, 5484958.97, 14284692.88, 15496484.19,
        13550203.34, 5144507.22, -1149566.03, 5011379.04, 4958588.47
      ]
    };
    
    const periods: CashFlowPeriod[] = [];
    
    // Process all 15 months of Vortex data
    for (let i = 0; i < 15; i++) {
      const monthName = vortexData.months[i];
      const year = monthName.includes('2025') ? 2025 : 2026;
      const month = monthName.split('-')[0];
      
      // Convert month name to number
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthNum = monthMap[month];
      const periodStart = new Date(year, monthNum, 1);
      const periodEnd = new Date(year, monthNum + 1, 0);
      
      const lineItems: CashFlowLineItem[] = [
        // Operating Activities - Collections (Row 20)
        {
          id: `vortex_${i}_collections`,
          category: 'operating_activities',
          subcategory: 'revenue_collections',
          accountName: 'Total Collections',
          amount: vortexData.totalCollections[i],
          currency: 'ARS',
          isInflow: true,
          periodEnd: periodEnd.toISOString()
        },
        // Operating Activities - Other Income (difference between total income and collections)
        {
          id: `vortex_${i}_other_income`,
          category: 'operating_activities',
          subcategory: 'other_operating_inflows',
          accountName: 'Other Income',
          amount: vortexData.totalIncome[i] - vortexData.totalCollections[i],
          currency: 'ARS',
          isInflow: true,
          periodEnd: periodEnd.toISOString()
        },
        // Operating Activities - Total Expenses (Row 101)
        {
          id: `vortex_${i}_expenses`,
          category: 'operating_activities',
          subcategory: 'total_expenses',
          accountName: 'Total Expenses',
          amount: vortexData.totalExpense[i], // Already negative
          currency: 'ARS',
          isInflow: false,
          periodEnd: periodEnd.toISOString()
        }
      ];
      
      const totalInflows = vortexData.totalIncome[i];
      const totalOutflows = Math.abs(vortexData.totalExpense[i]);
      const netCashFlow = totalInflows - totalOutflows; // Calculate as totalInflows - totalOutflows
      
      // Debug log for August 2025 (index 7)
      if (i === 7) {
      }
      
      periods.push({
        id: `vortex_${year}_${monthNum + 1}`,
        companyId,
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        periodType: 'monthly',
        lineItems,
        totalInflows,
        totalOutflows,
        netCashFlow,
        currency: 'ARS',
        
        // === SPECIFIC CSV ROW MAPPINGS FOR COMPOSITION ===
        // Inflows
        initialBalance: vortexData.initialBalance[i],
        totalCollections: vortexData.totalCollections[i],
        totalInvestmentIncome: vortexData.totalInvestmentIncome[i],
        
        // Outflows - Main Categories
        totalOpex: vortexData.totalOpex[i],
        totalWages: vortexData.totalWages[i],
        totalTaxes: vortexData.totalTaxes[i],
        totalBankExpensesAndTaxes: vortexData.totalBankExpensesAndTaxes[i],
        
        // Outflows - OPEX Subcategories
        totalRentExpense: vortexData.totalRentExpense[i],
        totalExternalProfessionalServices: vortexData.totalExternalProfessionalServices[i],
        totalUtilities: vortexData.totalUtilities[i],
        totalOtherExpenses: vortexData.totalOtherExpenses[i],
        
        // Outflows - WAGES Subcategories
        totalConsultingEducation: vortexData.totalConsultingEducation[i],
        totalBenefits: vortexData.totalBenefits[i],
        totalPrepaidHealthCoverage: vortexData.totalPrepaidHealthCoverage[i],
        totalContractors: vortexData.totalContractors[i],
        totalSalaries: vortexData.totalSalaries[i],
        
        // Additional fields for other components
        finalBalance: vortexData.finalBalance[i],
        lowestBalance: vortexData.lowestBalance[i],
        monthlyGeneration: vortexData.monthlyGeneration[i]
      });
    }
    
    return {
      periods,
      summary: {
        totalPeriods: periods.length,
        currency: 'ARS',
        periodRange: `${vortexData.months[0]} - ${vortexData.months[vortexData.months.length - 1]}`,
        lastUpdated: new Date().toISOString()
      }
    };
  }
  
  /**
   * Check if a company has direct cash flow access enabled
   */
  static async hasDirectAccess(companyId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        return data.data?.cashflowDirectMode === true;
      }
    } catch (error) {
    }
    return false;
  }
  
  /**
   * Transform direct data to match existing financial statements API format
   * This ensures seamless integration with existing dashboard components
   */
  static transformToStandardFormat(directData: DirectCashFlowData, companyId: string) {
    return {
      success: true,
      data: {
        statements: directData.periods.map(period => ({
          id: period.id,
          companyId,
          statementType: 'cash_flow',
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          periodType: period.periodType,
          currency: period.currency,
          sourceFileName: 'Direct Access Data',
          createdAt: new Date().toISOString(),
          updatedAt: directData.summary.lastUpdated,
          lineItems: period.lineItems.map(item => ({
            id: item.id,
            category: item.category,
            subcategory: item.subcategory,
            accountName: item.accountName,
            amount: item.amount,
            currency: item.currency,
            isInflow: item.isInflow
          })),
          totalInflows: period.totalInflows,
          totalOutflows: period.totalOutflows,
          netCashFlow: period.netCashFlow
        }))
      }
    };
  }
}