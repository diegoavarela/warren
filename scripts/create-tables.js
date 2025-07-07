#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

async function createTables() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🔨 Creating database tables in correct order...\n');
    
    // 1. Create organizations table first (no dependencies)
    console.log('Creating organizations table...');
    await sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE,
        tier VARCHAR(50) NOT NULL DEFAULT 'starter',
        locale VARCHAR(5) DEFAULT 'en-US',
        base_currency VARCHAR(3) DEFAULT 'USD',
        fiscal_year_start INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // 2. Create users table (depends on organizations)
    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        organization_id UUID NOT NULL REFERENCES organizations(id),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        locale VARCHAR(5),
        is_active BOOLEAN DEFAULT true,
        is_email_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // 3. Create companies table (depends on organizations)
    console.log('Creating companies table...');
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        name VARCHAR(255) NOT NULL,
        tax_id VARCHAR(100),
        industry VARCHAR(100),
        locale VARCHAR(5),
        base_currency VARCHAR(3),
        display_units VARCHAR(20) DEFAULT 'units',
        fiscal_year_start INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // 4. Create company_users table (depends on companies and users)
    console.log('Creating company_users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS company_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        user_id UUID NOT NULL REFERENCES users(id),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        permissions JSONB,
        is_active BOOLEAN DEFAULT true,
        invited_at TIMESTAMP DEFAULT now(),
        joined_at TIMESTAMP,
        invited_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        UNIQUE(company_id, user_id)
      )
    `;
    
    // 5. Create mapping_templates table (depends on organizations)
    console.log('Creating mapping_templates table...');
    await sql`
      CREATE TABLE IF NOT EXISTS mapping_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        company_id UUID REFERENCES companies(id),
        template_name VARCHAR(255) NOT NULL,
        statement_type VARCHAR(50) NOT NULL,
        file_pattern VARCHAR(255),
        column_mappings JSONB NOT NULL,
        validation_rules JSONB,
        locale VARCHAR(5),
        is_default BOOLEAN DEFAULT false,
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // 6. Create processing_jobs table (depends on organizations)
    console.log('Creating processing_jobs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS processing_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        company_id UUID REFERENCES companies(id),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        file_name VARCHAR(255),
        file_size INTEGER,
        file_type VARCHAR(50),
        progress INTEGER DEFAULT 0,
        result JSONB,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // 7. Create financial_statements table (depends on companies and jobs)
    console.log('Creating financial_statements table...');
    await sql`
      CREATE TABLE IF NOT EXISTS financial_statements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        statement_type VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        currency VARCHAR(3) NOT NULL,
        source_file VARCHAR(255),
        processing_job_id UUID REFERENCES processing_jobs(id),
        is_audited BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // 8. Create financial_line_items table (depends on financial_statements)
    console.log('Creating financial_line_items table...');
    await sql`
      CREATE TABLE IF NOT EXISTS financial_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        statement_id UUID NOT NULL REFERENCES financial_statements(id),
        account_code VARCHAR(50),
        account_name VARCHAR(255) NOT NULL,
        line_item_type VARCHAR(50),
        category VARCHAR(100),
        subcategory VARCHAR(100),
        amount DECIMAL(20, 2) NOT NULL,
        percentage_of_revenue DECIMAL(10, 4),
        year_over_year_change DECIMAL(10, 4),
        notes TEXT,
        is_calculated BOOLEAN DEFAULT false,
        is_subtotal BOOLEAN DEFAULT false,
        is_total BOOLEAN DEFAULT false,
        parent_item_id UUID REFERENCES financial_line_items(id),
        display_order INTEGER,
        original_text VARCHAR(500),
        confidence_score DECIMAL(3, 2),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // Create remaining tables...
    console.log('Creating remaining tables...');
    
    // API Keys
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        company_id UUID REFERENCES companies(id),
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        key_name VARCHAR(100) NOT NULL,
        permissions JSONB NOT NULL,
        rate_limit INTEGER DEFAULT 100,
        rate_limit_window INTEGER DEFAULT 3600,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `;
    
    // Create indexes
    console.log('\nCreating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON companies(organization_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_financial_statements_company_id ON financial_statements(company_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_financial_line_items_statement_id ON financial_line_items(statement_id)`;
    
    console.log('\n✅ All tables created successfully!');
    console.log('\nYou can now run:');
    console.log('  node scripts/seed-database.js');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

createTables();