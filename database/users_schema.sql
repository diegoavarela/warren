-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Insert default admin user if not exists
INSERT INTO users (email, password_hash, company_name)
VALUES ('admin@vort-ex.com', '$2b$10$X8H9hgMcP.B7RvJdNMeJbuj5GVxMJR5EqGZ65CYeHqRVGU2EJrqSm', 'Vortex')
ON CONFLICT (email) DO NOTHING;