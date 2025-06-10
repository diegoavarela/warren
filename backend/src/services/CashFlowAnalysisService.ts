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
  // Cash generation analysis
  currentMonthGeneration: number;
  previousMonthGeneration: number;
  generationChange: number; // absolute change
  generationChangePercent: number; // percentage change
  generationTrend: 'increasing' | 'decreasing' | 'stable';
  monthlyData: Array<{
    month: string;
    burnRate: number;
    changeFromPrevious: number;
    isCashPositive: boolean;
    cashGeneration: number;
    generationChange: number;
  }>;
}

interface ScenarioParameters {
  incomeChange: number; // percentage change (-100 to +100)
  expenseChange: number; // percentage change (-100 to +100)
  startingMonth: number; // month index to start applying changes
  duration: number; // how many months to apply changes
}

interface ScenarioResult {
  monthlyProjections: Array<{
    month: string;
    income: number;
    expenses: number;
    netCashFlow: number;
    endingBalance: number;
  }>;
  summary: {
    endingCash: number;
    totalIncome: number;
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
    
    // Calculate burn rates for different periods using proper burn logic
    const threeMonthBurn = this.calculateAverageBurnProper(metrics, currentMonthIndex, 3);
    const sixMonthBurn = this.calculateAverageBurnProper(metrics, currentMonthIndex, 6);
    
    // Determine burn rate trend
    const burnTrend = this.analyzeBurnTrend(metrics, currentMonthIndex);
    
    // If not burning cash at all, return null for runway
    if (threeMonthBurn === 0 && sixMonthBurn === 0) {
      return {
        monthsRemaining: null,
        runwayDate: null,
        currentBalance,
        averageBurnRate: 0,
        burnRateTrend: 'stable',
        confidence: {
          conservative: null,
          moderate: null,
          optimistic: null
        }
      };
    }
    
    // Use weighted average for moderate scenario (more weight on recent months)
    const moderateBurnRate = (threeMonthBurn * 0.6) + (sixMonthBurn * 0.4);
    
    // Calculate conservative (worst case) and optimistic (best case)
    const conservativeBurnRate = Math.max(threeMonthBurn, sixMonthBurn) * 1.2; // 20% worse
    const optimisticBurnRate = Math.min(threeMonthBurn, sixMonthBurn) * 0.8; // 20% better
    
    // Calculate months remaining for each scenario
    const calculateMonths = (balance: number, burnRate: number): number | null => {
      if (burnRate <= 0) return null; // Not burning cash
      return Math.max(0, Math.floor(balance / burnRate));
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

    // Calculate actual burn rate (only positive when burning cash)
    const currentMonth = metrics[currentMonthIndex];
    const currentMonthBurn = currentMonth.totalExpense > currentMonth.totalIncome 
      ? Math.abs(currentMonth.monthlyGeneration)
      : 0;
    
    // Calculate cash generation (positive when generating, negative when burning)
    const currentMonthGeneration = currentMonth.monthlyGeneration;
    const previousMonth = currentMonthIndex > 0 ? metrics[currentMonthIndex - 1] : currentMonth;
    const previousMonthGeneration = previousMonth.monthlyGeneration;
    
    // Calculate generation changes
    const generationChange = currentMonthGeneration - previousMonthGeneration;
    const generationChangePercent = previousMonthGeneration !== 0
      ? (generationChange / Math.abs(previousMonthGeneration)) * 100
      : (currentMonthGeneration !== 0 ? 100 : 0);
    
    // Determine generation trend
    let generationTrend: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(generationChangePercent) < 5) {
      generationTrend = 'stable';
    } else if (currentMonthGeneration > previousMonthGeneration) {
      generationTrend = 'increasing'; // Better cash position
    } else {
      generationTrend = 'decreasing'; // Worse cash position
    }
    
    // Calculate averages with proper burn rate logic
    const threeMonthAverage = this.calculateAverageBurnProper(metrics, currentMonthIndex, 3);
    const sixMonthAverage = this.calculateAverageBurnProper(metrics, currentMonthIndex, 6);
    const twelveMonthAverage = currentMonthIndex >= 11 
      ? this.calculateAverageBurnProper(metrics, currentMonthIndex, 12)
      : null;

    // Calculate burn rate change
    const previousMonthBurn = previousMonth.totalExpense > previousMonth.totalIncome
      ? Math.abs(previousMonth.monthlyGeneration)
      : 0;
    
    const burnRateChange = previousMonthBurn !== 0
      ? ((currentMonthBurn - previousMonthBurn) / previousMonthBurn) * 100
      : (currentMonthBurn > 0 ? 100 : 0);

    // Determine trend based on actual burn
    let trend: 'improving' | 'worsening' | 'stable';
    if (currentMonthBurn === 0 && previousMonthBurn === 0) {
      trend = 'stable'; // Cash positive
    } else if (Math.abs(burnRateChange) < 5) {
      trend = 'stable';
    } else if (currentMonthBurn < previousMonthBurn) {
      trend = 'improving'; // Less burn is better
    } else {
      trend = 'worsening'; // More burn is worse
    }

    // Build monthly data with proper burn rate
    const monthlyData = [];
    const startIndex = Math.max(0, currentMonthIndex - 11);
    
    for (let i = startIndex; i <= currentMonthIndex; i++) {
      const metric = metrics[i];
      const burnRate = metric.totalExpense > metric.totalIncome
        ? Math.abs(metric.monthlyGeneration)
        : 0;
      
      const prevMetric = i > 0 ? metrics[i - 1] : metric;
      const previousBurn = prevMetric.totalExpense > prevMetric.totalIncome
        ? Math.abs(prevMetric.monthlyGeneration)
        : 0;
      
      const change = previousBurn !== 0 
        ? ((burnRate - previousBurn) / previousBurn) * 100 
        : (burnRate > 0 ? 100 : 0);
      
      // Calculate cash generation for this month
      const cashGeneration = metric.monthlyGeneration;
      const prevGeneration = i > 0 ? metrics[i - 1].monthlyGeneration : cashGeneration;
      const genChange = cashGeneration - prevGeneration;
      
      monthlyData.push({
        month: metric.month,
        burnRate,
        changeFromPrevious: change,
        isCashPositive: metric.totalIncome >= metric.totalExpense,
        cashGeneration,
        generationChange: genChange
      });
    }

    return {
      currentMonthBurn,
      threeMonthAverage,
      sixMonthAverage,
      twelveMonthAverage,
      burnRateChange,
      trend,
      currentMonthGeneration,
      previousMonthGeneration,
      generationChange,
      generationChangePercent,
      generationTrend,
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
   * Calculate average burn rate properly (only counts actual burn, not cash generation)
   */
  private calculateAverageBurnProper(metrics: MonthlyMetrics[], currentIndex: number, months: number): number {
    const startIndex = Math.max(0, currentIndex - months + 1);
    const relevantMonths = metrics.slice(startIndex, currentIndex + 1);
    
    if (relevantMonths.length === 0) return 0;
    
    // Only count months where we're actually burning cash
    const burningMonths = relevantMonths.filter(m => m.totalExpense > m.totalIncome);
    
    if (burningMonths.length === 0) return 0; // Cash positive for entire period
    
    const totalBurn = burningMonths.reduce((sum, m) => sum + Math.abs(m.monthlyGeneration), 0);
    return totalBurn / relevantMonths.length; // Average over all months, not just burning months
  }

  /**
   * Analyze burn rate trend (accelerating, decelerating, or stable)
   */
  private analyzeBurnTrend(metrics: MonthlyMetrics[], currentIndex: number): 'accelerating' | 'decelerating' | 'stable' {
    if (currentIndex < 2) return 'stable'; // Not enough data
    
    // Compare recent 3 months to previous 3 months using proper burn calculation
    const recentBurn = this.calculateAverageBurnProper(metrics, currentIndex, 3);
    const previousStart = Math.max(0, currentIndex - 5); // 3 months before recent period
    const previousEnd = Math.max(0, currentIndex - 3);
    const previousBurn = previousEnd > previousStart 
      ? this.calculateAverageBurnProper(metrics, previousEnd, previousEnd - previousStart + 1)
      : 0;
    
    // If not burning cash at all, trend is stable
    if (recentBurn === 0 && previousBurn === 0) return 'stable';
    
    const changePercent = previousBurn !== 0 
      ? Math.abs((recentBurn - previousBurn) / previousBurn) * 100
      : (recentBurn > 0 ? 100 : 0);
    
    if (changePercent < 10) return 'stable';
    
    // Higher burn = accelerating (worse), lower burn = decelerating (better)
    return recentBurn > previousBurn ? 'accelerating' : 'decelerating';
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
      currentMonthGeneration: 0,
      previousMonthGeneration: 0,
      generationChange: 0,
      generationChangePercent: 0,
      generationTrend: 'stable',
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
    let totalIncome = 0;
    let totalExpenses = 0;
    let monthsOfRunway = null;
    let runOutDate = null;
    
    // Project 12 months forward
    const monthsToProject = 12;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Calculate base values once (average of last 3 months for consistency)
    let baseIncome: number;
    let baseExpenses: number;
    
    if (metrics.length > 0 && currentMonthIndex >= 0) {
      const avgMonths = Math.min(3, currentMonthIndex + 1);
      const startIdx = Math.max(0, currentMonthIndex - avgMonths + 1);
      const recentData = metrics.slice(startIdx, currentMonthIndex + 1);
      
      baseIncome = recentData.reduce((sum, m) => sum + m.totalIncome, 0) / recentData.length;
      baseExpenses = recentData.reduce((sum, m) => sum + Math.abs(m.totalExpense), 0) / recentData.length;
    } else {
      // Fallback if no data
      baseIncome = 100000; // $100K default
      baseExpenses = 80000;  // $80K default
    }
    
    for (let i = 0; i < monthsToProject; i++) {
      // Determine if changes should be applied this month
      const shouldApplyChange = i >= params.startingMonth && i < (params.startingMonth + params.duration);
      
      // Apply scenario changes
      const income = shouldApplyChange 
        ? baseIncome * (1 + params.incomeChange / 100)
        : baseIncome;
      
      const expenses = shouldApplyChange
        ? baseExpenses * (1 + params.expenseChange / 100)
        : baseExpenses;
      
      const netCashFlow = income - expenses;
      runningBalance += netCashFlow;
      
      // Track totals
      totalIncome += income;
      totalExpenses += expenses;
      
      // Check for cash depletion (first time balance goes negative)
      if (runningBalance < 0 && monthsOfRunway === null) {
        monthsOfRunway = i + 1; // +1 because we want the month number (1-based)
        const today = new Date();
        runOutDate = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
      }
      
      // Determine month name (cycling through months properly)
      const currentDate = new Date();
      const projectionMonth = (currentDate.getMonth() + i + 1) % 12;
      const monthName = monthNames[projectionMonth];
      
      projections.push({
        month: monthName,
        income: Math.round(income),
        expenses: Math.round(expenses),
        netCashFlow: Math.round(netCashFlow),
        endingBalance: Math.round(runningBalance)
      });
    }
    
    // Calculate extended runway if cash is still positive after 12 months
    if (monthsOfRunway === null && runningBalance > 0) {
      const avgMonthlyBurn = (totalIncome - totalExpenses) / monthsToProject;
      if (avgMonthlyBurn < 0) {
        // How many additional months beyond the 12 projected
        const additionalMonths = Math.floor(runningBalance / Math.abs(avgMonthlyBurn));
        monthsOfRunway = monthsToProject + additionalMonths;
        
        const today = new Date();
        runOutDate = new Date(today.getFullYear(), today.getMonth() + monthsOfRunway, 1);
      }
    }
    
    return {
      monthlyProjections: projections,
      summary: {
        endingCash: Math.round(runningBalance),
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netCashFlow: Math.round(totalIncome - totalExpenses),
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