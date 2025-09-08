import { NextRequest, NextResponse } from 'next/server';
import { db, companies, tiers, eq, and, lte } from '@/lib/db';
import { resetAICredits } from '@/lib/ai-credits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a cron job (optional security check)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log(`Starting credit reset process at ${today.toISOString()}`);

    // Find companies that need their credits reset
    // (where aiCreditsResetDate is today or in the past)
    const companiesNeedingReset = await db
      .select({
        id: companies.id,
        name: companies.name,
        organizationId: companies.organizationId,
        tierId: companies.tierId,
        aiCreditsBalance: companies.aiCreditsBalance,
        aiCreditsResetDate: companies.aiCreditsResetDate,
        tierName: tiers.name,
        aiCreditsPerMonth: tiers.aiCreditsMonthly,
      })
      .from(companies)
      .innerJoin(tiers, eq(companies.tierId, tiers.id))
      .where(
        and(
          lte(companies.aiCreditsResetDate, todayString),
          eq(companies.isActive, true)
        )
      );

    console.log(`Found ${companiesNeedingReset.length} companies needing credit reset`);

    const resetResults = [];
    
    for (const company of companiesNeedingReset) {
      try {
        console.log(`Resetting credits for company: ${company.name} (ID: ${company.id})`);
        
        // Calculate next reset date (same day next month)
        const nextResetDate = new Date(company.aiCreditsResetDate || today);
        nextResetDate.setMonth(nextResetDate.getMonth() + 1);
        
        // Reset the credits using the ai-credits library
        const resetResult = await resetAICredits(
          company.id,
          Number(company.aiCreditsPerMonth) || 0,
          nextResetDate
        );

        if (resetResult.success) {
          resetResults.push({
            companyId: company.id,
            companyName: company.name,
            previousBalance: company.aiCreditsBalance,
            newBalance: company.aiCreditsPerMonth,
            nextResetDate: nextResetDate.toISOString(),
            status: 'success'
          });
          
          console.log(`Successfully reset credits for ${company.name}: $${company.aiCreditsBalance} -> $${company.aiCreditsPerMonth}`);
        } else {
          throw new Error(resetResult.error || 'Unknown reset error');
        }
        
      } catch (error) {
        console.error(`Failed to reset credits for company ${company.name}:`, error);
        resetResults.push({
          companyId: company.id,
          companyName: company.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Summary statistics
    const successCount = resetResults.filter(r => r.status === 'success').length;
    const errorCount = resetResults.filter(r => r.status === 'error').length;

    console.log(`Credit reset completed: ${successCount} successful, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      message: 'Credit reset process completed',
      summary: {
        totalCompanies: companiesNeedingReset.length,
        successfulResets: successCount,
        errors: errorCount,
        processedAt: today.toISOString()
      },
      results: resetResults
    });

  } catch (error) {
    console.error('Credit reset cron job failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Credit reset process failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow manual triggering via POST for testing/admin purposes
  return GET(request);
}