import axios from 'axios';
import { authService } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  priceCents: number;
  currency: string;
  features: Record<string, any>;
  limits: Record<string, any>;
}

export interface Subscription {
  id: string;
  planId: string;
  status: 'trialing' | 'active' | 'canceled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
}

export interface UsageData {
  ai: {
    totalCostCents: number;
    remainingCreditsCents: number;
    limitCents: number;
    percentUsed: number;
    tokenCount: number;
    requestCount: number;
  };
  storage: {
    usedBytes: number;
    limitBytes: number;
    percentUsed: number;
  };
  users: {
    count: number;
    limit: number;
  };
  views: {
    monthlyCount: number;
    monthlyLimit: number;
    remainingViews: number;
  };
}

class SubscriptionService {
  private getAuthHeaders() {
    const token = authService.getToken();
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      const response = await axios.get(`${API_URL}/v2/subscription/plans`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }

  /**
   * Get current subscription
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    try {
      const response = await axios.get(
        `${API_URL}/v2/subscription/current`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching subscription:', error);
      throw error;
    }
  }

  /**
   * Create checkout session for upgrading
   */
  async createCheckoutSession(planId: string): Promise<{ checkoutUrl: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/v2/subscription/checkout`,
        { planId },
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(): Promise<{ portalUrl: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/v2/subscription/portal`,
        {},
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/v2/subscription/cancel`,
        {},
        this.getAuthHeaders()
      );
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Get usage data
   */
  async getUsage(): Promise<UsageData> {
    try {
      const response = await axios.get(
        `${API_URL}/v2/subscription/usage`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching usage:', error);
      throw error;
    }
  }

  /**
   * Check if a feature is available
   */
  async checkFeature(featureName: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${API_URL}/v2/subscription/features/${featureName}`,
        this.getAuthHeaders()
      );
      return response.data.data.hasAccess;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false;
    }
  }

  /**
   * Track a view (for freemium limitations)
   */
  async trackView(viewType: string, metadata?: any): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/v2/subscription/track-view`,
        { viewType, metadata },
        this.getAuthHeaders()
      );
    } catch (error) {
      console.error('Error tracking view:', error);
      // Don't throw - we don't want to break the app if tracking fails
    }
  }

  /**
   * Get AI usage details
   */
  async getAIUsage(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_URL}/analysis/usage`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching AI usage:', error);
      throw error;
    }
  }

  /**
   * Get AI usage history
   */
  async getAIUsageHistory(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await axios.get(
        `${API_URL}/analysis/usage/history?${params.toString()}`,
        this.getAuthHeaders()
      );
      return response.data.data;
    } catch (error) {
      console.error('Error fetching AI usage history:', error);
      throw error;
    }
  }
}

export const subscriptionService = new SubscriptionService();