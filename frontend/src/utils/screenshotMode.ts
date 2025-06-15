// Utility function to detect screenshot mode
export const isScreenshotMode = (): boolean => {
  return window.location.search.includes('screenshot=true') || 
         sessionStorage.getItem('screenshotMode') === 'true'
}

// Utility function to detect demo mode
export const isDemoMode = (): boolean => {
  return window.location.pathname.startsWith('/demo') || window.location.search.includes('demo=true')
}

// Utility function to detect any mock data mode
export const isMockDataMode = (): boolean => {
  return isScreenshotMode() || isDemoMode()
}