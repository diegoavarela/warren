export const translations = {
  es: {
    // Authentication
    'auth.login': 'Iniciar Sesión',
    'auth.signup': 'Crear Cuenta',
    'auth.logout': 'Cerrar Sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.confirmPassword': 'Confirmar contraseña',
    'auth.firstName': 'Nombre',
    'auth.lastName': 'Apellido',
    'auth.organizationName': 'Nombre de la empresa',
    'auth.signIn': 'Iniciar Sesión',
    'auth.createAccount': 'Crear Cuenta',
    'auth.alreadyHaveAccount': '¿Ya tienes cuenta?',
    'auth.dontHaveAccount': '¿No tienes cuenta?',
    'auth.welcomeMessage': 'Accede a tu cuenta de Warren',
    'auth.signupMessage': 'Comienza a usar Warren hoy',

    // Navigation
    'nav.home': 'Inicio',
    'nav.upload': 'Subir Archivo',
    'nav.mapper': 'Mapear',
    'nav.persist': 'Guardar',
    'nav.dashboard': 'Panel',

    // Common
    'common.loading': 'Cargando...',
    'common.saving': 'Guardando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.create': 'Crear',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.back': 'Volver',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.close': 'Cerrar',

    // Company Management
    'company.select': 'Selecciona una empresa',
    'company.create': 'Crear nueva empresa',
    'company.name': 'Nombre de la empresa',
    'company.taxId': 'RFC/ID Fiscal',
    'company.industry': 'Industria',
    'company.createTitle': 'Crear Nueva Empresa',

    // Financial Data
    'financial.saveData': 'Guardar Datos Financieros',
    'financial.dataSummary': 'Resumen de Datos',
    'financial.statementType': 'Tipo de Estado',
    'financial.currency': 'Moneda',
    'financial.rowsProcessed': 'Filas procesadas',
    'financial.accountsMapped': 'Cuentas mapeadas',
    'financial.saveAsTemplate': 'Guardar como plantilla para futuros mapeos',
    'financial.templateName': 'Nombre de la plantilla (opcional)',
    'financial.saveEncrypted': 'Guardar Datos Encriptados',
    'financial.dataWillBeEncrypted': 'Los datos serán encriptados antes de almacenarse en la base de datos.',

    // Statement Types
    'statementType.balanceSheet': 'Balance General',
    'statementType.profitLoss': 'Estado de Resultados',
    'statementType.cashFlow': 'Flujo de Efectivo',

    // Errors
    'error.required': 'Este campo es requerido',
    'error.invalidEmail': 'Correo electrónico inválido',
    'error.passwordTooShort': 'La contraseña debe tener al menos 8 caracteres',
    'error.passwordMismatch': 'Las contraseñas no coinciden',
    'error.loginFailed': 'Error al iniciar sesión',
    'error.signupFailed': 'Error al crear cuenta',
    'error.selectCompany': 'Por favor selecciona una empresa',
    'error.networkError': 'Error de conexión',
  },
  en: {
    // Authentication
    'auth.login': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Sign Out',
    'auth.email': 'Email address',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm password',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.organizationName': 'Organization name',
    'auth.signIn': 'Sign In',
    'auth.createAccount': 'Create Account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.welcomeMessage': 'Access your Warren account',
    'auth.signupMessage': 'Start using Warren today',

    // Navigation
    'nav.home': 'Home',
    'nav.upload': 'Upload',
    'nav.mapper': 'Mapper',
    'nav.persist': 'Save',
    'nav.dashboard': 'Dashboard',

    // Common
    'common.loading': 'Loading...',
    'common.saving': 'Saving...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.create': 'Create',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',

    // Company Management
    'company.select': 'Select a company',
    'company.create': 'Create new company',
    'company.name': 'Company name',
    'company.taxId': 'Tax ID',
    'company.industry': 'Industry',
    'company.createTitle': 'Create New Company',

    // Financial Data
    'financial.saveData': 'Save Financial Data',
    'financial.dataSummary': 'Data Summary',
    'financial.statementType': 'Statement Type',
    'financial.currency': 'Currency',
    'financial.rowsProcessed': 'Rows processed',
    'financial.accountsMapped': 'Accounts mapped',
    'financial.saveAsTemplate': 'Save as template for future mappings',
    'financial.templateName': 'Template name (optional)',
    'financial.saveEncrypted': 'Save Encrypted Data',
    'financial.dataWillBeEncrypted': 'Data will be encrypted before being stored in the database.',

    // Statement Types
    'statementType.balanceSheet': 'Balance Sheet',
    'statementType.profitLoss': 'Profit & Loss',
    'statementType.cashFlow': 'Cash Flow',

    // Errors
    'error.required': 'This field is required',
    'error.invalidEmail': 'Invalid email address',
    'error.passwordTooShort': 'Password must be at least 8 characters',
    'error.passwordMismatch': 'Passwords do not match',
    'error.loginFailed': 'Login failed',
    'error.signupFailed': 'Signup failed',
    'error.selectCompany': 'Please select a company',
    'error.networkError': 'Network error',
  }
};

export function useTranslation(locale: string = 'en-US') {
  const lang = locale?.startsWith('es') ? 'es' : 'en';
  
  const t = (key: string): string => {
    if (!key) return '';
    
    // Direct lookup in translations object
    const translation = translations[lang][key];
    
    // If found, return it
    if (translation) {
      return translation;
    }
    
    // Try fallback to English
    const fallback = translations.en[key];
    
    // Return fallback or key if nothing found
    return fallback || key;
  };

  return { t };
}