import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function checkVtexCredits() {
  try {
    // First, find companies with "vtex" or similar names
    const companies = await sql`
      SELECT id, name, ai_credits_balance, ai_credits_used, ai_credits_reset_date, created_at
      FROM companies 
      WHERE name ILIKE '%vtex%' OR name ILIKE '%solutions%' OR name ILIKE '%vortex%'
      ORDER BY created_at DESC
    `;
    
    console.log('🏢 Companies found:');
    companies.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (ID: ${c.id.substring(0, 8)}...)`);
      console.log(`   Balance: $${c.ai_credits_balance}`);
      console.log(`   Used: $${c.ai_credits_used}`);
      console.log(`   Reset Date: ${c.ai_credits_reset_date || 'Not set'}`);
      console.log('');
    });
    
    if (companies.length > 0) {
      const company = companies[0]; // Use the first one found
      
      console.log(`📊 Recent AI usage logs for "${company.name}":`);
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
      
      if (logs.length > 0) {
        logs.forEach((log, i) => {
          const date = new Date(log.created_at).toLocaleString();
          console.log(`  ${i + 1}. ${date}`);
          console.log(`     Cost: $${parseFloat(log.cost_usd || '0').toFixed(6)} (${log.model || 'unknown'})`);
          console.log(`     Tokens: ${log.tokens_input || 0} in, ${log.tokens_output || 0} out`);
          console.log('');
        });
        
        const totalFromLogs = logs.reduce((sum, log) => sum + parseFloat(log.cost_usd || '0'), 0);
        console.log(`📈 Total from usage logs: $${totalFromLogs.toFixed(6)}`);
        console.log(`💾 Database ai_credits_used: $${company.ai_credits_used}`);
        
        const difference = Math.abs(parseFloat(company.ai_credits_used || '0') - totalFromLogs);
        if (difference > 0.000001) {
          console.log(`⚠️  Mismatch detected: $${difference.toFixed(6)} difference`);
        } else {
          console.log(`✅ Database and logs match!`);
        }
      } else {
        console.log('  📭 No AI usage logs found for this company');
      }
    } else {
      console.log('❌ No companies found matching the search criteria');
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error);
  }
}

checkVtexCredits();