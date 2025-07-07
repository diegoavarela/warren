-- Session management tables for authentication tracking

-- Active user sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  logout_at TIMESTAMP,
  logout_reason VARCHAR(50) -- manual, expired, password_change, admin_action
);

-- Index for quick session lookups
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Login attempts for rate limiting and security
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100), -- invalid_password, user_not_found, account_locked
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- Index for rate limiting queries
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_timestamp ON login_attempts(attempted_at);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET is_active = false, 
      logout_reason = 'expired'
  WHERE expires_at < NOW() 
    AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a periodic job to clean up expired sessions
-- This would require pg_cron extension or external scheduler