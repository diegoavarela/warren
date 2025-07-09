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