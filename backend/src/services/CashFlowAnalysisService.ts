import { format } from 'date-fns';

interface MonthlyMetrics {
  date: Date;
  month: string;
  totalIncome: number;
  totalExpense: number;
  finalBalance: number;
  monthlyGeneration: number;
}

interface RunwayAnalysis {
  monthsRemaining: number | null;
  runwayDate: Date | null;
  currentBalance: number;
  averageBurnRate: number;
  burnRateTrend: 'accelerating' | 'decelerating' | 'stable';
  confidence: {
    conservative: number | null;
    moderate: number | null;
    optimistic: number | null;
  };
}

interface BurnRateAnalysis {
  currentMonthBurn: number;
  threeMonthAverage: number;
  sixMonthAverage: number;
  twelveMonthAverage: number | null;
  burnRateChange: number; // percentage change
  trend: 'improving' | 'worsening' | 'stable';
  monthlyData: Array<{
    month: string;
    burnRate: number;
    changeFromPrevious: number;
  }>;
}

interface ScenarioParameters {
  revenueChange: number; // percentage change (-100 to +100)
  expenseChange: number; // percentage change (-100 to +100)
  startingMonth: number; // month index to start applying changes
  duration: number; // how many months to apply changes
}

interface ScenarioResult {
  monthlyProjections: Array<{
    month: string;
    revenue: number;
    expenses: number;
    netCashFlow: number;
    endingBalance: number;
  }>;
  summary: {
    endingCash: number;
    totalRevenue: number;
    totalExpenses: number;
    netCashFlow: number;
    monthsOfRunway: number | null;
    runOutDate: Date | null;
  };
}

interface WaterfallData {
  categories: Array<{
    name: string;
    value: number;
    color: string;
    isTotal?: boolean;
  }>;
  startValue: number;
  endValue: number;
}

export class CashFlowAnalysisService {
  /**
   * Calculate cash runway based on current balance and burn rate
   */
  calculateRunway(metrics: MonthlyMetrics[], currentMonthIndex: number): RunwayAnalysis {
    if (metrics.length === 0 || currentMonthIndex < 0) {
      return this.getEmptyRunwayAnalysis();
    }

    const currentBalance = metrics[currentMonthIndex].finalBalance;
    
    // Calculate burn rates for different periods
    const threeMonthBurn = this.calculateAverageBurn(metrics, currentMonthIndex, 3);
    const sixMonthBurn = this.calculateAverageBurn(metrics, currentMonthIndex, 6);
    
    // Determine burn rate trend
    const burnTrend = this.analyzeBurnTrend(metrics, currentMonthIndex);
    
    // Use weighted average for moderate scenario (more weight on recent months)
    const moderateBurnRate = (threeMonthBurn * 0.6) + (sixMonthBurn * 0.4);
    
    // Calculate conservative (worst case) and optimistic (best case)
    const conservativeBurnRate = Math.max(threeMonthBurn, sixMonthBurn) * 1.2; // 20% worse
    const optimisticBurnRate = Math.min(threeMonthBurn, sixMonthBurn) * 0.8; // 20% better
    
    // Calculate months remaining for each scenario
    const calculateMonths = (balance: number, burnRate: number): number | null => {
      if (burnRate >= 0) return null; // Not burning cash
      return Math.max(0, Math.floor(balance / Math.abs(burnRate)));
    };
    
    const moderateMonths = calculateMonths(currentBalance, moderateBurnRate);
    const conservativeMonths = calculateMonths(currentBalance, conservativeBurnRate);
    const optimisticMonths = calculateMonths(currentBalance, optimisticBurnRate);
    
    // Calculate runway date
    const runwayDate = moderateMonths !== null && moderateMonths > 0
      ? new Date(new Date().setMonth(new Date().getMonth() + moderateMonths))
      : null;
    
    return {
      monthsRemaining: moderateMonths,
      runwayDate,
      currentBalance,
      averageBurnRate: moderateBurnRate,
      burnRateTrend: burnTrend,
      confidence: {
        conservative: conservativeMonths,
        moderate: moderateMonths,
        optimistic: optimisticMonths
      }
    };
  }

