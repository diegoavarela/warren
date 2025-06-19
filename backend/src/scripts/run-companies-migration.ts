import dotenv from 'dotenv'
// Load environment variables first
dotenv.config()

import { pool } from '../config/database'
import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger'

async function runMigration() {
  try {
    logger.info('Running companies table migration...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../../database/companies_schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the migration
    await pool.query(sql)
    
    logger.info('Companies table migration completed successfully!')
    process.exit(0)
  } catch (error) {
    logger.error('Error running migration:', error)
    process.exit(1)
  }
}

runMigration()