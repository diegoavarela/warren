export const AVAILABLE_FEATURES = [
  {
    key: 'PNL_DASHBOARD',
    name: 'P&L Dashboard',
    category: 'Analytics',
    description: 'Access to Profit & Loss financial dashboard'
  },
  {
    key: 'CASHFLOW_DASHBOARD', 
    name: 'Cash Flow Dashboard',
    category: 'Analytics', 
    description: 'Access to Cash Flow analysis dashboard'
  },
  {
    key: 'AI_CHAT',
    name: 'AI Chat',
    category: 'AI Features',
    description: 'AI-powered financial analysis and insights'
  },
  {
    key: 'EXECUTIVE_DASHBOARD',
    name: 'Executive Dashboard',
    category: 'Analytics',
    description: 'High-level executive summary dashboard'
  },
  {
    key: 'ADVANCED_ANALYTICS',
    name: 'Advanced Analytics',
    category: 'Analytics', 
    description: 'Advanced financial analytics and reporting'
  },
  {
    key: 'API_ACCESS',
    name: 'API Access',
    category: 'Integration',
    description: 'Access to Warren API for integrations'
  },
  {
    key: 'CUSTOM_REPORTS',
    name: 'Custom Reports',
    category: 'Reporting',
    description: 'Generate custom financial reports'
  },
  {
    key: 'EXPORT_DATA',
    name: 'Export Data',
    category: 'Data',
    description: 'Export financial data to various formats'
  }
];

export const TIER_CONFIGS = {
  standard: {
    name: 'standard',
    displayName: 'Standard',
    features: ['PNL_DASHBOARD', 'CASHFLOW_DASHBOARD'],
    maxUsers: 5,
    maxCompanies: 3,
    aiCreditsPerCompanyPerMonth: 0,
    priceMonthly: 49
  },
  standard_plus: {
    name: 'standard_plus', 
    displayName: 'Standard+',
    features: ['PNL_DASHBOARD', 'CASHFLOW_DASHBOARD', 'AI_CHAT'],
    maxUsers: 10,
    maxCompanies: 5,
    aiCreditsPerCompanyPerMonth: 100,
    priceMonthly: 99
  },
  advanced: {
    name: 'advanced',
    displayName: 'Advanced',
    features: ['PNL_DASHBOARD', 'CASHFLOW_DASHBOARD', 'AI_CHAT', 'EXECUTIVE_DASHBOARD', 'ADVANCED_ANALYTICS'],
    maxUsers: 25,
    maxCompanies: 10,
    aiCreditsPerCompanyPerMonth: 250,
    priceMonthly: 199
  }
};

export const INDUSTRIES = [
  { value: 'technology', labelEn: 'Technology', labelEs: 'Tecnología' },
  { value: 'finance', labelEn: 'Finance', labelEs: 'Finanzas' },
  { value: 'healthcare', labelEn: 'Healthcare', labelEs: 'Salud' },
  { value: 'retail', labelEn: 'Retail', labelEs: 'Comercio' },
  { value: 'manufacturing', labelEn: 'Manufacturing', labelEs: 'Manufactura' },
  { value: 'consulting', labelEn: 'Consulting', labelEs: 'Consultoría' },
  { value: 'other', labelEn: 'Other', labelEs: 'Otro' }
];

export const COUNTRIES = [
  { value: 'US', labelEn: 'United States', labelEs: 'Estados Unidos' },
  { value: 'CA', labelEn: 'Canada', labelEs: 'Canadá' },
  { value: 'MX', labelEn: 'Mexico', labelEs: 'México' },
  { value: 'ES', labelEn: 'Spain', labelEs: 'España' },
  { value: 'AR', labelEn: 'Argentina', labelEs: 'Argentina' },
  { value: 'CL', labelEn: 'Chile', labelEs: 'Chile' },
  { value: 'CO', labelEn: 'Colombia', labelEs: 'Colombia' },
  { value: 'PE', labelEn: 'Peru', labelEs: 'Perú' },
  { value: 'OTHER', labelEn: 'Other', labelEs: 'Otro' }
];

