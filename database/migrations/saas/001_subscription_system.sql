-- Warren SaaS Subscription System Migration
-- This migration adds subscription, billing, and usage tracking tables

-- ============================================
-- Subscription Plans
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    stripe_price_id VARCHAR(255),
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(20) DEFAULT 'month',
    interval_count INTEGER DEFAULT 1,
    trial_days INTEGER DEFAULT 14,
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, price_cents, features, limits) VALUES
('freemium', 'Free', 0, 
    '{"dashboard": true, "excel_upload": true, "basic_widgets": true, "export_pdf": true, "support": "community"}',
    '{"users": 1, "excel_files": 1, "history_months": 3, "widgets": 3, "ai_credits_cents": 0}'
),
('professional', 'Professional', 4900,
    '{"dashboard": true, "excel_upload": true, "all_widgets": true, "export_pdf": true, "multi_currency": true, "support": "email", "api_access": false}',
    '{"users": 5, "excel_files": 10, "history_months": -1, "widgets": -1, "ai_credits_cents": 1000}'
),
('enterprise', 'Enterprise', 19900,
    '{"dashboard": true, "excel_upload": true, "all_widgets": true, "export_pdf": true, "multi_currency": true, "quickbooks": true, "api_access": true, "support": "priority", "custom_domain": true, "ip_whitelist": true}',
    '{"users": -1, "excel_files": -1, "history_months": -1, "widgets": -1, "ai_credits_cents": 5000}'
);

-- ============================================
-- Company Subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'trialing',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_company_subscriptions_company_id ON company_subscriptions(company_id);
CREATE INDEX idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX idx_company_subscriptions_stripe_id ON company_subscriptions(stripe_subscription_id);

-- ============================================
-- AI Usage Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    model VARCHAR(100) NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    cost_cents INTEGER NOT NULL,
    request_type VARCHAR(50),
    request_id VARCHAR(255),
    response_time_ms INTEGER,
    error VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_ai_usage_company_id ON ai_usage(company_id);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX idx_ai_usage_company_month ON ai_usage(company_id, date_trunc('month', created_at));

-- ============================================
-- Usage Metrics
-- ============================================

CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value INTEGER NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_usage_metrics_company_id ON usage_metrics(company_id);
CREATE INDEX idx_usage_metrics_type ON usage_metrics(metric_type);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(company_id, period_start, period_end);

-- ============================================
-- Billing Events
-- ============================================

CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    stripe_event_id VARCHAR(255) UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_billing_events_company_id ON billing_events(company_id);
CREATE INDEX idx_billing_events_created_at ON billing_events(created_at DESC);

-- ============================================
-- Feature Access Log
-- ============================================

CREATE TABLE IF NOT EXISTS feature_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    feature_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    was_allowed BOOLEAN NOT NULL,
    denial_reason VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_feature_usage_company_id ON feature_usage_log(company_id, created_at DESC);
CREATE INDEX idx_feature_usage_feature ON feature_usage_log(feature_name, created_at DESC);

-- ============================================
-- Update Companies Table
-- ============================================

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES company_subscriptions(id),
ADD COLUMN IF NOT EXISTS mrr_cents INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue_cents INTEGER DEFAULT 0;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get current subscription for a company
CREATE OR REPLACE FUNCTION get_company_subscription(p_company_id UUID)
RETURNS TABLE (
    plan_name VARCHAR,
    status VARCHAR,
    features JSONB,
    limits JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.name,
        cs.status,
        sp.features,
        sp.limits
    FROM company_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.id
    WHERE cs.company_id = p_company_id
    AND cs.status IN ('active', 'trialing')
    ORDER BY cs.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check feature access
CREATE OR REPLACE FUNCTION check_feature_access(p_company_id UUID, p_feature VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_access BOOLEAN;
BEGIN
    SELECT (features->p_feature)::BOOLEAN INTO v_has_access
    FROM get_company_subscription(p_company_id);
    
    RETURN COALESCE(v_has_access, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to get AI usage for current month
CREATE OR REPLACE FUNCTION get_monthly_ai_usage(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total_cents INTEGER;
BEGIN
    SELECT COALESCE(SUM(cost_cents), 0) INTO v_total_cents
    FROM ai_usage
    WHERE company_id = p_company_id
    AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month';
    
    RETURN v_total_cents;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update company MRR
CREATE OR REPLACE FUNCTION update_company_mrr()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE companies c
    SET mrr_cents = COALESCE(sp.price_cents, 0)
    FROM company_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.id
    WHERE c.id = NEW.company_id
    AND cs.id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mrr
AFTER INSERT OR UPDATE ON company_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_company_mrr();

-- ============================================
-- Migration completion
-- ============================================

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with features and limits';
COMMENT ON TABLE company_subscriptions IS 'Active and historical subscriptions for each company';
COMMENT ON TABLE ai_usage IS 'Tracks AI API usage and costs per company';
COMMENT ON TABLE usage_metrics IS 'General usage metrics for billing and analytics';
COMMENT ON TABLE billing_events IS 'Stripe billing events and payment history';
COMMENT ON TABLE feature_usage_log IS 'Tracks feature access attempts for analytics';