  /**
   * Analyze burn rate trends and patterns
   */
  analyzeBurnRate(metrics: MonthlyMetrics[], currentMonthIndex: number): BurnRateAnalysis {
    if (metrics.length === 0 || currentMonthIndex < 0) {
      return this.getEmptyBurnRateAnalysis();
    }

    const currentMonthBurn = metrics[currentMonthIndex].monthlyGeneration;
    const threeMonthAverage = this.calculateAverageBurn(metrics, currentMonthIndex, 3);
    const sixMonthAverage = this.calculateAverageBurn(metrics, currentMonthIndex, 6);
    const twelveMonthAverage = currentMonthIndex >= 11 
      ? this.calculateAverageBurn(metrics, currentMonthIndex, 12)
      : null;

    // Calculate burn rate change
    const previousMonthBurn = currentMonthIndex > 0 
      ? metrics[currentMonthIndex - 1].monthlyGeneration 
      : currentMonthBurn;
    
    const burnRateChange = previousMonthBurn !== 0
      ? ((currentMonthBurn - previousMonthBurn) / Math.abs(previousMonthBurn)) * 100
      : 0;

    // Determine trend
    let trend: 'improving' | 'worsening' | 'stable';
    if (Math.abs(burnRateChange) < 5) {
      trend = 'stable';
    } else if (currentMonthBurn > previousMonthBurn) {
      trend = 'improving'; // Less negative is better
    } else {
      trend = 'worsening';
    }

    // Build monthly data
    const monthlyData = [];
    const startIndex = Math.max(0, currentMonthIndex - 11);
    
    for (let i = startIndex; i <= currentMonthIndex; i++) {
      const burnRate = metrics[i].monthlyGeneration;
      const previousBurn = i > 0 ? metrics[i - 1].monthlyGeneration : burnRate;
      const change = previousBurn !== 0 
        ? ((burnRate - previousBurn) / Math.abs(previousBurn)) * 100 
        : 0;
      
      monthlyData.push({
        month: metrics[i].month,
        burnRate,
        changeFromPrevious: change
      });
    }

    return {
      currentMonthBurn,
      threeMonthAverage,
      sixMonthAverage,
      twelveMonthAverage,
      burnRateChange,
      trend,
      monthlyData
    };
  }

  /**
   * Calculate average burn rate for a given period
   */
  private calculateAverageBurn(metrics: MonthlyMetrics[], currentIndex: number, months: number): number {
    const startIndex = Math.max(0, currentIndex - months + 1);
    const relevantMonths = metrics.slice(startIndex, currentIndex + 1);
    
    if (relevantMonths.length === 0) return 0;
    
    const totalBurn = relevantMonths.reduce((sum, m) => sum + m.monthlyGeneration, 0);
    return totalBurn / relevantMonths.length;
  }

  /**
   * Analyze burn rate trend (accelerating, decelerating, or stable)
   */
  private analyzeBurnTrend(metrics: MonthlyMetrics[], currentIndex: number): 'accelerating' | 'decelerating' | 'stable' {
    if (currentIndex < 2) return 'stable'; // Not enough data
    
    // Compare recent 3 months to previous 3 months
    const recentBurn = this.calculateAverageBurn(metrics, currentIndex, 3);
    const previousBurn = this.calculateAverageBurn(metrics, Math.max(0, currentIndex - 3), 3);
    
    const changePercent = previousBurn !== 0 
      ? Math.abs((recentBurn - previousBurn) / previousBurn) * 100
      : 0;
    
    if (changePercent < 10) return 'stable';
    
    // More negative = accelerating burn
    return recentBurn < previousBurn ? 'accelerating' : 'decelerating';
  }

  /**
   * Get empty runway analysis object
   */
  private getEmptyRunwayAnalysis(): RunwayAnalysis {
    return {
      monthsRemaining: null,
      runwayDate: null,
      currentBalance: 0,
      averageBurnRate: 0,
      burnRateTrend: 'stable',
      confidence: {
        conservative: null,
        moderate: null,
        optimistic: null
      }
    };
  }

  /**
   * Get empty burn rate analysis object
   */
  private getEmptyBurnRateAnalysis(): BurnRateAnalysis {
    return {
      currentMonthBurn: 0,
      threeMonthAverage: 0,
      sixMonthAverage: 0,
      twelveMonthAverage: null,
      burnRateChange: 0,
      trend: 'stable',
      monthlyData: []
    };
  }

  /**
   * Run scenario planning analysis
   */
  runScenarioAnalysis(
    metrics: MonthlyMetrics[], 
    currentMonthIndex: number,
    scenarios: { base: ScenarioParameters; best: ScenarioParameters; worst: ScenarioParameters }
  ): { base: ScenarioResult; best: ScenarioResult; worst: ScenarioResult } {
    return {
      base: this.calculateScenario(metrics, currentMonthIndex, scenarios.base),
      best: this.calculateScenario(metrics, currentMonthIndex, scenarios.best),
      worst: this.calculateScenario(metrics, currentMonthIndex, scenarios.worst)
    };
  }

