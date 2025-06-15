// Helper function to check if we're in screenshot mode
export const isScreenshotMode = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.search.includes('screenshot=true') || 
         sessionStorage.getItem('screenshotMode') === 'true'
}