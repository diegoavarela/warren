import axios from 'axios'

export function setupDebugInterceptor() {
  // Response interceptor to log all dashboard responses
  axios.interceptors.response.use(
    (response) => {
      if (response.config.url?.includes('dashboard')) {
        console.log('=== DASHBOARD RESPONSE INTERCEPTED ===')
        console.log('URL:', response.config.url)
        console.log('Status:', response.status)
        console.log('Data:', response.data)
        
        if (response.data?.data?.currentMonth?.totalIncome) {
          const income = response.data.data.currentMonth.totalIncome
          console.log('Income value:', income)
          console.log('Is 78799416.63?', Math.abs(income - 78799416.63) < 1)
          console.log('Is 61715728.02?', Math.abs(income - 61715728.02) < 1)
          
          if (Math.abs(income - 78799416.63) < 1) {
            console.error('!!! INTERCEPTOR: Wrong value detected in response !!!')
            console.error('Full response data:', JSON.stringify(response.data))
          }
        }
      }
      return response
    },
    (error) => {
      console.error('Response error:', error)
      return Promise.reject(error)
    }
  )
}