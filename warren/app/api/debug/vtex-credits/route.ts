import { NextRequest, NextResponse } from 'next/server';
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // First, find companies with "vtex" or similar names
    const companies = await sql`
      SELECT id, name, ai_credits_balance, ai_credits_used, ai_credits_reset_date, created_at
      FROM companies 
      WHERE name ILIKE '%vtex%' OR name ILIKE '%solutions%' OR name ILIKE '%vortex%'
      ORDER BY created_at DESC
    `;
    
    const result = {
      companies: companies.map(c => ({
        id: c.id.substring(0, 8) + '...',
        name: c.name,
        balance: c.ai_credits_balance,
        used: c.ai_credits_used,
        resetDate: c.ai_credits_reset_date,
      })),
      logs: []
    };
    
    if (companies.length > 0) {
      const company = companies[0];
      
      // Get recent AI usage logs for this company
      const logs = await sql`
        SELECT 
          created_at,
          model,
          tokens_input,
          tokens_output,
          cost_usd,
          credits_used,
          request_type
        FROM ai_usage_logs 
        WHERE company_id = ${company.id}
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      result.logs = logs.map(log => ({
        date: new Date(log.created_at).toLocaleString(),
        model: log.model,
        cost: parseFloat(log.cost_usd || '0').toFixed(6),
        tokensIn: log.tokens_input,
        tokensOut: log.tokens_output,
      }));
      
      const totalFromLogs = logs.reduce((sum, log) => sum + parseFloat(log.cost_usd || '0'), 0);
      // Re-fetch company data after potential updates
      const updatedCompany = await sql`
        SELECT ai_credits_used, ai_credits_balance 
        FROM companies 
        WHERE id = ${company.id}
      `;
      
      const currentUsed = parseFloat(updatedCompany[0].ai_credits_used || '0');
      
      result.summary = {
        companyName: company.name,
        databaseUsed: currentUsed.toFixed(6),
        totalFromLogs: totalFromLogs.toFixed(6),
        difference: Math.abs(currentUsed - totalFromLogs).toFixed(6),
        match: Math.abs(currentUsed - totalFromLogs) < 0.000001
      };
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Database query failed:', error);
    return NextResponse.json(
      { error: 'Failed to query database', details: error.message },
      { status: 500 }
    );
  }
}