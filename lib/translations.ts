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
    
    // Help System
    'help.tooltip': 'Ayuda',
    'help.button.aria': 'Abrir ayuda',
    'help.general.title': 'Ayuda',
    'help.general.content': 'Bienvenido al sistema de ayuda de Warren. Aquí encontrarás información sobre cómo usar la plataforma.',
    'help.relatedTopics': 'Temas relacionados',
    'help.shortcuts.escape': 'Presiona ESC para cerrar',
    
    // Help Categories
    'help.category.general': 'General',
    'help.category.dashboard': 'Dashboard',
    'help.category.financial': 'Datos Financieros',
    'help.category.upload': 'Carga de Archivos',
    'help.category.navigation': 'Navegación',
    
    // Dashboard Help Topics
    'help.dashboard.ytd.title': 'Resumen YTD (Año hasta la fecha)',
    'help.dashboard.ytd.content': '<p>El resumen YTD muestra los datos acumulados desde el inicio del año fiscal hasta el período actual.</p><ul><li><strong>Ingresos YTD</strong>: Total de ingresos acumulados</li><li><strong>Margen Bruto</strong>: Porcentaje de utilidad después de costos directos</li><li><strong>Margen Operacional</strong>: Porcentaje después de gastos operativos</li><li><strong>Margen Neto</strong>: Porcentaje de utilidad final</li></ul>',
    
    'help.dashboard.revenue.title': 'Análisis de Ingresos',
    'help.dashboard.revenue.content': '<p>Esta sección desglosa tus fuentes de ingresos por categorías.</p><p>Puedes ver:</p><ul><li>Monto total por categoría</li><li>Porcentaje de contribución</li><li>Tendencia vs período anterior</li></ul>',
    
    'help.dashboard.costs.title': 'Estructura de Costos',
    'help.dashboard.costs.content': '<p>Analiza la composición de tus costos de ventas (COGS).</p><p>Incluye:</p><ul><li>Costos directos de producción</li><li>Materiales</li><li>Mano de obra directa</li><li>Otros costos variables</li></ul>',
    
    'help.dashboard.profitability.title': 'Métricas de Rentabilidad',
    'help.dashboard.profitability.content': '<p>Indicadores clave de rentabilidad:</p><ul><li><strong>Utilidad Bruta</strong>: Ingresos - Costos directos</li><li><strong>Utilidad Operacional</strong>: Después de gastos operativos</li><li><strong>EBITDA</strong>: Ganancias antes de intereses, impuestos, depreciación y amortización</li><li><strong>Utilidad Neta</strong>: Ganancia final después de todos los gastos</li></ul>',
    
    'help.dashboard.heatmap.title': 'Mapas de Calor',
    'help.dashboard.heatmap.content': '<p>Los mapas de calor visualizan patrones en tus datos:</p><ul><li>Colores más intensos indican valores más altos</li><li>Haz clic en cualquier período para excluirlo del análisis</li><li>El mapa se recalcula automáticamente</li></ul>',
    
    'help.dashboard.currency.title': 'Conversión de Moneda',
    'help.dashboard.currency.content': '<p>Puedes ver tus datos en diferentes monedas:</p><ul><li>Selecciona la moneda del menú desplegable</li><li>Los valores se convierten usando tasas actuales</li><li>Puedes editar las tasas de cambio si es necesario</li></ul>',
    
    'help.dashboard.units.title': 'Unidades de Visualización',
    'help.dashboard.units.content': '<p>Ajusta las unidades para mejor legibilidad:</p><ul><li><strong>Normal</strong>: Valores completos</li><li><strong>K</strong>: Miles (divide entre 1,000)</li><li><strong>M</strong>: Millones (divide entre 1,000,000)</li></ul>',
    
    // Upload Help Topics
    'help.upload.template.title': 'Selección de Plantilla',
    'help.upload.template.content': '<p>Las plantillas aceleran el proceso de mapeo:</p><ul><li>Selecciona una plantilla existente para aplicar mapeos automáticamente</li><li>Las plantillas son compartidas entre todas las empresas de tu organización</li><li>Puedes crear nuevas plantillas al guardar tu mapeo</li></ul>',
    
    'help.upload.mapping.title': 'Mapeo Visual',
    'help.upload.mapping.content': '<p>El mapeo visual te permite:</p><ul><li><strong>Análisis IA</strong>: Detección automática de estructura</li><li><strong>Mapeo Manual</strong>: Selección manual de columnas</li><li>Identificar columnas de conceptos y períodos</li><li>Definir el rango de datos</li></ul>',
    
    'help.upload.classification.title': 'Clasificación de Cuentas',
    'help.upload.classification.content': '<p>Cada cuenta debe clasificarse correctamente:</p><ul><li>La IA sugiere categorías automáticamente</li><li>Puedes ajustar manualmente si es necesario</li><li>Define si es entrada o salida de efectivo</li></ul>',
    
    // Advanced Visual Mapper Help
    'help.mapper.aiAnalysis.title': 'Análisis por IA',
    'help.mapper.aiAnalysis.content': '<p>El análisis por IA examina automáticamente tu archivo:</p><ul><li><strong>Detecta</strong> el tipo de estado financiero</li><li><strong>Identifica</strong> columnas de conceptos y períodos</li><li><strong>Clasifica</strong> cuentas automáticamente</li><li><strong>Sugiere</strong> categorías contables</li></ul><p>Recomendado para acelerar el proceso de mapeo.</p>',
    'help.mapper.manualMapping.title': 'Mapeo Manual',
    'help.mapper.manualMapping.content': '<p>El mapeo manual te permite control total:</p><ul><li><strong>Selecciona</strong> manualmente las columnas</li><li><strong>Define</strong> el rango de datos</li><li><strong>Configura</strong> períodos específicos</li><li><strong>Personaliza</strong> la clasificación</li></ul><p>Ideal cuando tienes formatos específicos o necesitas mayor control.</p>',
    'help.mapper.dataRange.title': 'Selección de Datos',
    'help.mapper.dataRange.content': '<p>Define exactamente qué datos procesar:</p><ul><li><strong>Fila inicial</strong>: Donde empiezan los datos</li><li><strong>Fila final</strong>: Donde terminan los datos</li><li><strong>Auto-detección</strong>: El sistema detecta automáticamente</li><li><strong>Filtrado</strong>: Se excluyen filas vacías</li></ul>',
    'help.mapper.classification.title': 'Clasificación Contable',
    'help.mapper.classification.content': '<p>Cada cuenta necesita una categoría contable:</p><ul><li><strong>Ingresos</strong>: Ventas, servicios, otros ingresos</li><li><strong>Costos</strong>: Costo de ventas, materiales</li><li><strong>Gastos</strong>: Operacionales, administrativos</li><li><strong>Flujo</strong>: Entrada (+) o salida (-) de efectivo</li></ul><p>La IA sugiere categorías que puedes ajustar manualmente.</p>',
    
    // P&L Dashboard
    'dashboard.pnl.title': 'Estado de Resultados (P&L)',
    'dashboard.pnl.subtitle': 'Análisis completo de ingresos, costos y rentabilidad',
    'dashboard.pnl.viewCashFlow': 'Ver Flujo de Caja',
    'dashboard.pnl.period': 'Período',
    'dashboard.pnl.compareWith': 'Comparar con',
    'dashboard.pnl.currency': 'Moneda',
    'dashboard.pnl.units': 'Unidades',
    'dashboard.pnl.normal': 'Normal',
    'dashboard.pnl.thousands': 'Miles (K)',
    'dashboard.pnl.millions': 'Millones (M)',
    'dashboard.pnl.ytdSummary': 'Resumen Año a la Fecha (YTD)',
    'dashboard.pnl.executiveMetrics': 'Métricas Ejecutivas',
    'dashboard.pnl.executiveMetricsSubtitle': 'Indicadores clave de rendimiento financiero',
    'dashboard.pnl.revenueSection': 'Ingresos',
    'dashboard.pnl.costsSection': 'Estructura de Costos',
    'dashboard.pnl.profitabilitySection': 'Métricas de Rentabilidad',
    'dashboard.pnl.operatingExpensesAnalysis': 'Análisis de Gastos Operacionales',
    'dashboard.pnl.trendsAnalysis': 'Análisis y Tendencias',
    'dashboard.pnl.bankSummary': 'Resumen Bancario',
    'dashboard.pnl.investmentPortfolio': 'Portafolio de Inversiones',
    'dashboard.pnl.costEfficiencyAnalysis': 'Análisis de Eficiencia de Costos',
    'dashboard.pnl.previousPeriod': 'Período anterior',
    'dashboard.pnl.yearAgo': 'Mismo período año anterior',
    'dashboard.pnl.noComparison': 'Sin comparación',
    'dashboard.pnl.exchangeRatesEditor': 'Editar tasas de cambio',
    'dashboard.pnl.exchangeRatesTitle': 'Tasas de Cambio (1 USD =)',
    'dashboard.pnl.save': 'Guardar',
    'dashboard.pnl.resetToMarket': 'Restablecer a tasa de mercado',
    'dashboard.pnl.resetAllRates': 'Restablecer todas las tasas',
    
    // Metric Cards
    'metrics.totalRevenue': 'Ingresos Totales',
    'metrics.growthVsPrevious': 'Crecimiento vs Anterior',
    'metrics.monthlyProjection': 'Proyección Mensual',
    'metrics.percentageOfTarget': '% del Objetivo',
    'metrics.costOfGoodsSold': 'Costo de Ventas (COGS)',
    'metrics.operatingExpenses': 'Gastos Operacionales',
    'metrics.cogsPercentage': '% COGS sobre Ingresos',
    'metrics.opexPercentage': '% OpEx sobre Ingresos',
    'metrics.grossProfit': 'Utilidad Bruta',
    'metrics.operatingIncome': 'Utilidad Operacional',
    'metrics.ebitda': 'EBITDA',
    'metrics.netIncome': 'Utilidad Neta',
    'metrics.margin': 'Margen',
    'metrics.ytd': 'YTD',
    'metrics.basedOnTrend': 'Basado en tendencia',
    'metrics.target': 'Meta',
    'metrics.opexBreakdown': 'Desglose de OpEx',
    'metrics.detailedBreakdown': 'Desglose Detallado',
    
    // Executive KPIs
    'kpi.cashPosition': 'Posición de Efectivo',
    'kpi.estimatedLiquidity': 'Liquidez estimada',
    'kpi.revenueGrowth': 'Crecimiento de Ingresos',
    'kpi.yearToDate': 'Año a la fecha',
    'kpi.cashRunway': 'Runway de Efectivo',
    'kpi.monthsRemaining': 'Meses restantes',
    'kpi.cashFlow': 'Flujo de Efectivo',
    'kpi.currentMonth': 'Mes actual',
    
    // YTD Section
    'ytd.revenueYtd': 'Ingresos YTD',
    'ytd.expensesYtd': 'Gastos YTD',
    'ytd.netIncomeYtd': 'Utilidad Neta YTD',
    'ytd.grossMargin': 'Margen Bruto',
    'ytd.operatingMargin': 'Margen Operacional',
    'ytd.ebitdaMargin': 'Margen EBITDA',
    'ytd.netMargin': 'Margen Neto',
    'ytd.monthsIncluded': 'Meses Incluidos',
    
    // Charts and Heatmaps
    'charts.revenueForecast': 'Forecast de Ingresos',
    'charts.netIncomeForecast': 'Forecast de Utilidad Neta',
    'charts.nextSixMonths': 'Próximos 6 meses - Escenarios',
    'charts.marginTrend': 'Tendencia de Márgenes',
    'charts.financialSummary': 'Resumen Financiero',
    'charts.lastTwelveMonths': 'Últimos 12 meses',
    'charts.lastSixMonths': 'Últimos 6 meses',
    'heatmap.revenue': 'Heatmap de Ingresos',
    'heatmap.netMargin': 'Heatmap de Margen Neto',
    'heatmap.monthlyPerformance': 'Performance mensual',
    'heatmap.clickToExclude': 'Click para excluir meses',
    
    // Tax and Efficiency
    'tax.summary': 'Resumen de Impuestos',
    'tax.periodTaxes': 'Impuestos del período',
    'tax.effectiveRate': 'Tasa efectiva',
    'tax.ytdTaxes': 'Impuestos YTD',
    'efficiency.title': 'Eficiencia de Costos',
    'efficiency.costPerRevenue': 'Costo por peso de ingreso',
    'efficiency.optimal': 'Óptimo',
    'efficiency.operationalRoi': 'ROI Operacional',
    'efficiency.revenuePerDollarCost': 'Revenue por $ de Costo',
    'efficiency.efficiencyMargin': 'Margen de Eficiencia',
    'efficiency.revenuePerEmployee': 'Revenue por Empleado',
    'efficiency.opexVariation': 'Variación OpEx',
    
    // Banking and Investments
    'bank.mainAccount': 'Cuenta Principal',
    'bank.savingsAccount': 'Cuenta de Ahorro',
    'bank.investments': 'Inversiones',
    'bank.totalAvailable': 'Total Disponible',
    'investments.governmentBonds': 'Bonos Gubernamentales',
    'investments.mutualFunds': 'Fondos de Inversión',
    'investments.stocks': 'Acciones',
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
    
    // Help System
    'help.tooltip': 'Help',
    'help.button.aria': 'Open help',
    'help.general.title': 'Help',
    'help.general.content': 'Welcome to Warren help system. Here you will find information on how to use the platform.',
    'help.relatedTopics': 'Related topics',
    'help.shortcuts.escape': 'Press ESC to close',
    
    // Help Categories
    'help.category.general': 'General',
    'help.category.dashboard': 'Dashboard',
    'help.category.financial': 'Financial Data',
    'help.category.upload': 'File Upload',
    'help.category.navigation': 'Navigation',
    
    // Dashboard Help Topics
    'help.dashboard.ytd.title': 'YTD Summary (Year to Date)',
    'help.dashboard.ytd.content': '<p>The YTD summary shows accumulated data from the beginning of the fiscal year to the current period.</p><ul><li><strong>YTD Revenue</strong>: Total accumulated revenue</li><li><strong>Gross Margin</strong>: Profit percentage after direct costs</li><li><strong>Operating Margin</strong>: Percentage after operating expenses</li><li><strong>Net Margin</strong>: Final profit percentage</li></ul>',
    
    'help.dashboard.revenue.title': 'Revenue Analysis',
    'help.dashboard.revenue.content': '<p>This section breaks down your revenue sources by categories.</p><p>You can see:</p><ul><li>Total amount by category</li><li>Contribution percentage</li><li>Trend vs previous period</li></ul>',
    
    'help.dashboard.costs.title': 'Cost Structure',
    'help.dashboard.costs.content': '<p>Analyze the composition of your cost of goods sold (COGS).</p><p>Includes:</p><ul><li>Direct production costs</li><li>Materials</li><li>Direct labor</li><li>Other variable costs</li></ul>',
    
    'help.dashboard.profitability.title': 'Profitability Metrics',
    'help.dashboard.profitability.content': '<p>Key profitability indicators:</p><ul><li><strong>Gross Profit</strong>: Revenue - Direct costs</li><li><strong>Operating Profit</strong>: After operating expenses</li><li><strong>EBITDA</strong>: Earnings before interest, taxes, depreciation and amortization</li><li><strong>Net Profit</strong>: Final profit after all expenses</li></ul>',
    
    'help.dashboard.heatmap.title': 'Heat Maps',
    'help.dashboard.heatmap.content': '<p>Heat maps visualize patterns in your data:</p><ul><li>More intense colors indicate higher values</li><li>Click on any period to exclude it from analysis</li><li>The map recalculates automatically</li></ul>',
    
    'help.dashboard.currency.title': 'Currency Conversion',
    'help.dashboard.currency.content': '<p>You can view your data in different currencies:</p><ul><li>Select currency from dropdown menu</li><li>Values are converted using current rates</li><li>You can edit exchange rates if needed</li></ul>',
    
    'help.dashboard.units.title': 'Display Units',
    'help.dashboard.units.content': '<p>Adjust units for better readability:</p><ul><li><strong>Normal</strong>: Full values</li><li><strong>K</strong>: Thousands (divide by 1,000)</li><li><strong>M</strong>: Millions (divide by 1,000,000)</li></ul>',
    
    // Upload Help Topics
    'help.upload.template.title': 'Template Selection',
    'help.upload.template.content': '<p>Templates speed up the mapping process:</p><ul><li>Select an existing template to apply mappings automatically</li><li>Templates are shared across all companies in your organization</li><li>You can create new templates when saving your mapping</li></ul>',
    
    'help.upload.mapping.title': 'Visual Mapping',
    'help.upload.mapping.content': '<p>Visual mapping allows you to:</p><ul><li><strong>AI Analysis</strong>: Automatic structure detection</li><li><strong>Manual Mapping</strong>: Manual column selection</li><li>Identify concept and period columns</li><li>Define data range</li></ul>',
    
    'help.upload.classification.title': 'Account Classification',
    'help.upload.classification.content': '<p>Each account must be classified correctly:</p><ul><li>AI suggests categories automatically</li><li>You can adjust manually if needed</li><li>Define if it\'s cash inflow or outflow</li></ul>',
    
    // Advanced Visual Mapper Help
    'help.mapper.aiAnalysis.title': 'AI Analysis',
    'help.mapper.aiAnalysis.content': '<p>AI analysis automatically examines your file:</p><ul><li><strong>Detects</strong> financial statement type</li><li><strong>Identifies</strong> concept and period columns</li><li><strong>Classifies</strong> accounts automatically</li><li><strong>Suggests</strong> accounting categories</li></ul><p>Recommended to speed up the mapping process.</p>',
    'help.mapper.manualMapping.title': 'Manual Mapping',
    'help.mapper.manualMapping.content': '<p>Manual mapping gives you full control:</p><ul><li><strong>Select</strong> columns manually</li><li><strong>Define</strong> data range</li><li><strong>Configure</strong> specific periods</li><li><strong>Customize</strong> classification</li></ul><p>Ideal when you have specific formats or need more control.</p>',
    'help.mapper.dataRange.title': 'Data Selection',
    'help.mapper.dataRange.content': '<p>Define exactly which data to process:</p><ul><li><strong>Start row</strong>: Where data begins</li><li><strong>End row</strong>: Where data ends</li><li><strong>Auto-detection</strong>: System detects automatically</li><li><strong>Filtering</strong>: Empty rows are excluded</li></ul>',
    'help.mapper.classification.title': 'Accounting Classification',
    'help.mapper.classification.content': '<p>Each account needs an accounting category:</p><ul><li><strong>Revenue</strong>: Sales, services, other income</li><li><strong>Costs</strong>: Cost of sales, materials</li><li><strong>Expenses</strong>: Operating, administrative</li><li><strong>Flow</strong>: Cash inflow (+) or outflow (-)</li></ul><p>AI suggests categories that you can adjust manually.</p>',
    
    // P&L Dashboard
    'dashboard.pnl.title': 'Profit & Loss Statement',
    'dashboard.pnl.subtitle': 'Comprehensive analysis of revenue, costs, and profitability',
    'dashboard.pnl.viewCashFlow': 'View Cash Flow',
    'dashboard.pnl.period': 'Period',
    'dashboard.pnl.compareWith': 'Compare with',
    'dashboard.pnl.currency': 'Currency',
    'dashboard.pnl.units': 'Units',
    'dashboard.pnl.normal': 'Normal',
    'dashboard.pnl.thousands': 'Thousands (K)',
    'dashboard.pnl.millions': 'Millions (M)',
    'dashboard.pnl.ytdSummary': 'Year to Date (YTD) Summary',
    'dashboard.pnl.executiveMetrics': 'Executive Metrics',
    'dashboard.pnl.executiveMetricsSubtitle': 'Key financial performance indicators',
    'dashboard.pnl.revenueSection': 'Revenue',
    'dashboard.pnl.costsSection': 'Cost Structure',
    'dashboard.pnl.profitabilitySection': 'Profitability Metrics',
    'dashboard.pnl.operatingExpensesAnalysis': 'Operating Expenses Analysis',
    'dashboard.pnl.trendsAnalysis': 'Analysis and Trends',
    'dashboard.pnl.bankSummary': 'Bank Summary',
    'dashboard.pnl.investmentPortfolio': 'Investment Portfolio',
    'dashboard.pnl.costEfficiencyAnalysis': 'Cost Efficiency Analysis',
    'dashboard.pnl.previousPeriod': 'Previous period',
    'dashboard.pnl.yearAgo': 'Same period last year',
    'dashboard.pnl.noComparison': 'No comparison',
    'dashboard.pnl.exchangeRatesEditor': 'Edit exchange rates',
    'dashboard.pnl.exchangeRatesTitle': 'Exchange Rates (1 USD =)',
    'dashboard.pnl.save': 'Save',
    'dashboard.pnl.resetToMarket': 'Reset to market rate',
    'dashboard.pnl.resetAllRates': 'Reset all rates',
    
    // Metric Cards
    'metrics.totalRevenue': 'Total Revenue',
    'metrics.growthVsPrevious': 'Growth vs Previous',
    'metrics.monthlyProjection': 'Monthly Projection',
    'metrics.percentageOfTarget': '% of Target',
    'metrics.costOfGoodsSold': 'Cost of Goods Sold (COGS)',
    'metrics.operatingExpenses': 'Operating Expenses',
    'metrics.cogsPercentage': '% COGS of Revenue',
    'metrics.opexPercentage': '% OpEx of Revenue',
    'metrics.grossProfit': 'Gross Profit',
    'metrics.operatingIncome': 'Operating Income',
    'metrics.ebitda': 'EBITDA',
    'metrics.netIncome': 'Net Income',
    'metrics.margin': 'Margin',
    'metrics.ytd': 'YTD',
    'metrics.basedOnTrend': 'Based on trend',
    'metrics.target': 'Target',
    'metrics.opexBreakdown': 'OpEx Breakdown',
    'metrics.detailedBreakdown': 'Detailed Breakdown',
    
    // Executive KPIs
    'kpi.cashPosition': 'Cash Position',
    'kpi.estimatedLiquidity': 'Estimated liquidity',
    'kpi.revenueGrowth': 'Revenue Growth',
    'kpi.yearToDate': 'Year to date',
    'kpi.cashRunway': 'Cash Runway',
    'kpi.monthsRemaining': 'Months remaining',
    'kpi.cashFlow': 'Cash Flow',
    'kpi.currentMonth': 'Current month',
    
    // YTD Section
    'ytd.revenueYtd': 'YTD Revenue',
    'ytd.expensesYtd': 'YTD Expenses',
    'ytd.netIncomeYtd': 'YTD Net Income',
    'ytd.grossMargin': 'Gross Margin',
    'ytd.operatingMargin': 'Operating Margin',
    'ytd.ebitdaMargin': 'EBITDA Margin',
    'ytd.netMargin': 'Net Margin',
    'ytd.monthsIncluded': 'Months Included',
    
    // Charts and Heatmaps
    'charts.revenueForecast': 'Revenue Forecast',
    'charts.netIncomeForecast': 'Net Income Forecast',
    'charts.nextSixMonths': 'Next 6 months - Scenarios',
    'charts.marginTrend': 'Margin Trend',
    'charts.financialSummary': 'Financial Summary',
    'charts.lastTwelveMonths': 'Last 12 months',
    'charts.lastSixMonths': 'Last 6 months',
    'heatmap.revenue': 'Revenue Heatmap',
    'heatmap.netMargin': 'Net Margin Heatmap',
    'heatmap.monthlyPerformance': 'Monthly performance',
    'heatmap.clickToExclude': 'Click to exclude months',
    
    // Tax and Efficiency
    'tax.summary': 'Tax Summary',
    'tax.periodTaxes': 'Period taxes',
    'tax.effectiveRate': 'Effective rate',
    'tax.ytdTaxes': 'YTD Taxes',
    'efficiency.title': 'Cost Efficiency',
    'efficiency.costPerRevenue': 'Cost per revenue dollar',
    'efficiency.optimal': 'Optimal',
    'efficiency.operationalRoi': 'Operational ROI',
    'efficiency.revenuePerDollarCost': 'Revenue per $ Cost',
    'efficiency.efficiencyMargin': 'Efficiency Margin',
    'efficiency.revenuePerEmployee': 'Revenue per Employee',
    'efficiency.opexVariation': 'OpEx Variation',
    
    // Banking and Investments
    'bank.mainAccount': 'Main Account',
    'bank.savingsAccount': 'Savings Account',
    'bank.investments': 'Investments',
    'bank.totalAvailable': 'Total Available',
    'investments.governmentBonds': 'Government Bonds',
    'investments.mutualFunds': 'Mutual Funds',
    'investments.stocks': 'Stocks',
  }
};

export function useTranslation(locale: string = 'en-US') {
  const lang = locale?.startsWith('es') ? 'es' : 'en';
  
  const t = (key: string): string => {
    if (!key) return '';
    
    // Direct lookup in translations object
    const translation = (translations[lang] as any)[key];
    
    // If found, return it
    if (translation) {
      return translation;
    }
    
    // Try fallback to English
    const fallback = (translations.en as any)[key];
    
    // Return fallback or key if nothing found
    return fallback || key;
  };

  return { t };
}