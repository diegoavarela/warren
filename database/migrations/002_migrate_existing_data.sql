-- Migrate Existing Data to Multi-tenant Structure
-- This migration handles existing data transformation

-- ============================================
-- STEP 1: Create default company for existing data
-- ============================================

-- Check if Vortex company exists, if not create it
DO $$
DECLARE
    default_company_id UUID;
    existing_user_count INTEGER;
BEGIN
    -- Get the Vortex company ID or create new one
    SELECT id INTO default_company_id FROM companies WHERE name = 'Vortex Tech Solutions' LIMIT 1;
    
    IF default_company_id IS NULL THEN
        INSERT INTO companies (
            name,
            currency,
            scale,
            is_active,
            website,
            email,
            industry,
            description,
            primary_color,
            secondary_color,
            default_currency,
            default_unit,
            enable_currency_conversion,
            show_currency_selector,
            user_limit,
            subscription_tier,
            allowed_email_domains,
            feature_flags
        ) VALUES (
            'Vortex Tech Solutions',
            'ARS',
            'thousands',
            TRUE,
            'https://vort-ex.com',
            'contact@vort-ex.com',
            'Technology',
            'Default company for existing data migration',
            '#7CB342',
            '#2E7D32',
            'ARS',
            'units',
            TRUE,
            TRUE,
            100, -- Generous limit for existing company
            'enterprise', -- Give them enterprise access
            ARRAY['vort-ex.com', 'vortex.com', 'warren.vortex.com'],
            jsonb_build_object(
                'user_management', true,
                'pnl_access', true,
                'cashflow_access', true,
                'ai_analysis', true,
                'advanced_reports', true,
                'api_access', true,
                'custom_branding', true,
                'data_export', true,
                'multi_currency', true,
                'audit_logs', true
            )
        )
        RETURNING id INTO default_company_id;
    END IF;

    -- Update all existing users to belong to the default company
    UPDATE users 
    SET company_id = default_company_id,
        role = CASE 
            WHEN email = 'admin@vort-ex.com' THEN 'company_admin'::user_role_type
            ELSE 'company_employee'::user_role_type
        END,
        email_verified = TRUE, -- Assume existing users are verified
        last_password_change = CURRENT_TIMESTAMP
    WHERE company_id IS NULL;

    -- Count users assigned
    SELECT COUNT(*) INTO existing_user_count FROM users WHERE company_id = default_company_id;
    RAISE NOTICE 'Assigned % existing users to default company', existing_user_count;

    -- Update all data tables with the default company_id
    UPDATE file_uploads SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE pnl_uploads SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE pnl_line_items SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE excel_mappings SET company_id = default_company_id WHERE company_id IS NULL;

END $$;

-- ============================================
-- STEP 2: Create platform admin account
-- ============================================

DO $$
DECLARE
    platform_admin_exists BOOLEAN;
BEGIN
    -- Check if platform admin exists
    SELECT EXISTS(SELECT 1 FROM users WHERE role = 'platform_admin') INTO platform_admin_exists;
    
    IF NOT platform_admin_exists THEN
        -- Create platform admin user
        INSERT INTO users (
            email,
            password_hash,
            company_name,
            role,
            is_active,
            email_verified,
            created_at,
            updated_at
        ) VALUES (
            'platform@warren.ai',
            '$2b$10$X8H9hgMcP.B7RvJdNMeJbuj5GVxMJR5EqGZ65CYeHqRVGU2EJrqSm', -- Default password: Admin123!
            'Warren Platform',
            'platform_admin'::user_role_type,
            TRUE,
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (email) DO NOTHING;
        
        RAISE NOTICE 'Created platform admin account: platform@warren.ai';
    END IF;
END $$;

-- ============================================
-- STEP 3: Create encryption keys for companies
-- ============================================

INSERT INTO encryption_keys (company_id, key_version, encrypted_key, is_active)
SELECT 
    id as company_id,
    1 as key_version,
    -- This is a placeholder - actual implementation will use proper encryption
    encode(gen_random_bytes(32), 'base64') as encrypted_key,
    TRUE as is_active
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM encryption_keys ek WHERE ek.company_id = companies.id
);

-- ============================================
-- STEP 4: Set NOT NULL constraints after migration
-- ============================================

-- Make company_id required for users (except platform admin)
ALTER TABLE users 
ALTER COLUMN company_id SET NOT NULL,
ALTER COLUMN role SET NOT NULL;

-- Make company_id required for all data tables
ALTER TABLE file_uploads ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE pnl_uploads ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE pnl_line_items ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE excel_mappings ALTER COLUMN company_id SET NOT NULL;

-- ============================================
-- STEP 5: Create initial audit log entry
-- ============================================

INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    entity_type,
    entity_id,
    new_values,
    created_at
) 
SELECT 
    u.id,
    u.company_id,
    'migration.completed',
    'system',
    'multi-tenant-migration',
    jsonb_build_object(
        'migration_version', '002',
        'users_migrated', COUNT(*) OVER (PARTITION BY u.company_id),
        'timestamp', CURRENT_TIMESTAMP
    ),
    CURRENT_TIMESTAMP
FROM users u
WHERE u.company_id IS NOT NULL
LIMIT 1;

-- ============================================
-- STEP 6: Create RLS policies for tenant isolation
-- ============================================

-- Enable Row Level Security on all data tables
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE excel_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_access_log ENABLE ROW LEVEL SECURITY;

-- Create policies for file_uploads
CREATE POLICY tenant_isolation ON file_uploads
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- Create policies for pnl_uploads
CREATE POLICY tenant_isolation ON pnl_uploads
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- Create policies for pnl_line_items
CREATE POLICY tenant_isolation ON pnl_line_items
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- Create policies for excel_mappings
CREATE POLICY tenant_isolation ON excel_mappings
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- Create policies for audit_logs
CREATE POLICY tenant_isolation ON audit_logs
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- Create policies for user_sessions
CREATE POLICY tenant_isolation ON user_sessions
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- Create policies for feature_access_log
CREATE POLICY tenant_isolation ON feature_access_log
    FOR ALL
    USING (company_id = current_tenant_id() OR current_setting('app.bypass_rls', TRUE)::boolean = TRUE);

-- ============================================
-- STEP 7: Create views for common queries
-- ============================================

-- View for active users per company
CREATE OR REPLACE VIEW company_user_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.subscription_tier,
    c.user_limit,
    COUNT(DISTINCT u.id) as active_users,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'company_admin') as admin_count,
    COUNT(DISTINCT u.id) FILTER (WHERE u.is_2fa_enabled = TRUE) as users_with_2fa,
    MAX(u.last_login) as last_company_activity
FROM companies c
LEFT JOIN users u ON c.id = u.company_id AND u.is_active = TRUE
GROUP BY c.id, c.name, c.subscription_tier, c.user_limit;

-- View for feature usage per company
CREATE OR REPLACE VIEW company_feature_usage AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.subscription_tier,
    COUNT(DISTINCT fal.feature_name) as features_accessed,
    COUNT(*) FILTER (WHERE fal.was_allowed = FALSE) as access_denials,
    MAX(fal.accessed_at) as last_feature_access
FROM companies c
LEFT JOIN feature_access_log fal ON c.id = fal.company_id
WHERE fal.accessed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY c.id, c.name, c.subscription_tier;

-- ============================================
-- STEP 8: Add constraints and validations
-- ============================================

-- Add check constraint for user limits
ALTER TABLE companies
ADD CONSTRAINT check_user_limit_by_tier CHECK (
    CASE subscription_tier
        WHEN 'basic' THEN user_limit <= 5
        WHEN 'standard' THEN user_limit <= 10
        WHEN 'premium' THEN user_limit <= 25
        WHEN 'enterprise' THEN TRUE -- No limit
        ELSE FALSE
    END
);

-- Add constraint to ensure platform admins don't belong to a company
ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_platform_admin_no_company,
ADD CONSTRAINT check_platform_admin_no_company CHECK (
    (role = 'platform_admin' AND company_id IS NULL) OR
    (role != 'platform_admin' AND company_id IS NOT NULL)
);

-- Temporarily disable the constraint to fix existing data
ALTER TABLE users DROP CONSTRAINT check_platform_admin_no_company;

-- Fix platform admin records
UPDATE users SET company_id = NULL WHERE role = 'platform_admin';

-- Re-enable the constraint
ALTER TABLE users
ADD CONSTRAINT check_platform_admin_no_company CHECK (
    (role = 'platform_admin' AND company_id IS NULL) OR
    (role != 'platform_admin' AND company_id IS NOT NULL)
);

-- ============================================
-- STEP 9: Migration completion message
-- ============================================

DO $$
DECLARE
    total_companies INTEGER;
    total_users INTEGER;
    total_records_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_companies FROM companies;
    SELECT COUNT(*) INTO total_users FROM users WHERE company_id IS NOT NULL;
    SELECT COUNT(*) INTO total_records_migrated FROM (
        SELECT id FROM file_uploads WHERE company_id IS NOT NULL
        UNION ALL
        SELECT id FROM pnl_uploads WHERE company_id IS NOT NULL
        UNION ALL
        SELECT id FROM excel_mappings WHERE company_id IS NOT NULL
    ) as migrated;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Multi-tenant migration completed successfully!';
    RAISE NOTICE 'Companies: %', total_companies;
    RAISE NOTICE 'Users migrated: %', total_users;
    RAISE NOTICE 'Data records migrated: %', total_records_migrated;
    RAISE NOTICE 'Platform admin account: platform@warren.ai';
    RAISE NOTICE 'Default password: Admin123! (CHANGE IMMEDIATELY)';
    RAISE NOTICE '===========================================';
END $$;