  /**
   * Calculate a single scenario
   */
  private calculateScenario(
    metrics: MonthlyMetrics[], 
    currentMonthIndex: number,
    params: ScenarioParameters
  ): ScenarioResult {
    const projections = [];
    let runningBalance = currentMonthIndex >= 0 ? metrics[currentMonthIndex].finalBalance : 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let monthsOfRunway = null;
    let runOutDate = null;
    
    // Project 12 months forward
    const monthsToProject = 12;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (let i = 0; i < monthsToProject; i++) {
      const projectionIndex = currentMonthIndex + i + 1;
      const shouldApplyChange = i >= params.startingMonth && i < params.startingMonth + params.duration;
      
      // Get base values (from Excel if available, otherwise use averages)
      let baseRevenue: number;
      let baseExpenses: number;
      
      if (projectionIndex < metrics.length) {
        // Use actual Excel data
        baseRevenue = metrics[projectionIndex].totalIncome;
        baseExpenses = Math.abs(metrics[projectionIndex].totalExpense);
      } else {
        // Use average of last 3 months
        const avgMonths = Math.min(3, currentMonthIndex + 1);
        const startIdx = Math.max(0, currentMonthIndex - avgMonths + 1);
        const recentData = metrics.slice(startIdx, currentMonthIndex + 1);
        
        baseRevenue = recentData.reduce((sum, m) => sum + m.totalIncome, 0) / recentData.length;
        baseExpenses = recentData.reduce((sum, m) => sum + Math.abs(m.totalExpense), 0) / recentData.length;
      }
      
      // Apply scenario changes
      const revenue = shouldApplyChange 
        ? baseRevenue * (1 + params.revenueChange / 100)
        : baseRevenue;
      
      const expenses = shouldApplyChange
        ? baseExpenses * (1 + params.expenseChange / 100)
        : baseExpenses;
      
      const netCashFlow = revenue - expenses;
      runningBalance += netCashFlow;
      
      // Track totals
      totalRevenue += revenue;
      totalExpenses += expenses;
      
      // Check for cash depletion
      if (runningBalance < 0 && monthsOfRunway === null) {
        monthsOfRunway = i;
        const today = new Date();
        runOutDate = new Date(today.setMonth(today.getMonth() + i));
      }
      
      // Determine month name
      const currentDate = new Date();
      const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i + 1, 1);
      const monthName = monthNames[projectionDate.getMonth()];
      
      projections.push({
        month: monthName,
        revenue,
        expenses,
        netCashFlow,
        endingBalance: runningBalance
      });
    }
    
    // If cash never runs out in 12 months
    if (monthsOfRunway === null && runningBalance > 0) {
      const avgMonthlyBurn = (totalRevenue - totalExpenses) / monthsToProject;
      if (avgMonthlyBurn < 0) {
        monthsOfRunway = Math.floor(runningBalance / Math.abs(avgMonthlyBurn));
      }
    }
    
    return {
      monthlyProjections: projections,
      summary: {
        endingCash: runningBalance,
        totalRevenue,
        totalExpenses,
        netCashFlow: totalRevenue - totalExpenses,
        monthsOfRunway,
        runOutDate
      }
    };
  }

  /**
   * Generate waterfall chart data
   */
  generateWaterfallData(
    metrics: MonthlyMetrics[], 
    startIndex: number, 
    endIndex: number
  ): WaterfallData {
    if (metrics.length === 0 || startIndex < 0 || endIndex >= metrics.length) {
      return {
        categories: [],
        startValue: 0,
        endValue: 0
      };
    }
    
    const startBalance = startIndex > 0 ? metrics[startIndex - 1].finalBalance : 0;
    const endBalance = metrics[endIndex].finalBalance;
    
    // Aggregate data between start and end
    let totalIncome = 0;
    let totalExpenses = 0;
    const incomeByMonth: { [key: string]: number } = {};
    const expenseByMonth: { [key: string]: number } = {};
    
    for (let i = startIndex; i <= endIndex; i++) {
      totalIncome += metrics[i].totalIncome;
      totalExpenses += metrics[i].totalExpense; // This is already negative
      
      if (!incomeByMonth[metrics[i].month]) {
        incomeByMonth[metrics[i].month] = 0;
        expenseByMonth[metrics[i].month] = 0;
      }
      
      incomeByMonth[metrics[i].month] += metrics[i].totalIncome;
      expenseByMonth[metrics[i].month] += metrics[i].totalExpense;
    }
    
    const categories = [
      {
        name: 'Starting Balance',
        value: startBalance,
        color: '#4B5563', // gray
        isTotal: true
      }
    ];
    
    // Add income categories (positive values)
    if (Object.keys(incomeByMonth).length <= 3) {
      // Show individual months if 3 or fewer
      Object.entries(incomeByMonth).forEach(([month, value]) => {
        if (value > 0) {
          categories.push({
            name: `${month} Income`,
            value: value,
            color: '#10B981', // green
            isTotal: false
          });
        }
      });
    } else {
      // Aggregate if more than 3 months
      categories.push({
        name: 'Total Income',
        value: totalIncome,
        color: '#10B981', // green
        isTotal: true
      });
    }
    
    // Add expense categories (negative values)
    if (Object.keys(expenseByMonth).length <= 3) {
      // Show individual months if 3 or fewer
      Object.entries(expenseByMonth).forEach(([month, value]) => {
        if (value < 0) {
          categories.push({
            name: `${month} Expenses`,
            value: value,
            color: '#EF4444', // red
            isTotal: false
          });
        }
      });
    } else {
      // Aggregate if more than 3 months
      categories.push({
        name: 'Total Expenses',
        value: totalExpenses,
        color: '#EF4444', // red
        isTotal: true
      });
    }
    
    // Add ending balance
    categories.push({
      name: 'Ending Balance',
      value: endBalance,
      color: endBalance >= 0 ? '#4B5563' : '#DC2626', // gray or dark red
      isTotal: true
    });
    
    return {
      categories,
      startValue: startBalance,
      endValue: endBalance
    };
  }
}