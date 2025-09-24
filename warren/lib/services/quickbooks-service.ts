/**
 * QuickBooks Integration Service
 *
 * Handles token storage, encryption, and QuickBooks API calls
 */

import { db, eq } from '@/lib/db';
import { quickbooksIntegrations } from '@/lib/db/actual-schema';

/**
 * Simple token encoding for development - In production, use proper encryption
 * For now, we'll use base64 encoding as a placeholder
 */
function encrypt(text: string): string {
  // Simple base64 encoding for development
  // In production, implement proper encryption
  return Buffer.from(text).toString('base64');
}

/**
 * Simple token decoding for development
 */
function decrypt(encryptedText: string): string {
  // Simple base64 decoding for development
  try {
    return Buffer.from(encryptedText, 'base64').toString('utf8');
  } catch (error) {
    console.error('❌ [QuickBooks] Error decoding token:', error);
    throw new Error('Invalid token format');
  }
}

/**
 * Store QuickBooks OAuth tokens securely in database
 */
export async function storeQuickBooksTokens(
  realmId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  try {
    console.log('🔍 [QuickBooks] Storing tokens for realm:', realmId);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));

    console.log('🔍 [QuickBooks] Token expiry debug:', {
      expiresIn,
      currentTime: new Date(),
      expiresAt,
      timeUntilExpiry: Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60) + ' minutes'
    });

    // Encrypt tokens
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = encrypt(refreshToken);

    // Check if integration already exists
    const existing = await db
      .select()
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.realmId, realmId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing integration
      await db
        .update(quickbooksIntegrations)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: expiresAt,
          isActive: true,
          lastSyncAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(quickbooksIntegrations.realmId, realmId));

      console.log('✅ [QuickBooks] Updated existing integration for realm:', realmId);
    } else {
      // Create new integration (we'll set companyId later when we know which Warren company this belongs to)
      await db
        .insert(quickbooksIntegrations)
        .values({
          realmId,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: expiresAt,
          isActive: true,
          lastSyncAt: new Date()
        });

      console.log('✅ [QuickBooks] Created new integration for realm:', realmId);
    }

  } catch (error) {
    console.error('❌ [QuickBooks] Error storing tokens:', error);
    throw new Error(`Failed to store QuickBooks tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve and decrypt QuickBooks tokens
 */
export async function getQuickBooksTokens(realmId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  isExpired: boolean;
} | null> {
  try {
    console.log('🔍 [QuickBooks] Retrieving tokens for realm:', realmId);

    const integration = await db
      .select()
      .from(quickbooksIntegrations)
      .where(eq(quickbooksIntegrations.realmId, realmId))
      .limit(1);

    if (integration.length === 0) {
      console.log('❌ [QuickBooks] No integration found for realm:', realmId);
      return null;
    }

    const record = integration[0];

    if (!record.isActive) {
      console.log('❌ [QuickBooks] Integration is inactive for realm:', realmId);
      return null;
    }

    // Decrypt tokens
    const accessToken = decrypt(record.accessToken);
    const refreshToken = decrypt(record.refreshToken);

    const isExpired = record.expiresAt < new Date();
    const currentTime = new Date();

    console.log('✅ [QuickBooks] Retrieved tokens for realm:', realmId, 'Expired:', isExpired);
    console.log('🔍 [QuickBooks] Token retrieval debug:', {
      currentTime,
      expiresAt: record.expiresAt,
      minutesUntilExpiry: Math.round((record.expiresAt.getTime() - currentTime.getTime()) / 1000 / 60),
      isExpired
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: record.expiresAt,
      isExpired
    };

  } catch (error) {
    console.error('❌ [QuickBooks] Error retrieving tokens:', error);
    return null;
  }
}

/**
 * Refresh QuickBooks access token using refresh token
 */
export async function refreshQuickBooksToken(realmId: string): Promise<string | null> {
  try {
    console.log('🔍 [QuickBooks] Refreshing token for realm:', realmId);

    const tokens = await getQuickBooksTokens(realmId);
    if (!tokens) {
      console.error('❌ [QuickBooks] No tokens found for refresh');
      return null;
    }

    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

    const tokenData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken
    });

    const basicAuth = Buffer.from(
      `${process.env.QB_CLIENT_ID}:${process.env.QB_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData
    });

    if (!response.ok) {
      console.error('❌ [QuickBooks] Token refresh failed:', response.status, await response.text());
      return null;
    }

    const newTokens = await response.json();

    // Store new tokens
    await storeQuickBooksTokens(realmId, newTokens.access_token, newTokens.refresh_token, newTokens.expires_in);

    console.log('✅ [QuickBooks] Token refreshed successfully for realm:', realmId);

    return newTokens.access_token;

  } catch (error) {
    console.error('❌ [QuickBooks] Error refreshing token:', error);
    return null;
  }
}

/**
 * Link QuickBooks integration to a Warren company
 */
