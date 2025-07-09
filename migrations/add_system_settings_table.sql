-- Migration: Add system_settings table for platform configuration
-- Date: 2025-07-09

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  category VARCHAR(50) NOT NULL, -- general, security, notifications, billing, integrations, advanced
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on key and category for faster lookups
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- Insert default settings
INSERT INTO system_settings (key, value, category, description) VALUES
  ('systemName', '"Warren Financial Parser"', 'general', 'Name of the system'),
  ('systemUrl', '"https://warren.com"', 'general', 'System base URL'),
  ('defaultLanguage', '"es-MX"', 'general', 'Default language for new users'),
  ('timezone', '"America/Mexico_City"', 'general', 'Default timezone'),
  ('requireTwoFactor', 'true', 'security', 'Require 2FA for platform admins'),
  ('sessionTimeout', '86400', 'security', 'Session timeout in seconds'),
  ('passwordMinLength', '8', 'security', 'Minimum password length'),
  ('passwordRequireUppercase', 'true', 'security', 'Require uppercase letters in passwords'),
  ('passwordRequireNumbers', 'true', 'security', 'Require numbers in passwords'),
  ('newUserNotification', 'true', 'notifications', 'Notify on new user registration'),
  ('newCompanyNotification', 'true', 'notifications', 'Notify on new company creation'),
  ('systemErrorNotification', 'true', 'notifications', 'Notify on system errors'),
  ('resourceUsageNotification', 'true', 'notifications', 'Notify on high resource usage'),
  ('resourceUsageThreshold', '80', 'notifications', 'Resource usage threshold percentage')
ON CONFLICT (key) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE system_settings IS 'Platform-wide configuration settings';