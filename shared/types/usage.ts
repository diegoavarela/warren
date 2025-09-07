export interface UsageData {
  users: {
    current: number;
    max: number;
    remaining: number;
    percentage: number;
  };
  aiCredits: {
    balance: number;
    used: number;
    monthly: number;
    resetDate: string | null;
    recentUsage: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      totalQueries: number;
      averagePerQuery: number;
    };
    estimatedDaysRemaining: number | null;
    companiesCount: number;
  };
  tier: {
    id: string;
    name: string;
    displayName: string;
  };
  companies?: CompanyAIStats[];
}

export interface CompanyAIStats {
  companyId: string;
  companyName: string;
  balance: number;
  used: number;
  monthly: number;
  resetDate: string | null;
  usage: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    averagePerQuery: number;
    totalQueries: number;
    mostUsedModel: string | null;
  };
  estimatedDaysRemaining: number | null;
}

export interface TierEnforcementResult {
  allowed: boolean;
  errorKey?: string;
  errorDetails?: Record<string, any>;
}

export interface TierLimits {
  id: string;
  name: string;
  displayName: string;
  maxUsers: number;
  maxCompanies: number;
  aiCreditsPerCompanyPerMonth: number;
  features: string[];
}