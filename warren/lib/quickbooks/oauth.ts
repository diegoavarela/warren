import 'server-only';
import OAuthClient from 'intuit-oauth';
import { QBOAuthConfig, QBTokens } from '@/lib/types/quickbooks';

/**
 * QuickBooks OAuth Service
 * Handles OAuth 2.0 flow for QuickBooks integration
 */
export class QuickBooksOAuthService {
  private oauthClient: OAuthClient;
  private config: QBOAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.QB_CLIENT_ID!,
      clientSecret: process.env.QB_CLIENT_SECRET!,
      scope: process.env.QB_SCOPE || 'com.intuit.quickbooks.accounting',
      redirectUri: process.env.QB_REDIRECT_URI!,
      baseUrl: process.env.QB_BASE_URL || 'https://sandbox-quickbooks.api.intuit.com',
      discoveryDocument: process.env.QB_DISCOVERY_DOCUMENT || 'https://appcenter.intuit.com/api/v1/connection/oauth2'
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('QuickBooks OAuth credentials not configured. Please set QB_CLIENT_ID and QB_CLIENT_SECRET environment variables.');
    }

    this.oauthClient = new OAuthClient({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      environment: this.config.baseUrl.includes('sandbox') ? 'sandbox' : 'production',
      redirectUri: this.config.redirectUri
    });
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthUri(state?: string): string {
    try {
      const authUri = this.oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting],
        state: state || this.generateState()
      });
      
      console.log('Generated QB OAuth URL:', authUri);
      return authUri;
    } catch (error) {
      console.error('Error generating QB OAuth URL:', error);
      throw new Error('Failed to generate QuickBooks authorization URL');
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(
    authorizationCode: string,
    realmId: string,
    state?: string
  ): Promise<QBTokens> {
    try {
      const authResponse = await this.oauthClient.createToken(authorizationCode);
      
      if (!authResponse || !authResponse.token) {
        throw new Error('No token received from QuickBooks');
      }

      const token = authResponse.token;
      
      return {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type || 'Bearer',
        expires_in: token.expires_in,
        refresh_token_expires_in: token.refresh_token_expires_in,
        x_refresh_token_expires_in: token.x_refresh_token_expires_in,
        realmId: realmId
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<QBTokens> {
    try {
      // Set the refresh token on the client
      this.oauthClient.token.setToken({
        refresh_token: refreshToken
      });

      const authResponse = await this.oauthClient.refresh();
      
      if (!authResponse || !authResponse.token) {
        throw new Error('No token received when refreshing');
      }

      const token = authResponse.token;
      
      return {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type || 'Bearer',
        expires_in: token.expires_in,
        refresh_token_expires_in: token.refresh_token_expires_in,
        x_refresh_token_expires_in: token.x_refresh_token_expires_in,
        realmId: token.realmId
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Revoke tokens (disconnect)
   */
  async revokeTokens(refreshToken: string): Promise<boolean> {
    try {
      // Set the refresh token on the client
      this.oauthClient.token.setToken({
        refresh_token: refreshToken
      });

      const revokeResponse = await this.oauthClient.revoke();
      return revokeResponse && revokeResponse.status === 200;
    } catch (error) {
      console.error('Error revoking tokens:', error);
      throw new Error(`Failed to revoke tokens: ${error.message}`);
    }
  }

  /**
   * Validate if tokens are still valid
   */
  async validateTokens(accessToken: string, realmId: string): Promise<boolean> {
    try {
      // Set the token on the client
      this.oauthClient.token.setToken({
        access_token: accessToken,
        realmId: realmId
      });

      // Make a simple API call to validate
      const isValid = await this.oauthClient.isAccessTokenValid();
      return isValid;
    } catch (error) {
      console.error('Error validating tokens:', error);
      return false;
    }
  }

  /**
   * Get company information using access token
   */
  async getCompanyInfo(accessToken: string, realmId: string): Promise<any> {
    try {
      // Set the token on the client
      this.oauthClient.token.setToken({
        access_token: accessToken,
        realmId: realmId
      });

      const companyInfoResponse = await this.oauthClient.makeApiCall({
        url: `${this.config.baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`
      });

      return companyInfoResponse.json;
    } catch (error) {
      console.error('Error getting company info:', error);
      throw new Error(`Failed to get company info: ${error.message}`);
    }
  }

  /**
   * Calculate token expiration times
   */
  calculateExpirationTimes(tokens: QBTokens): {
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date;
  } {
    const now = new Date();
    
    // Access token expires in seconds (usually 3600 = 1 hour)
    const accessTokenExpiresAt = new Date(now.getTime() + (tokens.expires_in * 1000));
    
    // Refresh token expires in seconds (usually 8726400 = 101 days)
    const refreshTokenExpiresAt = new Date(now.getTime() + (tokens.refresh_token_expires_in * 1000));

    return {
      accessTokenExpiresAt,
      refreshTokenExpiresAt
    };
  }

  /**
   * Check if access token needs refresh (expires in less than 5 minutes)
   */
  needsRefresh(expiresAt: Date): boolean {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));
    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Generate a random state for OAuth flow
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get OAuth client instance (for advanced usage)
   */
  getOAuthClient(): OAuthClient {
    return this.oauthClient;
  }

  /**
   * Get configuration
   */
  getConfig(): QBOAuthConfig {
    return { ...this.config };
  }
}

// Singleton instance
let oauthService: QuickBooksOAuthService | null = null;

export function getQuickBooksOAuthService(): QuickBooksOAuthService {
  if (!oauthService) {
    oauthService = new QuickBooksOAuthService();
  }
  return oauthService;
}