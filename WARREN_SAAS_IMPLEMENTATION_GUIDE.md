# Warren SaaS Implementation Guide

## Overview

This guide provides detailed implementation instructions for transforming Warren from a single-tenant financial dashboard into a full-featured SaaS platform with freemium, professional, and enterprise tiers.

## Prerequisites

- Node.js 18+
- PostgreSQL (Neon database already configured)
- Stripe account for payments
- AWS account for Lightsail and S3
- OpenAI API key
- SendGrid account for emails

## Phase 1: Foundation Implementation

### 1.1 Database Schema Updates

First, create the subscription and billing schema:

```sql
-- Create subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    stripe_price_id VARCHAR(255),
    price_cents INTEGER NOT NULL,
    interval VARCHAR(20) DEFAULT 'month',
    features JSONB NOT NULL,
    limits JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create company subscriptions table
CREATE TABLE company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create AI usage tracking table
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    model VARCHAR(100) NOT NULL,
    tokens_used INTEGER NOT NULL,
    cost_cents INTEGER NOT NULL,
    request_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX idx_ai_usage_company_id_created ON ai_usage(company_id, created_at);
```

### 1.2 Stripe Integration

1. Install Stripe SDK:
```bash
cd backend
npm install stripe @types/stripe
```

2. Create Stripe service:
```typescript
// backend/src/services/StripeService.ts
import Stripe from 'stripe';
import { logger } from '../utils/logger';

export class StripeService {
    private stripe: Stripe;
    private static instance: StripeService;

    private constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: '2023-10-16',
        });
    }

    static getInstance(): StripeService {
        if (!StripeService.instance) {
            StripeService.instance = new StripeService();
        }
        return StripeService.instance;
    }

    async createCustomer(email: string, companyName: string): Promise<Stripe.Customer> {
        return await this.stripe.customers.create({
            email,
            name: companyName,
            metadata: {
                company_name: companyName
            }
        });
    }

    async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
        return await this.stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            trial_period_days: 14,
        });
    }

    async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        return await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
    }
}
```

### 1.3 AI Usage Tracking

Create AI usage tracking middleware:

```typescript
// backend/src/middleware/aiUsageTracking.ts
import { Request, Response, NextFunction } from 'express';
import { AIUsageService } from '../services/AIUsageService';

export async function trackAIUsage(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json;
    
    res.json = function(data: any) {
        if (req.path.includes('/ai/analyze') && data.usage) {
            AIUsageService.getInstance().trackUsage({
                companyId: req.user.companyId,
                userId: req.user.id,
                model: data.usage.model,
                tokensUsed: data.usage.tokens,
                costCents: Math.ceil(data.usage.tokens * 0.002), // $0.002 per 1K tokens
                requestType: 'analysis'
            });
        }
        return originalJson.call(this, data);
    };
    
    next();
}
```

## Phase 2: Multi-Source Data Integration

### 2.1 Unified Data Model

Create a data source abstraction:

```typescript
// backend/src/models/DataSource.ts
export interface DataSource {
    id: string;
    companyId: string;
    type: 'excel' | 'google_sheets' | 'quickbooks' | 'csv';
    name: string;
    config: any;
    lastSync: Date;
    status: 'active' | 'error' | 'syncing';
}

export interface DataConnector {
    connect(config: any): Promise<void>;
    fetchData(startDate: Date, endDate: Date): Promise<any>;
    validate(): Promise<boolean>;
    disconnect(): Promise<void>;
}
```

### 2.2 Excel Mapping Interface

Enhance the Excel mapping with visual preview:

```typescript
// frontend/src/components/ExcelMapper.tsx
import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export const ExcelMapper: React.FC<{ file: File }> = ({ file }) => {
    const [preview, setPreview] = useState<any[][]>([]);
    const [mappings, setMappings] = useState<Map<string, string>>(new Map());
    
    // Component implementation with drag-drop mapping
};
```

## Phase 3: Dynamic Dashboard System

### 3.1 Widget Framework

Create the widget system:

```typescript
// frontend/src/components/Dashboard/WidgetSystem.ts
export interface Widget {
    id: string;
    type: string;
    title: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    config: any;
    data?: any;
}

export interface DashboardLayout {
    id: string;
    name: string;
    widgets: Widget[];
    role?: 'ceo' | 'cfo' | 'controller';
    isDefault?: boolean;
}
```

