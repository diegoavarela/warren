import { HelpTopic } from '@/components/HelpModal';

// Define all help topics with their relationships
export const helpTopics: Record<string, HelpTopic> = {
  // Cash Flow Dashboard topics
  'dashboard.cashflow': {
    id: 'dashboard.cashflow',
    titleKey: 'help.dashboard.cashflow.title',
    contentKey: 'help.dashboard.cashflow.content',
    category: 'cashflow',
    relatedTopics: ['dashboard.composition', 'dashboard.trends', 'dashboard.cashflow.heatmap']
  },
  'dashboard.composition': {
    id: 'dashboard.composition',
    titleKey: 'help.dashboard.composition.title',
    contentKey: 'help.dashboard.composition.content',
    category: 'cashflow',
    relatedTopics: ['dashboard.cashflow', 'dashboard.trends']
  },
  'dashboard.trends': {
    id: 'dashboard.trends',
    titleKey: 'help.dashboard.trends.title',
    contentKey: 'help.dashboard.trends.content',
    category: 'cashflow',
    relatedTopics: ['dashboard.cashflow', 'dashboard.cashflow.heatmap']
  },
  'dashboard.cashflow.heatmap': {
    id: 'dashboard.cashflow.heatmap',
    titleKey: 'help.dashboard.cashflow.heatmap.title',
    contentKey: 'help.dashboard.cashflow.heatmap.content',
    category: 'cashflow',
    relatedTopics: ['dashboard.trends', 'dashboard.composition']
  },
  'dashboard.runway': {
    id: 'dashboard.runway',
    titleKey: 'help.dashboard.runway.title',
    contentKey: 'help.dashboard.runway.content',
    category: 'cashflow',
    relatedTopics: ['dashboard.scenarios', 'dashboard.cashflow']
  },
  'dashboard.scenarios': {
    id: 'dashboard.scenarios',
    titleKey: 'help.dashboard.scenarios.title',
    contentKey: 'help.dashboard.scenarios.content',
    category: 'cashflow',
    relatedTopics: ['dashboard.runway', 'dashboard.trends']
  },
  // Dashboard topics
  'dashboard.ytd': {
    id: 'dashboard.ytd',
    titleKey: 'help.dashboard.ytd.title',
    contentKey: 'help.dashboard.ytd.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.profitability']
  },
  'dashboard.revenue': {
    id: 'dashboard.revenue',
    titleKey: 'help.dashboard.revenue.title',
    contentKey: 'help.dashboard.revenue.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.costs', 'dashboard.profitability']
  },
  'dashboard.costs': {
    id: 'dashboard.costs',
    titleKey: 'help.dashboard.costs.title',
    contentKey: 'help.dashboard.costs.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.profitability']
  },
  'dashboard.profitability': {
    id: 'dashboard.profitability',
    titleKey: 'help.dashboard.profitability.title',
    contentKey: 'help.dashboard.profitability.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.costs']
  },
  'dashboard.heatmap': {
    id: 'dashboard.heatmap',
    titleKey: 'help.dashboard.heatmap.title',
    contentKey: 'help.dashboard.heatmap.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.profitability']
  },
  'dashboard.currency': {
    id: 'dashboard.currency',
    titleKey: 'help.dashboard.currency.title',
    contentKey: 'help.dashboard.currency.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.units']
  },
  'dashboard.performance': {
    id: 'dashboard.performance',
    titleKey: 'help.dashboard.performance.title',
    contentKey: 'help.dashboard.performance.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.costs']
  },
  'dashboard.opex': {
    id: 'dashboard.opex',
    titleKey: 'help.dashboard.opex.title',
    contentKey: 'help.dashboard.opex.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.costs', 'dashboard.profitability']
  },
  'dashboard.cogs': {
    id: 'dashboard.cogs',
    titleKey: 'help.dashboard.cogs.title', 
    contentKey: 'help.dashboard.cogs.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.costs', 'dashboard.profitability']
  },
  'dashboard.personnel': {
    id: 'dashboard.personnel',
    titleKey: 'help.dashboard.personnel.title',
    contentKey: 'help.dashboard.personnel.content', 
    category: 'dashboard',
    relatedTopics: ['dashboard.costs', 'dashboard.opex']
  },
  'dashboard.insights': {
    id: 'dashboard.insights',
    titleKey: 'help.dashboard.insights.title',
    contentKey: 'help.dashboard.insights.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.profitability']
  },
  'dashboard.costEfficiency': {
    id: 'dashboard.costEfficiency',
    titleKey: 'help.dashboard.costEfficiency.title',
    contentKey: 'help.dashboard.costEfficiency.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.costs', 'dashboard.profitability', 'dashboard.opex']
  },
  'dashboard.units': {
    id: 'dashboard.units',
    titleKey: 'help.dashboard.units.title',
    contentKey: 'help.dashboard.units.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.currency']
  },
  
  // Upload topics
  'upload.template': {
    id: 'upload.template',
    titleKey: 'help.upload.template.title',
    contentKey: 'help.upload.template.content',
    category: 'upload',
    relatedTopics: ['upload.mapping']
  },
  'upload.mapping': {
    id: 'upload.mapping',
    titleKey: 'help.upload.mapping.title',
    contentKey: 'help.upload.mapping.content',
    category: 'upload',
    relatedTopics: ['upload.template', 'upload.classification']
  },
  'upload.classification': {
    id: 'upload.classification',
    titleKey: 'help.upload.classification.title',
    contentKey: 'help.upload.classification.content',
    category: 'upload',
    relatedTopics: ['upload.mapping']
  },
  
  // Advanced Visual Mapper topics
  'mapper.aiAnalysis': {
    id: 'mapper.aiAnalysis',
    titleKey: 'help.mapper.aiAnalysis.title',
    contentKey: 'help.mapper.aiAnalysis.content',
    category: 'mapper',
    relatedTopics: ['mapper.manualMapping', 'mapper.classification']
  },
  'mapper.manualMapping': {
    id: 'mapper.manualMapping',
    titleKey: 'help.mapper.manualMapping.title',
    contentKey: 'help.mapper.manualMapping.content',
    category: 'mapper',
    relatedTopics: ['mapper.aiAnalysis', 'mapper.dataRange']
  },
  'mapper.dataRange': {
    id: 'mapper.dataRange',
    titleKey: 'help.mapper.dataRange.title',
    contentKey: 'help.mapper.dataRange.content',
    category: 'mapper',
    relatedTopics: ['mapper.manualMapping', 'mapper.classification']
  },
  'mapper.classification': {
    id: 'mapper.classification',
    titleKey: 'help.mapper.classification.title',
    contentKey: 'help.mapper.classification.content',
    category: 'mapper',
    relatedTopics: ['mapper.aiAnalysis', 'mapper.dataRange']
  },
  
  // P&L Metric Topics - Revenue
  'metrics.totalRevenue': {
    id: 'metrics.totalRevenue',
    titleKey: 'help.metrics.totalRevenue.title',
    contentKey: 'help.metrics.totalRevenue.content',
    category: 'metrics',
    relatedTopics: ['metrics.growthVsPrevious', 'metrics.percentageOfTarget']
  },
  'metrics.growthVsPrevious': {
    id: 'metrics.growthVsPrevious',
    titleKey: 'help.metrics.growthVsPrevious.title',
    contentKey: 'help.metrics.growthVsPrevious.content',
    category: 'metrics',
    relatedTopics: ['metrics.totalRevenue', 'metrics.monthlyProjection']
  },
  'metrics.monthlyProjection': {
    id: 'metrics.monthlyProjection',
    titleKey: 'help.metrics.monthlyProjection.title',
    contentKey: 'help.metrics.monthlyProjection.content',
    category: 'metrics',
    relatedTopics: ['metrics.totalRevenue', 'metrics.growthVsPrevious']
  },
  'metrics.percentageOfTarget': {
    id: 'metrics.percentageOfTarget',
    titleKey: 'help.metrics.percentageOfTarget.title',
    contentKey: 'help.metrics.percentageOfTarget.content',
    category: 'metrics',
    relatedTopics: ['metrics.totalRevenue', 'metrics.growthVsPrevious']
  },
  
  // P&L Metric Topics - Costs
  'metrics.cogs': {
    id: 'metrics.cogs',
    titleKey: 'help.metrics.cogs.title',
    contentKey: 'help.metrics.cogs.content',
    category: 'metrics',
    relatedTopics: ['metrics.cogsPercentage', 'metrics.grossProfit']
  },
  'metrics.operatingExpenses': {
    id: 'metrics.operatingExpenses',
    titleKey: 'help.metrics.operatingExpenses.title',
    contentKey: 'help.metrics.operatingExpenses.content',
    category: 'metrics',
    relatedTopics: ['metrics.opexPercentage', 'metrics.operatingIncome']
  },
  'metrics.cogsPercentage': {
    id: 'metrics.cogsPercentage',
    titleKey: 'help.metrics.cogsPercentage.title',
    contentKey: 'help.metrics.cogsPercentage.content',
    category: 'metrics',
    relatedTopics: ['metrics.cogs', 'metrics.grossProfit']
  },
  'metrics.opexPercentage': {
    id: 'metrics.opexPercentage',
    titleKey: 'help.metrics.opexPercentage.title',
    contentKey: 'help.metrics.opexPercentage.content',
    category: 'metrics',
    relatedTopics: ['metrics.operatingExpenses', 'metrics.operatingIncome']
  },
  
  // P&L Metric Topics - Profitability
  'metrics.grossProfit': {
    id: 'metrics.grossProfit',
    titleKey: 'help.metrics.grossProfit.title',
    contentKey: 'help.metrics.grossProfit.content',
    category: 'metrics',
    relatedTopics: ['metrics.cogs', 'metrics.operatingIncome']
  },
  'metrics.operatingIncome': {
    id: 'metrics.operatingIncome',
    titleKey: 'help.metrics.operatingIncome.title',
    contentKey: 'help.metrics.operatingIncome.content',
    category: 'metrics',
    relatedTopics: ['metrics.grossProfit', 'metrics.ebitda']
  },
  'metrics.ebitda': {
    id: 'metrics.ebitda',
    titleKey: 'help.metrics.ebitda.title',
    contentKey: 'help.metrics.ebitda.content',
    category: 'metrics',
    relatedTopics: ['metrics.operatingIncome', 'metrics.netIncome']
  },
  'metrics.netIncome': {
    id: 'metrics.netIncome',
    titleKey: 'help.metrics.netIncome.title',
    contentKey: 'help.metrics.netIncome.content',
    category: 'metrics',
    relatedTopics: ['metrics.ebitda', 'metrics.operatingIncome']
  },
  
  // YTD Metrics
  'metrics.ytdRevenue': {
    id: 'metrics.ytdRevenue',
    titleKey: 'help.ytd.revenue.title',
    contentKey: 'help.ytd.revenue.content',
    category: 'ytd',
    relatedTopics: ['metrics.totalRevenue', 'metrics.ytdNetIncome']
  },
  'metrics.ytdExpenses': {
    id: 'metrics.ytdExpenses',
    titleKey: 'help.ytd.expenses.title',
    contentKey: 'help.ytd.expenses.content',
    category: 'ytd',
    relatedTopics: ['metrics.cogs', 'metrics.operatingExpenses']
  },
  'metrics.ytdNetIncome': {
    id: 'metrics.ytdNetIncome',
    titleKey: 'help.ytd.netIncome.title',
    contentKey: 'help.ytd.netIncome.content',
    category: 'ytd',
    relatedTopics: ['metrics.netIncome', 'metrics.ytdRevenue']
  },
  'metrics.ytdEbitda': {
    id: 'metrics.ytdEbitda',
    titleKey: 'help.ytd.ebitda.title',
    contentKey: 'help.ytd.ebitda.content',
    category: 'ytd',
    relatedTopics: ['metrics.ebitda', 'metrics.ytdNetIncome']
  },
  
  // Filter Help Topics
  'filters.period': {
    id: 'filters.period',
    titleKey: 'help.filters.period.title',
    contentKey: 'help.filters.period.content',
    category: 'filters',
    relatedTopics: ['filters.comparison', 'dashboard.ytd']
  },
  'filters.comparison': {
    id: 'filters.comparison',
    titleKey: 'help.filters.comparison.title',
    contentKey: 'help.filters.comparison.content',
    category: 'filters',
    relatedTopics: ['filters.period', 'dashboard.revenue']
  },
  'filters.currency': {
    id: 'filters.currency',
    titleKey: 'help.filters.currency.title',
    contentKey: 'help.filters.currency.content',
    category: 'filters',
    relatedTopics: ['dashboard.currency', 'filters.units']
  },
  'filters.units': {
    id: 'filters.units',
    titleKey: 'help.filters.units.title',
    contentKey: 'help.filters.units.content',
    category: 'filters',
    relatedTopics: ['dashboard.units', 'filters.currency']
  },
  
  // Trend Analysis Topics
  'dashboard.revenueTrends': {
    id: 'dashboard.revenueTrends',
    titleKey: 'help.dashboard.revenueTrends.title',
    contentKey: 'help.dashboard.revenueTrends.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenue', 'dashboard.forecasting']
  },
  'dashboard.netIncomeTrends': {
    id: 'dashboard.netIncomeTrends',
    titleKey: 'help.dashboard.netIncomeTrends.title',
    contentKey: 'help.dashboard.netIncomeTrends.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.profitability', 'dashboard.forecasting']
  },
  'dashboard.forecasting': {
    id: 'dashboard.forecasting',
    titleKey: 'help.dashboard.forecasting.title',
    contentKey: 'help.dashboard.forecasting.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.revenueTrends', 'dashboard.netIncomeTrends']
  },
  'dashboard.profitMarginTrends': {
    id: 'dashboard.profitMarginTrends',
    titleKey: 'help.dashboard.profitMarginTrends.title',
    contentKey: 'help.dashboard.profitMarginTrends.content',
    category: 'dashboard',
    relatedTopics: ['dashboard.profitability', 'metrics.grossProfit', 'metrics.netIncome']
  }
};

// Get help topic by ID
export function getHelpTopic(id: string): HelpTopic | undefined {
  return helpTopics[id];
}

// Get help topics by category
export function getHelpTopicsByCategory(category: string): HelpTopic[] {
  return Object.values(helpTopics).filter(topic => topic.category === category);
}

// Note: Global keyboard shortcuts are now handled by GlobalHelpSystem component
// Legacy function kept for compatibility
export function initializeHelpShortcuts() {
  // No longer needed - shortcuts handled by GlobalHelpSystem
  return () => {};
}