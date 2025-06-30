import { Pool } from 'pg';
import { config } from 'dotenv';
import { encryptionService } from '../utils/encryption';
import { logger } from '../utils/logger';

config({ path: '.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface FinancialRecord {
  date: string;
  description: string;
  amount: number;
  record_type: 'revenue' | 'expense';
  category: string;
  subcategory?: string;
  currency: string;
}

async function seedFinancialData() {
  try {
    // Get Vortex company ID (try both possible names)
    const companyResult = await pool.query(
      "SELECT id, name FROM companies WHERE name LIKE 'Vortex%' LIMIT 1"
    );
    
    if (companyResult.rows.length === 0) {
      throw new Error('No Vortex company found in database');
    }
    
    const companyId = companyResult.rows[0].id;
    const companyName = companyResult.rows[0].name;
    logger.info(`Found company: ${companyName} (${companyId})`);
    
    // Get or create a data source for this company
    let dataSourceId: string;
    const dataSourceResult = await pool.query(
      'SELECT id FROM data_sources WHERE company_id = $1 LIMIT 1',
      [companyId]
    );
    
    if (dataSourceResult.rows.length > 0) {
      dataSourceId = dataSourceResult.rows[0].id;
      logger.info(`Using existing data source: ${dataSourceId}`);
    } else {
      // Create a new data source
      const newDataSourceResult = await pool.query(
        `INSERT INTO data_sources (company_id, name, type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [companyId, 'Seeded Financial Data', 'manual', 'active']
      );
      dataSourceId = newDataSourceResult.rows[0].id;
      logger.info(`Created new data source: ${dataSourceId}`);
    }
    
    // Clear existing financial records for this company
    await pool.query('DELETE FROM financial_records WHERE company_id = $1', [companyId]);
    logger.info('Cleared existing financial records');
    
    // Generate 6 months of financial data
    const records: FinancialRecord[] = [];
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    // Generate monthly recurring revenues
    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgo);
      date.setMonth(date.getMonth() + i);
      const monthStr = date.toISOString().split('T')[0];
      
      // SaaS Subscriptions
      records.push({
        date: monthStr.substring(0, 7) + '-05',
        description: 'SaaS Subscriptions - Monthly Recurring Revenue',
        amount: 185000 + (i * 15000), // Growing revenue
        record_type: 'revenue',
        category: 'Sales',
        subcategory: 'Subscriptions',
        currency: 'USD'
      });
      
      // Professional Services
      records.push({
        date: monthStr.substring(0, 7) + '-15',
        description: 'Professional Services Revenue',
        amount: 45000 + (i * 5000),
        record_type: 'revenue',
        category: 'Sales',
        subcategory: 'Services',
        currency: 'USD'
      });
      
      // Enterprise Deals (occasional)
      if (i % 2 === 0) {
        records.push({
          date: monthStr.substring(0, 7) + '-20',
          description: 'Enterprise License Deal',
          amount: 75000 + (i * 10000),
          record_type: 'revenue',
          category: 'Sales',
          subcategory: 'Enterprise',
          currency: 'USD'
        });
      }
      
      // Expenses - Payroll
      records.push({
        date: monthStr.substring(0, 7) + '-01',
        description: 'Monthly Payroll',
        amount: 125000 + (i * 5000),
        record_type: 'expense',
        category: 'Operating Expenses',
        subcategory: 'Payroll',
        currency: 'USD'
      });
      
      // Expenses - AWS/Infrastructure
      records.push({
        date: monthStr.substring(0, 7) + '-03',
        description: 'AWS Infrastructure Costs',
        amount: 28000 + (i * 2000),
        record_type: 'expense',
        category: 'Operating Expenses',
        subcategory: 'Infrastructure',
        currency: 'USD'
      });
      
      // Expenses - Marketing
      records.push({
        date: monthStr.substring(0, 7) + '-10',
        description: 'Digital Marketing Campaigns',
        amount: 35000 + (i * 3000),
        record_type: 'expense',
        category: 'Marketing',
        subcategory: 'Advertising',
        currency: 'USD'
      });
      
      // Expenses - Office
      records.push({
        date: monthStr.substring(0, 7) + '-01',
        description: 'Office Lease and Utilities',
        amount: 18000,
        record_type: 'expense',
        category: 'Operating Expenses',
        subcategory: 'Office',
        currency: 'USD'
      });
      
      // Expenses - Software Licenses
      records.push({
        date: monthStr.substring(0, 7) + '-05',
        description: 'Software Licenses and Tools',
        amount: 12000 + (i * 500),
        record_type: 'expense',
        category: 'Operating Expenses',
        subcategory: 'Software',
        currency: 'USD'
      });
    }
    
    // Add some recent daily transactions for the current month
    const currentMonth = today.toISOString().substring(0, 7);
    const daysInCurrentMonth = Math.min(today.getDate(), 20);
    
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      
      // Daily small revenues
      if (day % 3 === 0) {
        records.push({
          date: `${currentMonth}-${dayStr}`,
          description: 'Daily subscription signups',
          amount: 2500 + Math.random() * 1500,
          record_type: 'revenue',
          category: 'Sales',
          subcategory: 'Subscriptions',
          currency: 'USD'
        });
      }
      
      // Daily small expenses
      if (day % 2 === 0) {
        records.push({
          date: `${currentMonth}-${dayStr}`,
          description: 'Miscellaneous operational expenses',
          amount: 500 + Math.random() * 1000,
          record_type: 'expense',
          category: 'Operating Expenses',
          subcategory: 'Miscellaneous',
          currency: 'USD'
        });
      }
    }
    
    // Insert all records
    let insertedCount = 0;
    for (const record of records) {
      try {
        // Encrypt the amount
        const encryptedAmount = await encryptionService.encryptNumber(record.amount, companyId);
        
        await pool.query(
          `INSERT INTO financial_records 
          (company_id, data_source_id, date, description, amount_encrypted, record_type, category, subcategory, currency, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            companyId,
            dataSourceId,
            record.date,
            record.description,
            encryptedAmount,
            record.record_type,
            record.category,
            record.subcategory,
            record.currency
          ]
        );
        insertedCount++;
      } catch (error) {
        logger.error(`Error inserting record: ${record.description}`, error);
      }
    }
    
    logger.info(`Successfully inserted ${insertedCount} financial records`);
    
    // Verify the data
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM financial_records WHERE company_id = $1',
      [companyId]
    );
    logger.info(`Total records in database: ${countResult.rows[0].count}`);
    
    // Show sample of inserted data
    const sampleResult = await pool.query(
      `SELECT date, description, record_type, category 
       FROM financial_records 
       WHERE company_id = $1 
       ORDER BY date DESC 
       LIMIT 5`,
      [companyId]
    );
    
    logger.info('Sample of inserted records:');
    sampleResult.rows.forEach(row => {
      logger.info(`  ${row.date}: ${row.description} (${row.record_type})`);
    });
    
  } catch (error) {
    logger.error('Error seeding financial data:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seed script
seedFinancialData()
  .then(() => {
    logger.info('Financial data seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Financial data seeding failed:', error);
    process.exit(1);
  });