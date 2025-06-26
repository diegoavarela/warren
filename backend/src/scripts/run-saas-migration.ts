import { pool } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

async function runSaaSMigration() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting SaaS subscription system migration...');
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, '../../database/migrations/saas/001_subscription_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Run the migration
    await client.query(migrationSQL);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('SaaS migration completed successfully!');
    
    // Verify the migration
    const verifyQuery = `
      SELECT 
        (SELECT COUNT(*) FROM subscription_plans) as plan_count,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'company_subscriptions') as subscription_table,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'ai_usage') as ai_usage_table,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'billing_events') as billing_table
    `;
    
    const result = await client.query(verifyQuery);
    const verification = result.rows[0];
    
    logger.info('Migration verification:', {
      plansCreated: verification.plan_count,
      tablesCreated: {
        company_subscriptions: verification.subscription_table === '1',
        ai_usage: verification.ai_usage_table === '1',
        billing_events: verification.billing_table === '1'
      }
    });
    
    // Assign free tier to existing companies without a subscription
    const assignFreeQuery = `
      INSERT INTO company_subscriptions (company_id, plan_id, status, created_at)
      SELECT 
        c.id,
        (SELECT id FROM subscription_plans WHERE name = 'freemium' LIMIT 1),
        'active',
        CURRENT_TIMESTAMP
      FROM companies c
      WHERE NOT EXISTS (
        SELECT 1 FROM company_subscriptions cs WHERE cs.company_id = c.id
      )
    `;
    
    const assignResult = await client.query(assignFreeQuery);
    logger.info(`Assigned freemium plan to ${assignResult.rowCount} existing companies`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runSaaSMigration().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});