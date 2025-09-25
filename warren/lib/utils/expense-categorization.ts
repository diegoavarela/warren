/**
 * Operating Expenses Category Mapping
 * Maps individual expense accounts to logical parent categories
 */

export interface ExpenseCategoryMapping {
  [parentCategory: string]: {
    displayName: string;
    keywords: string[];
    priority: number; // Higher priority wins if multiple matches
  };
}

export const EXPENSE_CATEGORY_MAPPING: ExpenseCategoryMapping = {
  // Personnel & Payroll
  'Personnel & Payroll': {
    displayName: 'Personnel & Payroll',
    keywords: ['salary', 'salaries', 'payroll', 'wages', 'personnel', 'employee', 'benefits', 'health coverage', 'workers comp'],
    priority: 10
  },

  // Professional Services
  'Professional Services': {
    displayName: 'Professional Services',
    keywords: ['accounting', 'lawyer', 'legal', 'professional fees', 'consultant', 'advisory', 'financial advisor', 'bookkeeping'],
    priority: 9
  },

  // Automobile & Transportation
  'Automobile & Transportation': {
    displayName: 'Automobile & Transportation',
    keywords: ['fuel', 'automobile', 'vehicle', 'gas', 'mileage', 'parking', 'tolls', 'transportation', 'travel'],
    priority: 8
  },

  // Job Materials & Supplies
  'Job Materials & Supplies': {
    displayName: 'Job Materials & Supplies',
    keywords: ['decks', 'patios', 'plants', 'soil', 'sprinklers', 'drip systems', 'materials', 'supplies', 'landscaping', 'job expenses'],
    priority: 8
  },

  // Equipment & Tools
  'Equipment & Tools': {
    displayName: 'Equipment & Tools',
    keywords: ['equipment rental', 'equipment repairs', 'tools', 'machinery', 'maintenance', 'repair'],
    priority: 7
  },

  // Technology & Software
  'Technology & Software': {
    displayName: 'Technology & Software',
    keywords: ['software', 'subscriptions', 'technology', 'computer', 'internet', 'phone', 'cell phone', 'mobile'],
    priority: 7
  },

  // Insurance
  'Insurance': {
    displayName: 'Insurance',
    keywords: ['insurance', 'liability', 'property', 'general liability'],
    priority: 6
  },

  // Marketing & Advertising
  'Marketing & Advertising': {
    displayName: 'Marketing & Advertising',
    keywords: ['advertising', 'marketing', 'promotion', 'website', 'social media'],
    priority: 6
  },

  // Office & Administrative
  'Office & Administrative': {
    displayName: 'Office & Administrative',
    keywords: ['office expenses', 'office supplies', 'stationery', 'postage', 'dues', 'subscriptions', 'memberships'],
    priority: 5
  },

  // Banking & Financial
  'Banking & Financial': {
    displayName: 'Banking & Financial',
    keywords: ['bank fees', 'bank charges', 'merchant fees', 'credit card', 'financing'],
    priority: 5
  },

  // Training & Development
  'Training & Development': {
    displayName: 'Training & Development',
    keywords: ['training', 'development', 'education', 'courses', 'certification', 'conference'],
    priority: 5
  },

  // Meals & Entertainment
  'Meals & Entertainment': {
    displayName: 'Meals & Entertainment',
    keywords: ['meals', 'entertainment', 'dining', 'restaurant', 'catering'],
    priority: 4
  }
};

/**
 * Categorizes an expense account based on its name
 */
export function categorizeExpenseAccount(accountName: string): string {
  const accountNameLower = accountName.toLowerCase();

  let bestMatch = 'Other Operating Expenses';
  let highestPriority = 0;

  for (const [category, config] of Object.entries(EXPENSE_CATEGORY_MAPPING)) {
    const hasMatch = config.keywords.some(keyword =>
      accountNameLower.includes(keyword.toLowerCase())
    );

    if (hasMatch && config.priority > highestPriority) {
      bestMatch = category;
      highestPriority = config.priority;
    }
  }

  return bestMatch;
}

/**
 * Groups expense accounts by parent categories
 */
export function groupExpensesByCategory(expenses: Array<{
  accountName: string;
  amount: number;
  subcategory?: string;
}>): Array<{
  parentCategory: string;
  displayName: string;
  totalAmount: number;
  percentage: number;
  accounts: Array<{
    accountName: string;
    amount: number;
    subcategory?: string;
  }>;
}> {
  const totalAmount = expenses.reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

  // Group by parent category
  const groupedExpenses = new Map<string, Array<any>>();

  expenses.forEach(expense => {
    const parentCategory = categorizeExpenseAccount(expense.accountName);
    if (!groupedExpenses.has(parentCategory)) {
      groupedExpenses.set(parentCategory, []);
    }
    groupedExpenses.get(parentCategory)!.push(expense);
  });

  // Convert to array format
  const result = Array.from(groupedExpenses.entries()).map(([parentCategory, accounts]) => {
    const categoryTotal = accounts.reduce((sum, acc) => sum + Math.abs(acc.amount), 0);
    const displayName = EXPENSE_CATEGORY_MAPPING[parentCategory]?.displayName || parentCategory;

    return {
      parentCategory,
      displayName,
      totalAmount: categoryTotal,
      percentage: totalAmount > 0 ? (categoryTotal / totalAmount) * 100 : 0,
      accounts: accounts.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    };
  });

  // Sort by total amount (highest first)
  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}