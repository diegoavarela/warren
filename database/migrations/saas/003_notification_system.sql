-- Notification system tables for usage alerts and communications

-- ============================================
-- Notification State Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS notification_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, notification_type)
);

CREATE INDEX idx_notification_state_company ON notification_state(company_id);
CREATE INDEX idx_notification_state_type ON notification_state(notification_type);

-- ============================================
-- Notification Log
-- ============================================

CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'sent',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_log_company ON notification_log(company_id, sent_at DESC);
CREATE INDEX idx_notification_log_user ON notification_log(user_id, sent_at DESC);
CREATE INDEX idx_notification_log_type ON notification_log(notification_type);

-- ============================================
-- Scheduled Jobs for Notifications
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status, scheduled_for);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to reset monthly notification states
CREATE OR REPLACE FUNCTION reset_monthly_notifications()
RETURNS void AS $$
BEGIN
    -- Reset AI usage alerts
    UPDATE notification_state
    SET metadata = jsonb_build_object(
        'alert_80_sent', false,
        'alert_100_sent', false,
        'last_reset', CURRENT_TIMESTAMP
    )
    WHERE notification_type = 'ai_usage'
    AND (metadata->>'last_reset')::timestamp < date_trunc('month', CURRENT_TIMESTAMP);
    
    -- Reset view limit alerts
    DELETE FROM notification_state
    WHERE notification_type = 'view_limit'
    AND created_at < date_trunc('month', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql;

-- Function to get companies needing alerts
CREATE OR REPLACE FUNCTION get_companies_for_alerts()
RETURNS TABLE (
    company_id UUID,
    check_ai_usage BOOLEAN,
    check_view_limit BOOLEAN,
    check_trial BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CASE 
            WHEN sp.limits->>'ai_credits_cents' IS NOT NULL 
            AND (sp.limits->>'ai_credits_cents')::INTEGER > 0 
            THEN true 
            ELSE false 
        END as check_ai_usage,
        CASE 
            WHEN sp.name = 'freemium' 
            AND sp.limits->>'monthly_views' IS NOT NULL 
            THEN true 
            ELSE false 
        END as check_view_limit,
        CASE 
            WHEN cs.status = 'trialing' 
            AND cs.trial_end > CURRENT_TIMESTAMP 
            THEN true 
            ELSE false 
        END as check_trial
    FROM companies c
    JOIN company_subscriptions cs ON c.id = cs.company_id
    JOIN subscription_plans sp ON cs.plan_id = sp.id
    WHERE cs.status IN ('active', 'trialing')
    AND c.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Audit Log Enhancement for Critical Events
-- ============================================

-- Add indexes for better audit performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_critical ON audit_logs(created_at DESC) 
WHERE action IN (
    'user.login',
    'user.failed_login', 
    'data.export',
    'data.delete',
    'subscription.change',
    'payment.failed'
);

-- ============================================
-- Migration completion
-- ============================================

COMMENT ON TABLE notification_state IS 'Tracks notification states to prevent duplicate alerts';
COMMENT ON TABLE notification_log IS 'Historical log of all notifications sent';
COMMENT ON TABLE scheduled_notifications IS 'Queue for scheduled notification jobs';