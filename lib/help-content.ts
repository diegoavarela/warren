import { HelpTopic } from '@/components/HelpModal';

// Define all help topics with their relationships
export const helpTopics: Record<string, HelpTopic> = {
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

// Global keyboard shortcut handler
export function initializeHelpShortcuts() {
  if (typeof window === 'undefined') return;
  
  const handleKeyPress = (e: KeyboardEvent) => {
    // Help shortcut: ? or F1
    if ((e.key === '?' && !e.ctrlKey && !e.metaKey) || e.key === 'F1') {
      e.preventDefault();
      // Dispatch custom event to open help
      window.dispatchEvent(new CustomEvent('openGlobalHelp'));
    }
  };
  
  document.addEventListener('keydown', handleKeyPress);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeyPress);
  };
}