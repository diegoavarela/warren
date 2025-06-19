import { Pool } from 'pg'
import { logger } from '../utils/logger'

// Database connection configuration
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
}

// Create a new pool instance
export const pool = new Pool(dbConfig)

// Test the connection
pool.on('connect', () => {
  logger.info('Database connection established')
})

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err)
  process.exit(-1)
})

// Helper function to test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()')
    logger.info('Database connection test successful:', result.rows[0].now)
    return true
  } catch (error) {
    logger.error('Database connection test failed:', error)
    return false
  }
}

// Helper function to close the pool
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await pool.end()
    logger.info('Database connection pool closed')
  } catch (error) {
    logger.error('Error closing database connection pool:', error)
  }
}