export async function linkCompanyToQuickBooks(
  companyId: string,
  realmId: string
): Promise<void> {
  try {
    console.log('🔍 [QuickBooks] Linking company to QuickBooks:', { companyId, realmId });

    // Update the QuickBooks integration to include the company ID
    const result = await db
      .update(quickbooksIntegrations)
      .set({
        companyId,
        connectedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(quickbooksIntegrations.realmId, realmId));

    console.log('✅ [QuickBooks] Company linked to QuickBooks successfully');

  } catch (error) {
    console.error('❌ [QuickBooks] Error linking company to QuickBooks:', error);
    throw new Error(`Failed to link company to QuickBooks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(realmId: string): Promise<string | null> {
  try {
    const tokens = await getQuickBooksTokens(realmId);

    if (!tokens) {
      return null;
    }

    // If token is expired, try to refresh it
    if (tokens.isExpired) {
      console.log('🔄 [QuickBooks] Access token expired, refreshing...');
      return await refreshQuickBooksToken(realmId);
    }

    return tokens.accessToken;

  } catch (error) {
    console.error('❌ [QuickBooks] Error getting valid access token:', error);
    return null;
  }
}

/**
 * Make authenticated QuickBooks API call
 */
export async function callQuickBooksAPI(
  realmId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(realmId);

    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    const baseUrl = process.env.QB_SANDBOX === 'true'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

    console.log('🔍 [QuickBooks] API call:', method, endpoint);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        ...(body && { 'Content-Type': 'application/json' })
      },
      ...(body && { body: JSON.stringify(body) })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [QuickBooks] API call failed:', response.status, errorText);
      throw new Error(`QuickBooks API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ [QuickBooks] API call successful:', endpoint);

    return data;

  } catch (error) {
    console.error('❌ [QuickBooks] API call error:', error);
    throw error;
  }
}

/**
 * Fetch P&L data for a specific month and year
 * Used for comparison calculations (current vs year-ago vs 3-months-ago)
 */
export async function fetchSpecificMonthPnL(
  realmId: string,
  year: number,
  month: number, // 1-12
  reportType: 'ProfitAndLoss' | 'ProfitAndLossDetail' = 'ProfitAndLoss'
): Promise<any> {
  try {
    console.log(`🔍 [QuickBooks] Fetching P&L for ${year}-${month.toString().padStart(2, '0')}`);

    // Calculate start and end dates for the month
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;

    // Calculate last day of the month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const lastDay = new Date(nextYear, nextMonth - 1, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

    console.log(`📅 [QuickBooks] Date range: ${startDate} to ${endDate}`);

    // Build QuickBooks API endpoint for P&L report
    const endpoint = `reports/${reportType}?start_date=${startDate}&end_date=${endDate}&summarize_column_by=Month`;

    // Make the API call
    const response = await callQuickBooksAPI(realmId, endpoint);

    console.log(`✅ [QuickBooks] P&L data fetched for ${year}-${month.toString().padStart(2, '0')}`);

    return response;

  } catch (error) {
    console.error(`❌ [QuickBooks] Error fetching P&L for ${year}-${month}:`, error);
    throw new Error(`Failed to fetch P&L data for ${year}-${month}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate comparison periods for a given date
 */
export function calculateComparisonPeriods(currentYear: number, currentMonth: number) {
  // Year ago - same month, previous year
  const yearAgo = {
    year: currentYear - 1,
    month: currentMonth
  };

  // 3 months ago
  let threeMonthsAgoMonth = currentMonth - 3;
  let threeMonthsAgoYear = currentYear;

  if (threeMonthsAgoMonth <= 0) {
    threeMonthsAgoMonth += 12;
    threeMonthsAgoYear -= 1;
  }

  const threeMonthsAgo = {
    year: threeMonthsAgoYear,
    month: threeMonthsAgoMonth
  };

  return {
    current: { year: currentYear, month: currentMonth },
    yearAgo,
    threeMonthsAgo
  };
}

/**
 * Fetch P&L data for current month and comparison periods
 */
export async function fetchPnLWithComparisons(
  realmId: string,
  currentYear: number,
  currentMonth: number
): Promise<{
  current: any;
  yearAgo: any | null;
  threeMonthsAgo: any | null;
}> {
  try {
    console.log(`🔍 [QuickBooks] Fetching P&L with comparisons for ${currentYear}-${currentMonth}`);

    const periods = calculateComparisonPeriods(currentYear, currentMonth);

    // Fetch current month (required)
    const current = await fetchSpecificMonthPnL(realmId, periods.current.year, periods.current.month);

    // Fetch comparison periods (optional - don't fail if they don't exist)
    let yearAgo = null;
    let threeMonthsAgo = null;

    try {
      yearAgo = await fetchSpecificMonthPnL(realmId, periods.yearAgo.year, periods.yearAgo.month);
      console.log(`✅ [QuickBooks] Year-ago data fetched for ${periods.yearAgo.year}-${periods.yearAgo.month}`);
    } catch (error) {
      console.warn(`⚠️ [QuickBooks] Year-ago data not available for ${periods.yearAgo.year}-${periods.yearAgo.month}:`, error instanceof Error ? error.message : 'Unknown error');
    }

    try {
      threeMonthsAgo = await fetchSpecificMonthPnL(realmId, periods.threeMonthsAgo.year, periods.threeMonthsAgo.month);
      console.log(`✅ [QuickBooks] 3-months-ago data fetched for ${periods.threeMonthsAgo.year}-${periods.threeMonthsAgo.month}`);
    } catch (error) {
      console.warn(`⚠️ [QuickBooks] 3-months-ago data not available for ${periods.threeMonthsAgo.year}-${periods.threeMonthsAgo.month}:`, error instanceof Error ? error.message : 'Unknown error');
    }

    console.log(`✅ [QuickBooks] Comparison data fetch complete for ${currentYear}-${currentMonth}`);

    return {
      current,
      yearAgo,
      threeMonthsAgo
    };

  } catch (error) {
    console.error(`❌ [QuickBooks] Error fetching P&L with comparisons:`, error);
    throw error;
  }
}