### 3.2 Drag and Drop Implementation

Use react-grid-layout for dashboard customization:

```bash
npm install react-grid-layout
```

```typescript
// frontend/src/components/Dashboard/DynamicDashboard.tsx
import GridLayout from 'react-grid-layout';

export const DynamicDashboard: React.FC = () => {
    // Implementation with drag-drop, resize, add/remove widgets
};
```

## Phase 4: Freemium Implementation

### 4.1 Feature Gates

Create a feature flag system:

```typescript
// backend/src/services/FeatureService.ts
export class FeatureService {
    static canAccess(companyId: string, feature: string): boolean {
        const subscription = await this.getSubscription(companyId);
        const plan = await this.getPlan(subscription.planId);
        
        return plan.features[feature] === true;
    }
    
    static enforce(feature: string) {
        return async (req: Request, res: Response, next: NextFunction) => {
            if (!await this.canAccess(req.user.companyId, feature)) {
                return res.status(403).json({
                    error: 'Feature not available in your plan',
                    upgradeUrl: '/pricing'
                });
            }
            next();
        };
    }
}
```

### 4.2 Usage Limits

Implement usage tracking and limits:

```typescript
// backend/src/middleware/usageLimits.ts
export async function enforceUsageLimits(req: Request, res: Response, next: NextFunction) {
    const usage = await UsageService.getMonthlyUsage(req.user.companyId);
    const limits = await PlanService.getLimits(req.user.companyId);
    
    if (usage.excelFiles >= limits.maxExcelFiles) {
        return res.status(429).json({
            error: 'Excel file limit reached',
            limit: limits.maxExcelFiles,
            upgradeUrl: '/pricing'
        });
    }
    
    next();
}
```

## Phase 5: Production Deployment

### 5.1 Environment Configuration

Create production environment files:

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@neon.tech/warren
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
OPENAI_API_KEY=sk-xxx
AWS_S3_BUCKET=warren-production
ENCRYPTION_MASTER_KEY=xxx
JWT_SECRET=xxx
```

### 5.2 AWS Lightsail Setup

1. Create Lightsail instance:
```bash
aws lightsail create-instances \
    --instance-names warren-production \
    --availability-zone us-east-1a \
    --blueprint-id ubuntu_20_04 \
    --bundle-id medium_2_0
```

2. Configure security groups and SSL
3. Set up CI/CD pipeline

### 5.3 Monitoring Setup

Configure monitoring with:
- CloudWatch for infrastructure
- Sentry for error tracking
- Mixpanel for analytics
- StatusPage for uptime monitoring

## Security Considerations

1. **Data Encryption**: All financial data encrypted at rest and in transit
2. **API Security**: Rate limiting, API keys for enterprise
3. **Compliance**: Implement SOC 2 controls
4. **Backup**: Daily automated backups with 30-day retention
5. **Access Control**: IP whitelisting for enterprise tier

## Testing Strategy

1. **Unit Tests**: Jest for backend, React Testing Library for frontend
2. **Integration Tests**: Supertest for API endpoints
3. **E2E Tests**: Cypress for critical user flows
4. **Load Testing**: K6 for performance validation
5. **Security Testing**: OWASP ZAP for vulnerability scanning

## Rollout Plan

1. **Week 1-2**: Deploy foundation features to staging
2. **Week 3**: Beta test with 10 selected companies
3. **Week 4**: Gradual rollout to 25% of users
4. **Week 5**: Full rollout with monitoring
5. **Week 6+**: Iterate based on feedback

## Support Documentation

Create comprehensive documentation:
- API documentation with Swagger
- User guides with screenshots
- Video tutorials for key features
- FAQs and troubleshooting guides
- Developer documentation for integrations

## Monitoring Checklist

- [ ] Application performance (< 200ms API response time)
- [ ] Database performance (< 50ms query time)
- [ ] Error rate (< 1%)
- [ ] AI usage costs (track per company)
- [ ] Subscription metrics (MRR, churn, upgrades)
- [ ] User engagement (DAU, feature adoption)
- [ ] Security events (failed logins, suspicious activity)

## Post-Launch Optimization

1. **Performance**: CDN for static assets, database query optimization
2. **Scaling**: Horizontal scaling preparation, caching strategy
3. **Features**: A/B testing framework, feature flags
4. **Revenue**: Pricing optimization, upsell campaigns
5. **Support**: In-app chat, knowledge base, ticketing system