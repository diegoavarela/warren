-- Multi-tenant Base Migration
-- This migration transforms the application into a multi-tenant architecture

-- ============================================
-- STEP 1: Update companies table with licensing
-- ============================================

-- Add licensing and multi-tenant fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS license_expiry TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'standard', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[], -- Array of allowed email domains
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS usage_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_companies_subscription_tier ON companies(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_companies_license_expiry ON companies(license_expiry);

-- ============================================
-- STEP 2: Create user roles and permissions
-- ============================================

-- Create user roles enum type
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('platform_admin', 'company_admin', 'company_employee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions
INSERT INTO permissions (name, description, module) VALUES
    ('platform.manage', 'Manage platform settings and all companies', 'platform'),
    ('company.manage', 'Manage company settings and users', 'company'),
    ('users.view', 'View users in company', 'users'),
    ('users.create', 'Create users in company', 'users'),
    ('users.edit', 'Edit users in company', 'users'),
    ('users.delete', 'Delete users in company', 'users'),
    ('pnl.view', 'View P&L data', 'pnl'),
    ('pnl.upload', 'Upload P&L data', 'pnl'),
    ('cashflow.view', 'View cashflow data', 'cashflow'),
    ('cashflow.upload', 'Upload cashflow data', 'cashflow'),
    ('ai_analysis.access', 'Access AI analysis features', 'ai_analysis'),
    ('reports.export', 'Export reports', 'reports')
ON CONFLICT (name) DO NOTHING;

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role user_role_type NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Assign default permissions to roles
-- Platform Admin gets everything
INSERT INTO role_permissions (role, permission_id)
SELECT 'platform_admin'::user_role_type, id FROM permissions
ON CONFLICT DO NOTHING;

-- Company Admin gets company and user management
INSERT INTO role_permissions (role, permission_id)
SELECT 'company_admin'::user_role_type, id FROM permissions
WHERE name IN (
    'company.manage', 'users.view', 'users.create', 'users.edit', 'users.delete',
    'pnl.view', 'pnl.upload', 'cashflow.view', 'cashflow.upload', 'reports.export'
)
ON CONFLICT DO NOTHING;

-- Company Employee gets basic access
INSERT INTO role_permissions (role, permission_id)
SELECT 'company_employee'::user_role_type, id FROM permissions
WHERE name IN ('pnl.view', 'cashflow.view', 'reports.export')
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 3: Update users table for multi-tenancy and 2FA
-- ============================================

-- Add multi-tenant and security fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS role user_role_type DEFAULT 'company_employee',
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(255), -- Encrypted
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[], -- Encrypted array
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

-- ============================================
-- STEP 4: Create audit log table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- STEP 5: Create user invitations table
-- ============================================

CREATE TABLE IF NOT EXISTS user_invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    role user_role_type NOT NULL DEFAULT 'company_employee',
    invited_by INTEGER NOT NULL REFERENCES users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, company_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- ============================================
-- STEP 6: Create blocked email domains table
-- ============================================

CREATE TABLE IF NOT EXISTS blocked_email_domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert common free email providers
INSERT INTO blocked_email_domains (domain, reason) VALUES
    ('gmail.com', 'Free email provider'),
    ('yahoo.com', 'Free email provider'),
    ('hotmail.com', 'Free email provider'),
    ('outlook.com', 'Free email provider'),
    ('aol.com', 'Free email provider'),
    ('icloud.com', 'Free email provider'),
    ('mail.com', 'Free email provider'),
    ('protonmail.com', 'Free email provider'),
    ('yandex.com', 'Free email provider'),
    ('gmx.com', 'Free email provider'),
    ('zoho.com', 'Free email provider'),
    ('tutanota.com', 'Free email provider'),
    ('fastmail.com', 'Free email provider'),
    ('hushmail.com', 'Free email provider'),
    ('mailinator.com', 'Temporary email provider'),
    ('guerrillamail.com', 'Temporary email provider'),
    ('10minutemail.com', 'Temporary email provider'),
    ('tempmail.com', 'Temporary email provider')
ON CONFLICT (domain) DO NOTHING;

-- ============================================
-- STEP 7: Add company_id to all data tables
-- ============================================

-- Add company_id to file_uploads
ALTER TABLE file_uploads
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to pnl_uploads
ALTER TABLE pnl_uploads
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to pnl_line_items
ALTER TABLE pnl_line_items
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Add company_id to excel_mappings
ALTER TABLE excel_mappings
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_file_uploads_company_id ON file_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_pnl_uploads_company_id ON pnl_uploads(company_id);
CREATE INDEX IF NOT EXISTS idx_pnl_line_items_company_id ON pnl_line_items(company_id);
CREATE INDEX IF NOT EXISTS idx_excel_mappings_company_id ON excel_mappings(company_id);

-- ============================================
-- STEP 8: Create session management table
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);

-- ============================================
-- STEP 9: Create feature access log
-- ============================================

CREATE TABLE IF NOT EXISTS feature_access_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    feature_name VARCHAR(100) NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    was_allowed BOOLEAN NOT NULL,
    denial_reason VARCHAR(255)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_access_log_company_id ON feature_access_log(company_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_access_log_feature ON feature_access_log(feature_name, accessed_at DESC);

-- ============================================
-- STEP 10: Create encryption keys table
-- ============================================

CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    company_id UUID UNIQUE NOT NULL REFERENCES companies(id),
    key_version INTEGER NOT NULL DEFAULT 1,
    encrypted_key TEXT NOT NULL, -- Encrypted with master key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_encryption_keys_company_id ON encryption_keys(company_id);

-- ============================================
-- STEP 11: Create default feature flags
-- ============================================

-- Update existing companies with default feature flags
UPDATE companies 
SET feature_flags = jsonb_build_object(
    'user_management', subscription_tier IN ('basic', 'standard', 'premium', 'enterprise'),
    'pnl_access', subscription_tier IN ('standard', 'premium', 'enterprise'),
    'cashflow_access', subscription_tier IN ('premium', 'enterprise'),
    'ai_analysis', subscription_tier = 'enterprise',
    'advanced_reports', subscription_tier IN ('premium', 'enterprise'),
    'api_access', subscription_tier = 'enterprise',
    'custom_branding', subscription_tier = 'enterprise',
    'data_export', subscription_tier IN ('standard', 'premium', 'enterprise'),
    'multi_currency', subscription_tier IN ('premium', 'enterprise'),
    'audit_logs', subscription_tier IN ('premium', 'enterprise')
)
WHERE feature_flags = '{}' OR feature_flags IS NULL;

-- ============================================
-- STEP 12: Create functions for tenant isolation
-- ============================================

-- Function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', TRUE)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set current tenant
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id UUID) RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create comment on schema
COMMENT ON SCHEMA public IS 'Warren multi-tenant financial management platform';