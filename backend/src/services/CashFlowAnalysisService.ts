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
}