export const CURRENCIES = [
  { value: 'USD', labelEn: 'US Dollar ($)', labelEs: 'Dólar estadounidense ($)' },
  { value: 'CAD', labelEn: 'Canadian Dollar (CAD)', labelEs: 'Dólar canadiense (CAD)' },
  { value: 'MXN', labelEn: 'Mexican Peso (MXN)', labelEs: 'Peso mexicano (MXN)' },
  { value: 'EUR', labelEn: 'Euro (€)', labelEs: 'Euro (€)' },
  { value: 'ARS', labelEn: 'Argentine Peso (ARS)', labelEs: 'Peso argentino (ARS)' },
  { value: 'CLP', labelEn: 'Chilean Peso (CLP)', labelEs: 'Peso chileno (CLP)' },
  { value: 'COP', labelEn: 'Colombian Peso (COP)', labelEs: 'Peso colombiano (COP)' },
  { value: 'PEN', labelEn: 'Peruvian Sol (PEN)', labelEs: 'Sol peruano (PEN)' }
];

export const FISCAL_YEAR_STARTS = [
  { value: 1, labelEn: 'January', labelEs: 'Enero' },
  { value: 2, labelEn: 'February', labelEs: 'Febrero' },
  { value: 3, labelEn: 'March', labelEs: 'Marzo' },
  { value: 4, labelEn: 'April', labelEs: 'Abril' },
  { value: 5, labelEn: 'May', labelEs: 'Mayo' },
  { value: 6, labelEn: 'June', labelEs: 'Junio' },
  { value: 7, labelEn: 'July', labelEs: 'Julio' },
  { value: 8, labelEn: 'August', labelEs: 'Agosto' },
  { value: 9, labelEn: 'September', labelEs: 'Septiembre' },
  { value: 10, labelEn: 'October', labelEs: 'Octubre' },
  { value: 11, labelEn: 'November', labelEs: 'Noviembre' },
  { value: 12, labelEn: 'December', labelEs: 'Diciembre' }
];

export const LOCALES = [
  { value: 'en', labelEn: 'English', labelEs: 'Inglés' },
  { value: 'es', labelEn: 'Spanish', labelEs: 'Español' }
];

export const TIMEZONES = [
  { value: 'America/New_York', labelEn: 'Eastern Time (EST)', labelEs: 'Hora del Este (EST)' },
  { value: 'America/Chicago', labelEn: 'Central Time (CST)', labelEs: 'Hora Central (CST)' },
  { value: 'America/Denver', labelEn: 'Mountain Time (MST)', labelEs: 'Hora de Montaña (MST)' },
  { value: 'America/Los_Angeles', labelEn: 'Pacific Time (PST)', labelEs: 'Hora del Pacífico (PST)' },
  { value: 'America/Mexico_City', labelEn: 'Mexico City Time', labelEs: 'Hora de Ciudad de México' },
  { value: 'Europe/Madrid', labelEn: 'Central European Time', labelEs: 'Hora Central Europea' },
  { value: 'America/Argentina/Buenos_Aires', labelEn: 'Argentina Time', labelEs: 'Hora de Argentina' },
  { value: 'America/Santiago', labelEn: 'Chile Time', labelEs: 'Hora de Chile' },
  { value: 'America/Bogota', labelEn: 'Colombia Time', labelEs: 'Hora de Colombia' },
  { value: 'America/Lima', labelEn: 'Peru Time', labelEs: 'Hora de Perú' }
];

export const DISPLAY_UNITS = [
  { value: 'thousands', labelEn: 'Thousands (K)', labelEs: 'Miles (K)' },
  { value: 'millions', labelEn: 'Millions (M)', labelEs: 'Millones (M)' },
  { value: 'billions', labelEn: 'Billions (B)', labelEs: 'Miles de millones (B)' },
  { value: 'actual', labelEn: 'Actual Values', labelEs: 'Valores reales' }
];