// Demo authentication service for Warren
export const DEMO_CREDENTIALS = {
  email: 'demo@warren.vortex.com',
  password: 'WarrenDemo2024!'
}

export const demoAuthService = {
  /**
   * Automatically login with demo credentials
   */
  loginWithDemoAccount: async (): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(DEMO_CREDENTIALS),
      })

      if (response.ok) {
        const data = await response.json()
        // Store the token
        localStorage.setItem('token', data.token)
        return { success: true, token: data.token }
      } else {
        // If demo account doesn't exist, try to create it
        return await this.createDemoAccount()
      }
    } catch (error) {
      console.error('Demo login failed:', error)
      return { success: false, error: 'Failed to login with demo account' }
    }
  },

  /**
   * Create demo account if it doesn't exist
   */
  createDemoAccount: async (): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      // First try to register the demo account
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...DEMO_CREDENTIALS,
          name: 'Demo User',
          company: 'Warren Demo Company'
        }),
      })

      if (registerResponse.ok) {
        // If registration successful, login
        return await this.loginWithDemoAccount()
      } else {
        // If registration fails, try login anyway (account might already exist)
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(DEMO_CREDENTIALS),
        })

        if (loginResponse.ok) {
          const data = await loginResponse.json()
          localStorage.setItem('token', data.token)
          return { success: true, token: data.token }
        }
      }

      return { success: false, error: 'Could not create or access demo account' }
    } catch (error) {
      console.error('Demo account creation failed:', error)
      return { success: false, error: 'Failed to create demo account' }
    }
  },

  /**
   * Check if user is using demo account
   */
  isDemoUser: (): boolean => {
    // This could be enhanced to check the actual user data
    const token = localStorage.getItem('token')
    return !!token // Simple check for now
  }
}