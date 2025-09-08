import { NextRequest, NextResponse } from 'next/server';
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  try {
    // Find Vtex Solutions LLC
    const companies = await sql`
      SELECT id, name, ai_credits_balance, ai_credits_used
      FROM companies 
      WHERE name ILIKE '%vtex%solutions%'
      LIMIT 1
    `;
    
    if (companies.length === 0) {
      return NextResponse.json({ error: 'Vtex Solutions LLC not found' }, { status: 404 });
    }
    
    const company = companies[0];
    
    // Calculate total used from logs
    const logs = await sql`
      SELECT SUM(CAST(cost_usd AS DECIMAL)) as total_used
      FROM ai_usage_logs 
      WHERE company_id = ${company.id}
    `;
    
    const totalUsed = parseFloat(logs[0].total_used || '0');
    const currentBalance = parseFloat(company.ai_credits_balance || '20');
    
    // Update the company with correct values
    const result = await sql`
      UPDATE companies 
      SET 
        ai_credits_used = ${totalUsed.toFixed(6)},
        ai_credits_balance = ${(20 - totalUsed).toFixed(6)},
        updated_at = NOW()
      WHERE id = ${company.id}
      RETURNING ai_credits_balance, ai_credits_used
    `;
    
    return NextResponse.json({
      success: true,
      companyName: company.name,
      before: {
        used: company.ai_credits_used,
        balance: company.ai_credits_balance,
      },
      after: {
        used: totalUsed.toFixed(6),
        balance: (20 - totalUsed).toFixed(6),
      },
      totalFromLogs: totalUsed.toFixed(6),
      updated: result[0]
    });
    
  } catch (error) {
    console.error('Failed to fix credits:', error);
    return NextResponse.json(
      { error: 'Failed to fix credits', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}