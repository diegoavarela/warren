import { NextRequest, NextResponse } from 'next/server';
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    // Find the organization that Vtex Solutions belongs to
    const vtexCompany = await sql`
      SELECT c.id as company_id, c.name as company_name, c.organization_id, c.ai_credits_balance, c.ai_credits_used
      FROM companies c
      WHERE c.name ILIKE '%vtex%solutions%'
      LIMIT 1
    `;

    if (vtexCompany.length === 0) {
      return NextResponse.json({ error: 'Vtex Solutions not found' });
    }

    const company = vtexCompany[0];
    const orgId = company.organization_id;

    // Get ALL companies in this organization
    const allCompanies = await sql`
      SELECT 
        id,
        name,
        ai_credits_balance,
        ai_credits_used,
        is_active
      FROM companies 
      WHERE organization_id = ${orgId}
      ORDER BY name
    `;

    // Get organization tier info
    const orgTier = await sql`
      SELECT 
        o.id,
        o.name as org_name,
        o.tier,
        t.ai_credits_monthly
      FROM organizations o
      LEFT JOIN tiers t ON o.tier = t.name
      WHERE o.id = ${orgId}
    `;

    // Calculate the aggregation logic (same as the API)
    let totalCreditsBalance = 0;
    let totalCreditsUsed = 0;

    for (const comp of allCompanies) {
      const balance = parseFloat(comp.ai_credits_balance?.toString() || '0');
      const used = parseFloat(comp.ai_credits_used?.toString() || '0');
      
      totalCreditsBalance += balance;
      totalCreditsUsed += used;
    }

    return NextResponse.json({
      organization: {
        id: orgId,
        name: orgTier[0]?.org_name || 'Unknown',
        tier: orgTier[0]?.tier || 'Unknown',
        monthlyCredits: orgTier[0]?.ai_credits_monthly || 0,
      },
      companies: allCompanies.map(comp => ({
        id: comp.id, // Return full ID
        idShort: comp.id.substring(0, 8) + '...',
        name: comp.name,
        balance: comp.ai_credits_balance,
        used: comp.ai_credits_used,
        isActive: comp.is_active,
      })),
      aggregation: {
        totalBalance: totalCreditsBalance.toFixed(6),
        totalUsed: totalCreditsUsed.toFixed(6),
        companiesCount: allCompanies.length,
        activeCompaniesCount: allCompanies.filter(c => c.is_active).length,
      },
      issue: {
        description: 'Settings page shows doubled credits due to organization aggregation logic',
        expected: 'Should show individual company credits, not sum of all companies',
        actual: `Shows $${(totalCreditsBalance * 2).toFixed(2)} instead of ~$19.98`,
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}