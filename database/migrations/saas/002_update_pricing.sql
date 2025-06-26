-- Update subscription pricing to new values
-- Freemium: $0 with limited views
-- Professional: $149/month
-- Enterprise: $349/month

UPDATE subscription_plans 
SET 
    price_cents = 0,
    features = jsonb_build_object(
        'dashboard', true,
        'excel_upload', true,
        'basic_widgets', true,
        'export_pdf', true,
        'support', 'community',
        'limited_views', true,
        'view_limit', 10
    ),
    limits = jsonb_build_object(
        'users', 1,
        'excel_files', 1,
        'history_months', 3,
        'widgets', 3,
        'ai_credits_cents', 0,
        'monthly_views', 10
    )
WHERE name = 'freemium';

UPDATE subscription_plans 
SET 
    price_cents = 14900,  -- $149
    features = jsonb_build_object(
        'dashboard', true,
        'excel_upload', true,
        'all_widgets', true,
        'export_pdf', true,
        'multi_currency', true,
        'support', 'email',
        'api_access', false,
        'unlimited_views', true
    ),
    limits = jsonb_build_object(
        'users', 5,
        'excel_files', 10,
        'history_months', -1,
        'widgets', -1,
        'ai_credits_cents', 1000,
        'monthly_views', -1
    )
WHERE name = 'professional';

UPDATE subscription_plans 
SET 
    price_cents = 34900,  -- $349
    features = jsonb_build_object(
        'dashboard', true,
        'excel_upload', true,
        'all_widgets', true,
        'export_pdf', true,
        'multi_currency', true,
        'quickbooks', true,
        'api_access', true,
        'support', 'priority',
        'custom_domain', true,
        'ip_whitelist', true,
        'unlimited_views', true,
        'white_label', true
    ),
    limits = jsonb_build_object(
        'users', -1,
        'excel_files', -1,
        'history_months', -1,
        'widgets', -1,
        'ai_credits_cents', 5000,
        'monthly_views', -1
    )
WHERE name = 'enterprise';

-- Add view tracking table for freemium limitations
CREATE TABLE IF NOT EXISTS view_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    view_type VARCHAR(50) NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_view_tracking_company_id ON view_tracking(company_id);
CREATE INDEX idx_view_tracking_viewed_at ON view_tracking(viewed_at DESC);
CREATE INDEX idx_view_tracking_company_month ON view_tracking(company_id, date_trunc('month', viewed_at));

-- Function to check if user has remaining views
CREATE OR REPLACE FUNCTION check_view_limit(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_view_limit INTEGER;
    v_current_views INTEGER;
BEGIN
    -- Get the view limit from subscription
    SELECT (limits->>'monthly_views')::INTEGER INTO v_view_limit
    FROM get_company_subscription(p_company_id);
    
    -- If no limit (-1) or no subscription, allow access
    IF v_view_limit IS NULL OR v_view_limit = -1 THEN
        RETURN TRUE;
    END IF;
    
    -- Count current month views
    SELECT COUNT(*) INTO v_current_views
    FROM view_tracking
    WHERE company_id = p_company_id
    AND viewed_at >= date_trunc('month', CURRENT_TIMESTAMP)
    AND viewed_at < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month';
    
    RETURN v_current_views < v_view_limit;
END;
$$ LANGUAGE plpgsql;

-- Update the subscription plans updated_at timestamp
UPDATE subscription_plans SET updated_at = CURRENT_TIMESTAMP;