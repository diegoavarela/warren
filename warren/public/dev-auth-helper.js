/**
 * Development Authentication Helper
 * 
 * Use these functions in the browser console to manage development authentication:
 * 
 * - devLogin() - Set mock authentication token
 * - devLogout() - Clear authentication token  
 * - devAuthStatus() - Check current authentication status
 * - devTestChat() - Test AI chat API access
 */

window.devAuth = {
  /**
   * Set development authentication token
   */
  async login() {
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'login' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Development authentication successful');
        console.log('👤 Mock user:', result.user);
        console.log('🔄 Please refresh the page to apply authentication');
        return result;
      } else {
        console.error('❌ Development authentication failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Development authentication error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Clear development authentication token
   */
  async logout() {
    try {
      const response = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'logout' })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Development logout successful');
        console.log('🔄 Please refresh the page to clear authentication');
        return result;
      } else {
        console.error('❌ Development logout failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Development logout error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Check current development authentication status
   */
  async status() {
    try {
      const response = await fetch('/api/auth/dev-login');
      const result = await response.json();
      
      console.log('🔍 Development authentication status:');
      console.log('  Authenticated:', result.authenticated);
      console.log('  Token:', result.token);
      console.log('  Environment:', result.environment);
      console.log('  Message:', result.message);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to check authentication status:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Test AI chat API access
   */
  async testChat(companyId = 'b1dea3ff-cac4-45cc-be78-5488e612c2a8') {
    try {
      console.log('🧪 Testing AI chat API access for company:', companyId);
      
      // Test getting data context
      const contextResponse = await fetch(`/api/v1/companies/${companyId}/financial-chat`);
      const contextResult = await contextResponse.json();
      
      console.log('📊 Data context result:', contextResult);
      
      if (contextResult.success) {
        console.log('✅ Data context loaded successfully');
        console.log('  Company:', contextResult.data.summary.companyName);
        console.log('  Data points:', contextResult.data.summary.totalDataPoints);
        console.log('  P&L statements:', contextResult.data.summary.availableStatements.pnl.length);
        
        // Test sending a query
        const queryResponse = await fetch(`/api/v1/companies/${companyId}/financial-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'query',
            query: 'What was our revenue in January?',
            options: { includeDetailedData: true }
          })
        });
        
        const queryResult = await queryResponse.json();
        console.log('💬 Chat query result:', queryResult);
        
        if (queryResult.success) {
          console.log('✅ Chat query successful');
          console.log('  Response:', queryResult.data.message);
          console.log('  Confidence:', queryResult.data.dataContext.confidence + '%');
        } else {
          console.error('❌ Chat query failed:', queryResult.error);
        }
        
        return { contextResult, queryResult };
      } else {
        console.error('❌ Data context failed:', contextResult.error);
        return { contextResult };
      }
      
    } catch (error) {
      console.error('❌ Chat API test error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Quick setup for development
   */
  async quickSetup() {
    console.log('🚀 Setting up development environment...');
    
    const loginResult = await window.devAuth.login();
    if (loginResult.success) {
      console.log('✅ Development authentication configured');
      console.log('🔄 Refreshing page in 2 seconds...');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      console.error('❌ Failed to setup development environment');
    }
    
    return loginResult;
  }
};

// Add global shortcuts
window.devLogin = window.devAuth.login.bind(window.devAuth);
window.devLogout = window.devAuth.logout.bind(window.devAuth);
window.devAuthStatus = window.devAuth.status.bind(window.devAuth);
window.devTestChat = window.devAuth.testChat.bind(window.devAuth);
window.devQuickSetup = window.devAuth.quickSetup.bind(window.devAuth);

// Auto-display help when this script loads
console.log(`
🔧 Development Authentication Helper Loaded

Available commands:
  devLogin()         - Set development authentication token
  devLogout()        - Clear authentication token
  devAuthStatus()    - Check authentication status
  devTestChat()      - Test AI chat API access
  devQuickSetup()    - Quick development setup (login + refresh)

Usage example:
  await devQuickSetup()  // Quick setup
  await devTestChat()    // Test chat functionality
`);