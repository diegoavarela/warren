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
    'dashboard.pnl.ytdSection': 'Resumen Año a la Fecha (YTD)',
    
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
    'metrics.ytdRevenue': 'Ingresos YTD',
    'metrics.ytdExpenses': 'Gastos YTD',
    'metrics.ytdNetIncome': 'Utilidad Neta YTD',
    'metrics.ytdEbitda': 'EBITDA YTD',
    'metrics.months': 'meses',
    'metrics.cogsBreakdown': 'Desglose de COGS',
    'metrics.noBreakdownAvailable': 'Sin desglose disponible',
    'metrics.industry': 'Industria',
    'metrics.efficient': 'Eficiente',
    'metrics.ofCOGS': 'de COGS',
    'metrics.ofRevenue': 'de Ingresos',
    'metrics.ofOpEx': 'de OpEx',
    'metrics.previous': 'Anterior',
    
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
    'charts.grossMargin': 'Margen Bruto',
    'charts.operatingMargin': 'Margen Operativo',
    'charts.netMargin': 'Margen Neto',
    'charts.revenue': 'Ingresos',
    'charts.expenses': 'Gastos',
    'charts.netIncome': 'Utilidad Neta',
    'charts.monthsOfData': 'meses de datos',
    'charts.last': 'Últimos',
    'charts.months': 'meses',
    
    // Forecast translations
    'forecast.methodology': 'Metodología',
    'forecast.revenueExplanation': 'Proyección basada en tendencia histórica con crecimiento mensual del 5%. Los escenarios optimista y pesimista aplican variaciones del ±20%.',
    'forecast.netIncomeExplanation': 'Proyección basada en márgenes históricos y economías de escala esperadas.',
    'forecast.assumptions': 'Supuestos clave',
    'forecast.maintainMargins': 'Se mantienen márgenes operativos actuales',
    'forecast.scaleEconomies': 'Se esperan economías de escala con el crecimiento',
    'forecast.actual': 'Real',
    'forecast.optimistic': 'Optimista',
    'forecast.pessimistic': 'Pesimista',
    'forecast.trend': 'Tendencia',
    
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
    'efficiency.forEvery': 'Por cada',
    'efficiency.spent': 'gastado',
    'efficiency.generated': 'generado',
    'efficiency.retained': 'retenido',
    'efficiency.cogsToRevenue': 'COGS / Revenue',
    'efficiency.target': 'Objetivo',
    
    // Banking and Investments
    'bank.mainAccount': 'Cuenta Principal',
    'bank.savingsAccount': 'Cuenta de Ahorro',
    'bank.investments': 'Inversiones',
    'bank.totalAvailable': 'Total Disponible',
    'investments.governmentBonds': 'Bonos Gubernamentales',
    'investments.mutualFunds': 'Fondos de Inversión',
    'investments.stocks': 'Acciones',
    
    // Metric Help Topics
    'help.metrics.totalRevenue.title': 'Ingresos Totales',
    'help.metrics.totalRevenue.content': '<p>Los <strong>Ingresos Totales</strong> representan todas las entradas de dinero de tu negocio durante el período seleccionado.</p><h4>Análisis de tu situación actual:</h4><ul><li>Ingresos actuales: <strong>{currentValue}</strong></li><li>Comparación con período anterior: <strong>{changePercent}%</strong></li><li>Acumulado YTD: <strong>{ytdValue}</strong></li></ul><h4>Comparación con benchmarks del sector:</h4><ul><li>Promedio industria: <strong>{benchmarks.industry}</strong></li><li>Top performers: <strong>{benchmarks.topPerformers}</strong></li><li>Promedio general: <strong>{benchmarks.average}</strong></li></ul><h4>Recomendaciones:</h4><p>Para aumentar los ingresos, considera:</p><ul><li>Expandir tu base de clientes</li><li>Aumentar el ticket promedio</li><li>Mejorar la retención de clientes</li><li>Lanzar nuevos productos/servicios</li></ul>',
    
    'help.metrics.growthVsPrevious.title': 'Crecimiento vs Período Anterior',
    'help.metrics.growthVsPrevious.content': '<p>Este indicador muestra el <strong>porcentaje de cambio</strong> en tus ingresos comparado con el período anterior.</p><h4>Tu crecimiento actual: <strong>{currentValue}%</strong></h4><p>Un crecimiento positivo indica expansión del negocio, mientras que uno negativo sugiere contracción.</p><h4>Factores que afectan el crecimiento:</h4><ul><li>Estacionalidad del negocio</li><li>Condiciones del mercado</li><li>Estrategias de ventas</li><li>Competencia</li></ul><h4>Metas de crecimiento saludable:</h4><ul><li>Startups: 20-50% mensual</li><li>Empresas en crecimiento: 10-20% mensual</li><li>Empresas maduras: 5-10% mensual</li></ul>',
    
    'help.metrics.monthlyProjection.title': 'Proyección Mensual',
    'help.metrics.monthlyProjection.content': '<p>La <strong>Proyección Mensual</strong> estima tus ingresos futuros basándose en tendencias actuales y datos históricos.</p><h4>Proyección actual: <strong>{currentValue}</strong></h4><h4>Escenarios de proyección:</h4><ul><li>Conservador (2% crecimiento): <strong>{benchmarks.conservative}</strong></li><li>Moderado (5% crecimiento): <strong>{benchmarks.moderate}</strong></li><li>Agresivo (10% crecimiento): <strong>{benchmarks.aggressive}</strong></li></ul><h4>Factores a considerar:</h4><ul><li>Tendencias históricas</li><li>Pipeline de ventas</li><li>Estacionalidad</li><li>Condiciones económicas</li></ul><p><em>Nota: Las proyecciones son estimaciones y pueden variar según múltiples factores.</em></p>',
    
    'help.metrics.percentageOfTarget.title': 'Porcentaje del Objetivo',
    'help.metrics.percentageOfTarget.content': '<p>Muestra qué tan cerca estás de alcanzar tu <strong>meta de ingresos</strong> para el período.</p><h4>Progreso actual: <strong>{currentValue}%</strong></h4><h4>Niveles de cumplimiento:</h4><ul><li>Meta mínima (80%): <strong>{benchmarks.minimum}%</strong></li><li>Meta objetivo (100%): <strong>{benchmarks.target}%</strong></li><li>Meta stretch (110%): <strong>{benchmarks.stretch}%</strong></li></ul><h4>Estrategias para alcanzar la meta:</h4><ul><li>Acelerar el cierre de ventas pendientes</li><li>Implementar promociones estratégicas</li><li>Mejorar la conversión de leads</li><li>Upselling a clientes existentes</li></ul>',
    
    'help.metrics.cogs.title': 'Costo de Ventas (COGS)',
    'help.metrics.cogs.content': '<p>El <strong>Costo de Ventas</strong> incluye todos los costos directos asociados con la producción o entrega de tus productos/servicios.</p><h4>COGS actual: <strong>{currentValue}</strong></h4><h4>Cambio vs período anterior: <strong>{changePercent}%</strong></h4><h4>Benchmarks del sector (% de ingresos):</h4><ul><li>Eficiente: <strong>30%</strong></li><li>Promedio industria: <strong>35%</strong></li><li>Por mejorar: <strong>40%</strong></li></ul><h4>Componentes típicos del COGS:</h4><ul><li>Materias primas</li><li>Mano de obra directa</li><li>Costos de producción</li><li>Envío y logística directa</li></ul><h4>Estrategias para optimizar:</h4><ul><li>Negociar mejores precios con proveedores</li><li>Mejorar eficiencia operacional</li><li>Reducir desperdicios</li><li>Automatizar procesos</li></ul>',
    
    'help.metrics.operatingExpenses.title': 'Gastos Operacionales',
    'help.metrics.operatingExpenses.content': '<p>Los <strong>Gastos Operacionales</strong> son todos los costos necesarios para mantener el negocio funcionando, excluyendo COGS.</p><h4>OpEx actual: <strong>{currentValue}</strong></h4><h4>Cambio vs período anterior: <strong>{changePercent}%</strong></h4><h4>Benchmarks del sector (% de ingresos):</h4><ul><li>Eficiente: <strong>15%</strong></li><li>Promedio: <strong>20%</strong></li><li>Alto: <strong>25%</strong></li></ul><h4>Categorías principales:</h4><ul><li>Salarios administrativos</li><li>Marketing y ventas</li><li>Tecnología y software</li><li>Oficina y servicios</li></ul><h4>Oportunidades de optimización:</h4><ul><li>Revisar suscripciones no utilizadas</li><li>Renegociar contratos</li><li>Automatizar procesos administrativos</li><li>Optimizar gastos de marketing</li></ul>',
    
    'help.metrics.cogsPercentage.title': 'COGS como % de Ingresos',
    'help.metrics.cogsPercentage.content': '<p>Este ratio muestra qué porcentaje de tus ingresos se destina a <strong>costos directos</strong>.</p><h4>Ratio actual: <strong>{currentValue}%</strong></h4><h4>Interpretación por nivel:</h4><ul><li><strong>Excelente (< 30%)</strong>: Márgenes muy saludables</li><li><strong>Bueno (30-35%)</strong>: Bien optimizado</li><li><strong>Promedio (35-40%)</strong>: Espacio para mejorar</li><li><strong>Preocupante (> 45%)</strong>: Requiere atención urgente</li></ul><h4>Impacto en el negocio:</h4><p>Un COGS más bajo significa mayor margen bruto disponible para cubrir gastos operacionales y generar utilidad.</p>',
    
    'help.metrics.opexPercentage.title': 'OpEx como % de Ingresos',
    'help.metrics.opexPercentage.content': '<p>Muestra qué porcentaje de tus ingresos se destina a <strong>gastos operacionales</strong>.</p><h4>Ratio actual: <strong>{currentValue}%</strong></h4><h4>Niveles de eficiencia:</h4><ul><li><strong>Excelente (< 15%)</strong>: Muy eficiente</li><li><strong>Bueno (15-20%)</strong>: Bien controlado</li><li><strong>Promedio (20-25%)</strong>: Normal para el sector</li><li><strong>Alto (> 30%)</strong>: Revisar gastos urgentemente</li></ul><h4>Áreas de enfoque:</h4><p>Si el ratio es alto, revisa especialmente:</p><ul><li>Gastos de personal no productivo</li><li>Costos de marketing vs ROI</li><li>Gastos generales y administrativos</li></ul>',
    
    'help.metrics.grossProfit.title': 'Utilidad Bruta',
    'help.metrics.grossProfit.content': '<p>La <strong>Utilidad Bruta</strong> es lo que queda después de restar el costo de ventas de los ingresos totales.</p><h4>Utilidad Bruta actual: <strong>{currentValue}</strong></h4><h4>Margen Bruto: <strong>{margin}%</strong></h4><h4>Benchmarks de Margen Bruto:</h4><ul><li>Excelente: > 70%</li><li>Bueno: 60-70%</li><li>Promedio: 50-60%</li><li>Bajo: < 40%</li></ul><h4>Importancia:</h4><p>La utilidad bruta debe ser suficiente para:</p><ul><li>Cubrir todos los gastos operacionales</li><li>Pagar impuestos</li><li>Generar utilidad neta</li><li>Reinvertir en el negocio</li></ul>',
    
    'help.metrics.operatingIncome.title': 'Utilidad Operacional',
    'help.metrics.operatingIncome.content': '<p>La <strong>Utilidad Operacional</strong> muestra la rentabilidad de las operaciones principales del negocio.</p><h4>Utilidad Operacional actual: <strong>{currentValue}</strong></h4><h4>Margen Operacional: <strong>{margin}%</strong></h4><h4>Benchmarks de Margen Operacional:</h4><ul><li>Excelente: > 25%</li><li>Bueno: 20-25%</li><li>Promedio: 15-20%</li><li>Bajo: < 10%</li></ul><h4>Significado:</h4><p>Indica qué tan eficientemente el negocio convierte ventas en ganancias antes de gastos financieros e impuestos.</p>',
    
    'help.metrics.ebitda.title': 'EBITDA',
    'help.metrics.ebitda.content': '<p>El <strong>EBITDA</strong> (Earnings Before Interest, Taxes, Depreciation, and Amortization) mide la rentabilidad operativa sin efectos contables.</p><h4>EBITDA actual: <strong>{currentValue}</strong></h4><h4>Margen EBITDA: <strong>{margin}%</strong></h4><h4>Benchmarks de Margen EBITDA:</h4><ul><li>Excelente: > 30%</li><li>Bueno: 25-30%</li><li>Promedio: 20-25%</li><li>Bajo: < 15%</li></ul><h4>Usos del EBITDA:</h4><ul><li>Comparar empresas de diferentes sectores</li><li>Evaluar capacidad de generar flujo de caja</li><li>Base para valoración de empresas</li><li>Análisis de capacidad de endeudamiento</li></ul>',
    
    'help.metrics.netIncome.title': 'Utilidad Neta',
    'help.metrics.netIncome.content': '<p>La <strong>Utilidad Neta</strong> es la ganancia final después de todos los gastos, intereses e impuestos.</p><h4>Utilidad Neta actual: <strong>{currentValue}</strong></h4><h4>Margen Neto: <strong>{margin}%</strong></h4><h4>Benchmarks de Margen Neto:</h4><ul><li>Excelente: > 20%</li><li>Bueno: 15-20%</li><li>Promedio: 10-15%</li><li>Bajo: 5-10%</li></ul><h4>La utilidad neta se usa para:</h4><ul><li>Distribuir dividendos</li><li>Reinvertir en el negocio</li><li>Crear reservas</li><li>Pagar deudas</li></ul><p><strong>Nota:</strong> Una utilidad neta consistente es señal de un negocio saludable y sostenible.</p>',
    
    'help.ytd.revenue.title': 'Ingresos Acumulados YTD',
    'help.ytd.revenue.content': '<p>Los <strong>Ingresos YTD</strong> (Year-to-Date) muestran el total acumulado desde el inicio del año fiscal hasta la fecha.</p><h4>Total YTD: <strong>{currentValue}</strong></h4><h4>Comparaciones relevantes:</h4><ul><li>Mismo período año anterior: <strong>{benchmarks.lastYear}</strong></li><li>Presupuesto YTD: <strong>{benchmarks.budget}</strong></li><li>Mejor escenario: <strong>{benchmarks.bestCase}</strong></li></ul><h4>Análisis YTD te ayuda a:</h4><ul><li>Evaluar el progreso anual</li><li>Ajustar estrategias a tiempo</li><li>Proyectar cierre de año</li><li>Tomar decisiones informadas</li></ul>',
    
    'help.ytd.expenses.title': 'Gastos Acumulados YTD',
    'help.ytd.expenses.content': '<p>Los <strong>Gastos YTD</strong> incluyen todos los costos acumulados (COGS + OpEx) desde el inicio del año.</p><h4>Total Gastos YTD: <strong>{currentValue}</strong></h4><h4>Como % de Ingresos YTD: <strong>{expenseRatio}%</strong></h4><h4>Benchmarks de control de gastos:</h4><ul><li>Presupuesto: <strong>{benchmarks.budget}</strong></li><li>Promedio industria: <strong>{benchmarks.industry}</strong></li><li>Nivel eficiente: <strong>{benchmarks.efficient}</strong></li></ul><h4>Señales de alerta:</h4><ul><li>Gastos creciendo más rápido que ingresos</li><li>Desviación > 10% del presupuesto</li><li>Ratio gastos/ingresos deteriorándose</li></ul>',
    
    'help.ytd.netIncome.title': 'Utilidad Neta YTD',
    'help.ytd.netIncome.content': '<p>La <strong>Utilidad Neta YTD</strong> muestra las ganancias acumuladas después de todos los gastos e impuestos.</p><h4>Utilidad Neta YTD: <strong>{currentValue}</strong></h4><h4>Margen Neto YTD: <strong>{margin}%</strong></h4><h4>Niveles de rentabilidad:</h4><ul><li>Excelente: > 20% margen</li><li>Bueno: 15-20% margen</li><li>Aceptable: 10-15% margen</li><li>Punto de equilibrio: 0%</li></ul><h4>Factores clave:</h4><p>La utilidad neta YTD refleja:</p><ul><li>Eficiencia operacional general</li><li>Control de costos</li><li>Estrategia de precios</li><li>Gestión financiera</li></ul>',
    
    'help.ytd.ebitda.title': 'EBITDA YTD',
    'help.ytd.ebitda.content': '<p>El <strong>EBITDA YTD</strong> muestra la rentabilidad operativa acumulada sin efectos de depreciación, amortización, intereses e impuestos.</p><h4>EBITDA YTD: <strong>{currentValue}</strong></h4><h4>Margen EBITDA YTD: <strong>{margin}%</strong></h4><h4>Interpretación del EBITDA:</h4><ul><li>Positivo alto: Negocio muy rentable</li><li>Positivo moderado: Operaciones saludables</li><li>Cercano a cero: Revisar eficiencia</li><li>Negativo: Problema operacional serio</li></ul><h4>EBITDA se usa para:</h4><ul><li>Evaluar salud operacional</li><li>Comparar con competidores</li><li>Calcular múltiplos de valoración</li><li>Analizar tendencias de rentabilidad</li></ul>',
    
    // Missing translation
    'metrics.ofRevenue': 'de ingresos',
    'metrics.previous': 'Anterior',
    
    // Filter Help Topics
    'help.filters.period.title': 'Selección de Período',
    'help.filters.period.content': '<p>El <strong>selector de período</strong> te permite elegir qué mes o período analizar en el dashboard.</p><h4>Opciones disponibles:</h4><ul><li><strong>Mes actual</strong>: Muestra los datos del mes en curso</li><li><strong>YTD (Año a la fecha)</strong>: Muestra datos acumulados desde enero hasta el mes actual</li><li><strong>Meses anteriores</strong>: Puedes seleccionar cualquier mes histórico disponible</li></ul><h4>¿Cuándo usar cada opción?</h4><ul><li><strong>Mes actual</strong>: Para monitorear el desempeño en tiempo real y tomar decisiones operativas inmediatas</li><li><strong>YTD</strong>: Para evaluar el progreso anual, comparar con objetivos anuales y proyectar el cierre del año</li><li><strong>Meses específicos</strong>: Para analizar tendencias, identificar patrones estacionales o investigar eventos específicos</li></ul><h4>Impacto en los datos mostrados:</h4><p>Al cambiar el período:</p><ul><li>Todos los gráficos y métricas se actualizan automáticamente</li><li>Las comparaciones se ajustan al período seleccionado</li><li>Los cálculos de márgenes y ratios reflejan el período elegido</li></ul><h4>Tips profesionales:</h4><ul><li>Compara el mismo mes de diferentes años para eliminar efectos estacionales</li><li>Usa YTD para presentaciones ejecutivas y evaluaciones de desempeño anual</li><li>Revisa varios meses consecutivos para identificar tendencias</li></ul>',
    
    'help.filters.comparison.title': 'Comparación de Períodos',
    'help.filters.comparison.content': '<p>La <strong>comparación de períodos</strong> te permite evaluar el desempeño actual contra referencias históricas para identificar tendencias y cambios.</p><h4>Opciones de comparación:</h4><ul><li><strong>Período anterior</strong>: Compara con el mes inmediatamente anterior (ej: octubre vs septiembre)</li><li><strong>Mismo período año anterior</strong>: Compara con el mismo mes del año pasado (ej: octubre 2024 vs octubre 2023)</li><li><strong>Sin comparación</strong>: Muestra solo los datos del período actual sin referencias</li></ul><h4>¿Cuándo usar cada comparación?</h4><ul><li><strong>Período anterior (Mes a mes)</strong>:<ul><li>Ideal para monitorear tendencias de corto plazo</li><li>Detectar cambios operacionales inmediatos</li><li>Evaluar el impacto de decisiones recientes</li><li>⚠️ Cuidado con la estacionalidad (ej: diciembre vs enero)</li></ul></li><li><strong>Año anterior (Año contra año)</strong>:<ul><li>Elimina efectos estacionales</li><li>Evalúa crecimiento real del negocio</li><li>Ideal para negocios con alta estacionalidad</li><li>Requerido para reportes a inversionistas</li></ul></li><li><strong>Sin comparación</strong>:<ul><li>Cuando analizas un período único o inicial</li><li>Para enfocarte en valores absolutos</li><li>Al presentar proyecciones futuras</li></ul></li></ul><h4>Métricas afectadas:</h4><p>La comparación impacta:</p><ul><li>Flechas de tendencia (↑↓) en las tarjetas</li><li>Porcentajes de variación</li><li>Colores indicadores (verde=mejora, rojo=deterioro)</li><li>Análisis de crecimiento</li></ul><h4>Mejores prácticas:</h4><ul><li>Para decisiones operativas: usa comparación mes a mes</li><li>Para estrategia y reportes: usa comparación año a año</li><li>Considera el contexto del negocio (temporadas, promociones, eventos)</li><li>Documenta eventos extraordinarios que afecten las comparaciones</li></ul>',
    
    'help.filters.currency.title': 'Selector de Moneda y Tasas de Cambio',
    'help.filters.currency.content': '<p>El <strong>selector de moneda</strong> convierte todos los valores financieros a la divisa seleccionada usando tasas de cambio actualizadas.</p><h4>Características principales:</h4><ul><li><strong>Conversión automática</strong>: Todos los valores se convierten instantáneamente</li><li><strong>Tasas actualizadas</strong>: Se usan tasas de cambio del mercado</li><li><strong>Tasas personalizadas</strong>: Puedes ajustar manualmente las tasas usando el botón ✏️</li><li><strong>Múltiples monedas</strong>: Soporta USD, EUR, MXN, y más divisas internacionales</li></ul><h4>¿Cuándo cambiar la moneda?</h4><ul><li><strong>Reportes locales</strong>: Usa la moneda local para análisis operativo</li><li><strong>Reportes corporativos</strong>: Usa la moneda de reporte del grupo (usualmente USD o EUR)</li><li><strong>Comparaciones internacionales</strong>: Convierte a una moneda común</li><li><strong>Presentaciones a inversionistas</strong>: Usa la moneda preferida por los stakeholders</li></ul><h4>Editor de tasas de cambio (✏️):</h4><p>Permite ajustar tasas manualmente para:</p><ul><li>Usar tasas corporativas oficiales</li><li>Fijar tasas para períodos específicos</li><li>Aplicar tasas presupuestadas</li><li>Simular escenarios con diferentes tasas</li></ul><h4>Impacto de las tasas de cambio:</h4><ul><li><strong>En los ingresos</strong>: Fluctuaciones pueden mostrar crecimiento/decrecimiento artificial</li><li><strong>En los márgenes</strong>: Los porcentajes NO cambian con la moneda</li><li><strong>En las comparaciones</strong>: Usa la misma tasa para períodos comparados</li></ul><h4>Recomendaciones importantes:</h4><ul><li>📌 Para análisis de tendencias, mantén la misma moneda</li><li>📌 Documenta las tasas usadas en reportes oficiales</li><li>📌 Considera el impacto de devaluaciones/revaluaciones</li><li>📌 Para consolidaciones, usa tasas promedio del período</li></ul><h4>Tips avanzados:</h4><ul><li>Exporta los datos con las tasas aplicadas para auditoría</li><li>Guarda configuraciones de tasas para reportes recurrentes</li><li>Revisa variaciones significativas en tasas mes a mes</li></ul>',
    
    'help.filters.units.title': 'Escala de Visualización (Normal, K, M)',
    'help.filters.units.content': '<p>El <strong>selector de unidades</strong> ajusta la escala de visualización de los valores monetarios para mejorar la legibilidad según la magnitud de las cifras.</p><h4>Opciones disponibles:</h4><ul><li><strong>Normal</strong>: Muestra valores completos (ej: $1,234,567)</li><li><strong>K (Miles)</strong>: Divide entre 1,000 (ej: $1,234.6K)</li><li><strong>M (Millones)</strong>: Divide entre 1,000,000 (ej: $1.2M)</li></ul><h4>¿Cuándo usar cada escala?</h4><ul><li><strong>Normal</strong>:<ul><li>Empresas pequeñas con cifras < $100,000</li><li>Análisis detallado de costos específicos</li><li>Revisión de transacciones individuales</li><li>Documentos legales o auditorías</li></ul></li><li><strong>Miles (K)</strong>:<ul><li>Empresas medianas ($100K - $10M en ingresos)</li><li>Reportes operativos mensuales</li><li>Dashboards ejecutivos para PyMEs</li><li>Facilita la lectura sin perder precisión</li></ul></li><li><strong>Millones (M)</strong>:<ul><li>Grandes empresas (> $10M en ingresos)</li><li>Reportes para juntas directivas</li><li>Presentaciones a inversionistas</li><li>Análisis de alto nivel estratégico</li></ul></li></ul><h4>Impacto en la visualización:</h4><ul><li>Solo afecta la <strong>presentación</strong>, no los cálculos</li><li>Los porcentajes y ratios permanecen sin cambios</li><li>Gráficos se ajustan automáticamente</li><li>Tooltips muestran valores completos al pasar el cursor</li></ul><h4>Mejores prácticas por audiencia:</h4><ul><li><strong>Operaciones diarias</strong>: Usa Normal o K para precisión</li><li><strong>Gerencia media</strong>: Usa K para balance entre detalle y claridad</li><li><strong>Alta dirección</strong>: Usa M para enfoque estratégico</li><li><strong>Reportes externos</strong>: Sigue estándares de la industria</li></ul><h4>Consideraciones importantes:</h4><ul><li>⚠️ Mantén consistencia en todo el reporte</li><li>⚠️ Indica claramente las unidades en títulos/notas</li><li>⚠️ En reuniones, confirma que todos entienden la escala</li><li>⚠️ Para comparaciones, usa la misma escala</li></ul><h4>Tips profesionales:</h4><ul><li>Ajusta según el rango de valores (si tienes $100K a $10M, usa K)</li><li>En presentaciones, empieza con M y profundiza a K si es necesario</li><li>Para KPIs específicos, considera mantener valores completos</li><li>Exporta con unidades claras en encabezados</li></ul>',
    
    // Add help category translation
    'help.category.filters': 'Filtros',
    
    // Matrix Mapper Translations
    'mapper.aiAnalysis.title': 'Análisis IA',
    'mapper.aiAnalysis.completed': 'Análisis IA completado - Puedes continuar',
    'mapper.aiAnalysis.classificationCompleted': 'Clasificación IA Completada',
    'mapper.aiAnalysis.analysisComplete': 'Análisis Completado',
    'mapper.aiAnalysis.accountsClassified': 'cuentas clasificadas',
    'mapper.aiAnalysis.ready': 'Listo para análisis IA',
    'mapper.aiAnalysis.processing': 'Analizando estructura del documento con IA',
    'mapper.aiAnalysis.classifying': 'Clasificando cuentas con IA - Por favor espera...',
    'mapper.currency.title': 'Moneda',
    'mapper.currency.selected': 'Seleccionada',
    'mapper.progress.completed': 'completado',
    'mapper.aiAnalysis.analyzing': 'La IA está analizando las cuentas detectadas y asignando categorías automáticamente...',
    'mapper.aiAnalysis.completeAnalysis': 'Análisis completo',
    'mapper.aiAnalysis.unifiedCompleted': 'Análisis unificado completado en',
    'mapper.aiAnalysis.confidence': 'Confianza',
    'mapper.aiAnalysis.columns': 'columnas',
    'mapper.aiAnalysis.periods': 'períodos',
    // Duplicates removed - already defined above
    'common.skip': 'Omitir',
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
    'dashboard.pnl.ytdSection': 'Year to Date (YTD) Summary',
    
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
    'metrics.ytdRevenue': 'YTD Revenue',
    'metrics.ytdExpenses': 'YTD Expenses',
    'metrics.ytdNetIncome': 'YTD Net Income',
    'metrics.ytdEbitda': 'YTD EBITDA',
    'metrics.months': 'months',
    'metrics.cogsBreakdown': 'COGS Breakdown',
    'metrics.noBreakdownAvailable': 'No breakdown available',
    'metrics.industry': 'Industry',
    'metrics.efficient': 'Efficient',
    'metrics.ofCOGS': 'of COGS',
    'metrics.ofRevenue': 'of Revenue',
    'metrics.ofOpEx': 'of OpEx',
    'metrics.previous': 'Previous',
    
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
    'charts.grossMargin': 'Gross Margin',
    'charts.operatingMargin': 'Operating Margin',
    'charts.netMargin': 'Net Margin',
    'charts.revenue': 'Revenue',
    'charts.expenses': 'Expenses',
    'charts.netIncome': 'Net Income',
    'charts.monthsOfData': 'months of data',
    'charts.last': 'Last',
    'charts.months': 'months',
    
    // Forecast translations
    'forecast.methodology': 'Methodology',
    'forecast.revenueExplanation': 'Projection based on historical trend with 5% monthly growth. Optimistic and pessimistic scenarios apply ±20% variations.',
    'forecast.netIncomeExplanation': 'Projection based on historical margins and expected economies of scale.',
    'forecast.assumptions': 'Key assumptions',
    'forecast.maintainMargins': 'Current operating margins are maintained',
    'forecast.scaleEconomies': 'Economies of scale expected with growth',
    'forecast.actual': 'Actual',
    'forecast.optimistic': 'Optimistic',
    'forecast.pessimistic': 'Pessimistic',
    'forecast.trend': 'Trend',
    
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
    'efficiency.forEvery': 'For every',
    'efficiency.spent': 'spent',
    'efficiency.generated': 'generated',
    'efficiency.retained': 'retained',
    'efficiency.cogsToRevenue': 'COGS to Revenue',
    'efficiency.target': 'Target',
    
    // Banking and Investments
    'bank.mainAccount': 'Main Account',
    'bank.savingsAccount': 'Savings Account',
    'bank.investments': 'Investments',
    'bank.totalAvailable': 'Total Available',
    'investments.governmentBonds': 'Government Bonds',
    'investments.mutualFunds': 'Mutual Funds',
    'investments.stocks': 'Stocks',
    
    // Metric Help Topics
    'help.metrics.totalRevenue.title': 'Total Revenue',
    'help.metrics.totalRevenue.content': '<p><strong>Total Revenue</strong> represents all money coming into your business during the selected period.</p><h4>Your current situation:</h4><ul><li>Current revenue: <strong>{currentValue}</strong></li><li>Change from previous period: <strong>{changePercent}%</strong></li><li>YTD accumulated: <strong>{ytdValue}</strong></li></ul><h4>Industry benchmarks comparison:</h4><ul><li>Industry average: <strong>{benchmarks.industry}</strong></li><li>Top performers: <strong>{benchmarks.topPerformers}</strong></li><li>General average: <strong>{benchmarks.average}</strong></li></ul><h4>Recommendations:</h4><p>To increase revenue, consider:</p><ul><li>Expanding your customer base</li><li>Increasing average ticket size</li><li>Improving customer retention</li><li>Launching new products/services</li></ul>',
    
    'help.metrics.growthVsPrevious.title': 'Growth vs Previous Period',
    'help.metrics.growthVsPrevious.content': '<p>This indicator shows the <strong>percentage change</strong> in your revenue compared to the previous period.</p><h4>Your current growth: <strong>{currentValue}%</strong></h4><p>Positive growth indicates business expansion, while negative suggests contraction.</p><h4>Factors affecting growth:</h4><ul><li>Business seasonality</li><li>Market conditions</li><li>Sales strategies</li><li>Competition</li></ul><h4>Healthy growth targets:</h4><ul><li>Startups: 20-50% monthly</li><li>Growing companies: 10-20% monthly</li><li>Mature companies: 5-10% monthly</li></ul>',
    
    'help.metrics.monthlyProjection.title': 'Monthly Projection',
    'help.metrics.monthlyProjection.content': '<p>The <strong>Monthly Projection</strong> estimates your future revenue based on current trends and historical data.</p><h4>Current projection: <strong>{currentValue}</strong></h4><h4>Projection scenarios:</h4><ul><li>Conservative (2% growth): <strong>{benchmarks.conservative}</strong></li><li>Moderate (5% growth): <strong>{benchmarks.moderate}</strong></li><li>Aggressive (10% growth): <strong>{benchmarks.aggressive}</strong></li></ul><h4>Factors to consider:</h4><ul><li>Historical trends</li><li>Sales pipeline</li><li>Seasonality</li><li>Economic conditions</li></ul><p><em>Note: Projections are estimates and may vary based on multiple factors.</em></p>',
    
    'help.metrics.percentageOfTarget.title': 'Percentage of Target',
    'help.metrics.percentageOfTarget.content': '<p>Shows how close you are to reaching your <strong>revenue goal</strong> for the period.</p><h4>Current progress: <strong>{currentValue}%</strong></h4><h4>Achievement levels:</h4><ul><li>Minimum target (80%): <strong>{benchmarks.minimum}%</strong></li><li>Target goal (100%): <strong>{benchmarks.target}%</strong></li><li>Stretch goal (110%): <strong>{benchmarks.stretch}%</strong></li></ul><h4>Strategies to reach target:</h4><ul><li>Accelerate pending sales closures</li><li>Implement strategic promotions</li><li>Improve lead conversion</li><li>Upsell existing customers</li></ul>',
    
    'help.metrics.cogs.title': 'Cost of Goods Sold (COGS)',
    'help.metrics.cogs.content': '<p><strong>Cost of Goods Sold</strong> includes all direct costs associated with producing or delivering your products/services.</p><h4>Current COGS: <strong>{currentValue}</strong></h4><h4>Change vs previous period: <strong>{changePercent}%</strong></h4><h4>Industry benchmarks (% of revenue):</h4><ul><li>Efficient: <strong>30%</strong></li><li>Industry average: <strong>35%</strong></li><li>Needs improvement: <strong>40%</strong></li></ul><h4>Typical COGS components:</h4><ul><li>Raw materials</li><li>Direct labor</li><li>Production costs</li><li>Direct shipping and logistics</li></ul><h4>Optimization strategies:</h4><ul><li>Negotiate better supplier prices</li><li>Improve operational efficiency</li><li>Reduce waste</li><li>Automate processes</li></ul>',
    
    'help.metrics.operatingExpenses.title': 'Operating Expenses',
    'help.metrics.operatingExpenses.content': '<p><strong>Operating Expenses</strong> are all costs necessary to keep the business running, excluding COGS.</p><h4>Current OpEx: <strong>{currentValue}</strong></h4><h4>Change vs previous period: <strong>{changePercent}%</strong></h4><h4>Industry benchmarks (% of revenue):</h4><ul><li>Efficient: <strong>15%</strong></li><li>Average: <strong>20%</strong></li><li>High: <strong>25%</strong></li></ul><h4>Main categories:</h4><ul><li>Administrative salaries</li><li>Marketing and sales</li><li>Technology and software</li><li>Office and utilities</li></ul><h4>Optimization opportunities:</h4><ul><li>Review unused subscriptions</li><li>Renegotiate contracts</li><li>Automate administrative processes</li><li>Optimize marketing spend</li></ul>',
    
    'help.metrics.cogsPercentage.title': 'COGS as % of Revenue',
    'help.metrics.cogsPercentage.content': '<p>This ratio shows what percentage of your revenue goes to <strong>direct costs</strong>.</p><h4>Current ratio: <strong>{currentValue}%</strong></h4><h4>Interpretation by level:</h4><ul><li><strong>Excellent (< 30%)</strong>: Very healthy margins</li><li><strong>Good (30-35%)</strong>: Well optimized</li><li><strong>Average (35-40%)</strong>: Room for improvement</li><li><strong>Concerning (> 45%)</strong>: Requires urgent attention</li></ul><h4>Business impact:</h4><p>Lower COGS means higher gross margin available to cover operating expenses and generate profit.</p>',
    
    'help.metrics.opexPercentage.title': 'OpEx as % of Revenue',
    'help.metrics.opexPercentage.content': '<p>Shows what percentage of your revenue goes to <strong>operating expenses</strong>.</p><h4>Current ratio: <strong>{currentValue}%</strong></h4><h4>Efficiency levels:</h4><ul><li><strong>Excellent (< 15%)</strong>: Very efficient</li><li><strong>Good (15-20%)</strong>: Well controlled</li><li><strong>Average (20-25%)</strong>: Normal for sector</li><li><strong>High (> 30%)</strong>: Review expenses urgently</li></ul><h4>Focus areas:</h4><p>If ratio is high, especially review:</p><ul><li>Non-productive staff expenses</li><li>Marketing costs vs ROI</li><li>General and administrative expenses</li></ul>',
    
    'help.metrics.grossProfit.title': 'Gross Profit',
    'help.metrics.grossProfit.content': '<p><strong>Gross Profit</strong> is what remains after subtracting cost of goods sold from total revenue.</p><h4>Current Gross Profit: <strong>{currentValue}</strong></h4><h4>Gross Margin: <strong>{margin}%</strong></h4><h4>Gross Margin Benchmarks:</h4><ul><li>Excellent: > 70%</li><li>Good: 60-70%</li><li>Average: 50-60%</li><li>Low: < 40%</li></ul><h4>Importance:</h4><p>Gross profit must be sufficient to:</p><ul><li>Cover all operating expenses</li><li>Pay taxes</li><li>Generate net profit</li><li>Reinvest in the business</li></ul>',
    
    'help.metrics.operatingIncome.title': 'Operating Income',
    'help.metrics.operatingIncome.content': '<p><strong>Operating Income</strong> shows the profitability of the business\'s core operations.</p><h4>Current Operating Income: <strong>{currentValue}</strong></h4><h4>Operating Margin: <strong>{margin}%</strong></h4><h4>Operating Margin Benchmarks:</h4><ul><li>Excellent: > 25%</li><li>Good: 20-25%</li><li>Average: 15-20%</li><li>Low: < 10%</li></ul><h4>Meaning:</h4><p>Indicates how efficiently the business converts sales into profits before financial expenses and taxes.</p>',
    
    'help.metrics.ebitda.title': 'EBITDA',
    'help.metrics.ebitda.content': '<p><strong>EBITDA</strong> (Earnings Before Interest, Taxes, Depreciation, and Amortization) measures operating profitability without accounting effects.</p><h4>Current EBITDA: <strong>{currentValue}</strong></h4><h4>EBITDA Margin: <strong>{margin}%</strong></h4><h4>EBITDA Margin Benchmarks:</h4><ul><li>Excellent: > 30%</li><li>Good: 25-30%</li><li>Average: 20-25%</li><li>Low: < 15%</li></ul><h4>EBITDA uses:</h4><ul><li>Compare companies across sectors</li><li>Evaluate cash flow generation capacity</li><li>Basis for company valuation</li><li>Debt capacity analysis</li></ul>',
    
    'help.metrics.netIncome.title': 'Net Income',
    'help.metrics.netIncome.content': '<p><strong>Net Income</strong> is the final profit after all expenses, interest, and taxes.</p><h4>Current Net Income: <strong>{currentValue}</strong></h4><h4>Net Margin: <strong>{margin}%</strong></h4><h4>Net Margin Benchmarks:</h4><ul><li>Excellent: > 20%</li><li>Good: 15-20%</li><li>Average: 10-15%</li><li>Low: 5-10%</li></ul><h4>Net income is used to:</h4><ul><li>Distribute dividends</li><li>Reinvest in the business</li><li>Create reserves</li><li>Pay down debt</li></ul><p><strong>Note:</strong> Consistent net income is a sign of a healthy and sustainable business.</p>',
    
    'help.ytd.revenue.title': 'YTD Revenue',
    'help.ytd.revenue.content': '<p><strong>YTD Revenue</strong> (Year-to-Date) shows the total accumulated from the beginning of the fiscal year to date.</p><h4>Total YTD: <strong>{currentValue}</strong></h4><h4>Relevant comparisons:</h4><ul><li>Same period last year: <strong>{benchmarks.lastYear}</strong></li><li>YTD Budget: <strong>{benchmarks.budget}</strong></li><li>Best case scenario: <strong>{benchmarks.bestCase}</strong></li></ul><h4>YTD analysis helps you:</h4><ul><li>Evaluate annual progress</li><li>Adjust strategies in time</li><li>Project year-end results</li><li>Make informed decisions</li></ul>',
    
    'help.ytd.expenses.title': 'YTD Expenses',
    'help.ytd.expenses.content': '<p><strong>YTD Expenses</strong> include all accumulated costs (COGS + OpEx) from the beginning of the year.</p><h4>Total YTD Expenses: <strong>{currentValue}</strong></h4><h4>As % of YTD Revenue: <strong>{expenseRatio}%</strong></h4><h4>Expense control benchmarks:</h4><ul><li>Budget: <strong>{benchmarks.budget}</strong></li><li>Industry average: <strong>{benchmarks.industry}</strong></li><li>Efficient level: <strong>{benchmarks.efficient}</strong></li></ul><h4>Warning signals:</h4><ul><li>Expenses growing faster than revenue</li><li>Deviation > 10% from budget</li><li>Deteriorating expense/revenue ratio</li></ul>',
    
    'help.ytd.netIncome.title': 'YTD Net Income',
    'help.ytd.netIncome.content': '<p><strong>YTD Net Income</strong> shows accumulated profits after all expenses and taxes.</p><h4>YTD Net Income: <strong>{currentValue}</strong></h4><h4>YTD Net Margin: <strong>{margin}%</strong></h4><h4>Profitability levels:</h4><ul><li>Excellent: > 20% margin</li><li>Good: 15-20% margin</li><li>Acceptable: 10-15% margin</li><li>Break-even: 0%</li></ul><h4>Key factors:</h4><p>YTD net income reflects:</p><ul><li>Overall operational efficiency</li><li>Cost control</li><li>Pricing strategy</li><li>Financial management</li></ul>',
    
    'help.ytd.ebitda.title': 'YTD EBITDA',
    'help.ytd.ebitda.content': '<p><strong>YTD EBITDA</strong> shows accumulated operating profitability without effects of depreciation, amortization, interest, and taxes.</p><h4>YTD EBITDA: <strong>{currentValue}</strong></h4><h4>YTD EBITDA Margin: <strong>{margin}%</strong></h4><h4>EBITDA interpretation:</h4><ul><li>High positive: Very profitable business</li><li>Moderate positive: Healthy operations</li><li>Near zero: Review efficiency</li><li>Negative: Serious operational issue</li></ul><h4>EBITDA is used to:</h4><ul><li>Evaluate operational health</li><li>Compare with competitors</li><li>Calculate valuation multiples</li><li>Analyze profitability trends</li></ul>',
    
    // Missing translations
    'metrics.ofRevenue': 'of revenue',
    'metrics.previous': 'Previous',
    
    // Filter Help Topics
    'help.filters.period.title': 'Period Selection',
    'help.filters.period.content': '<p>The <strong>period selector</strong> allows you to choose which month or period to analyze in the dashboard.</p><h4>Available options:</h4><ul><li><strong>Current month</strong>: Shows data for the current month</li><li><strong>YTD (Year to Date)</strong>: Shows accumulated data from January to the current month</li><li><strong>Previous months</strong>: You can select any available historical month</li></ul><h4>When to use each option?</h4><ul><li><strong>Current month</strong>: To monitor real-time performance and make immediate operational decisions</li><li><strong>YTD</strong>: To evaluate annual progress, compare with annual goals, and project year-end results</li><li><strong>Specific months</strong>: To analyze trends, identify seasonal patterns, or investigate specific events</li></ul><h4>Impact on displayed data:</h4><p>When changing the period:</p><ul><li>All charts and metrics update automatically</li><li>Comparisons adjust to the selected period</li><li>Margin and ratio calculations reflect the chosen period</li></ul><h4>Professional tips:</h4><ul><li>Compare the same month across different years to eliminate seasonal effects</li><li>Use YTD for executive presentations and annual performance evaluations</li><li>Review several consecutive months to identify trends</li></ul>',
    
    'help.filters.comparison.title': 'Period Comparison',
    'help.filters.comparison.content': '<p>The <strong>period comparison</strong> allows you to evaluate current performance against historical references to identify trends and changes.</p><h4>Comparison options:</h4><ul><li><strong>Previous period</strong>: Compares with the immediately preceding month (e.g., October vs September)</li><li><strong>Same period last year</strong>: Compares with the same month from the previous year (e.g., October 2024 vs October 2023)</li><li><strong>No comparison</strong>: Shows only current period data without references</li></ul><h4>When to use each comparison?</h4><ul><li><strong>Previous period (Month-over-month)</strong>:<ul><li>Ideal for monitoring short-term trends</li><li>Detect immediate operational changes</li><li>Evaluate the impact of recent decisions</li><li>⚠️ Be careful with seasonality (e.g., December vs January)</li></ul></li><li><strong>Previous year (Year-over-year)</strong>:<ul><li>Eliminates seasonal effects</li><li>Evaluates real business growth</li><li>Ideal for highly seasonal businesses</li><li>Required for investor reports</li></ul></li><li><strong>No comparison</strong>:<ul><li>When analyzing a unique or initial period</li><li>To focus on absolute values</li><li>When presenting future projections</li></ul></li></ul><h4>Affected metrics:</h4><p>Comparison impacts:</p><ul><li>Trend arrows (↑↓) on cards</li><li>Variation percentages</li><li>Indicator colors (green=improvement, red=deterioration)</li><li>Growth analysis</li></ul><h4>Best practices:</h4><ul><li>For operational decisions: use month-to-month comparison</li><li>For strategy and reports: use year-over-year comparison</li><li>Consider business context (seasons, promotions, events)</li><li>Document extraordinary events that affect comparisons</li></ul>',
    
    'help.filters.currency.title': 'Currency Selector and Exchange Rates',
    'help.filters.currency.content': '<p>The <strong>currency selector</strong> converts all financial values to the selected currency using updated exchange rates.</p><h4>Key features:</h4><ul><li><strong>Automatic conversion</strong>: All values convert instantly</li><li><strong>Updated rates</strong>: Uses market exchange rates</li><li><strong>Custom rates</strong>: You can manually adjust rates using the ✏️ button</li><li><strong>Multiple currencies</strong>: Supports USD, EUR, MXN, and more international currencies</li></ul><h4>When to change currency?</h4><ul><li><strong>Local reports</strong>: Use local currency for operational analysis</li><li><strong>Corporate reports</strong>: Use group reporting currency (usually USD or EUR)</li><li><strong>International comparisons</strong>: Convert to a common currency</li><li><strong>Investor presentations</strong>: Use stakeholders\' preferred currency</li></ul><h4>Exchange rate editor (✏️):</h4><p>Allows manual rate adjustment for:</p><ul><li>Using official corporate rates</li><li>Fixing rates for specific periods</li><li>Applying budgeted rates</li><li>Simulating scenarios with different rates</li></ul><h4>Exchange rate impact:</h4><ul><li><strong>On revenue</strong>: Fluctuations can show artificial growth/decline</li><li><strong>On margins</strong>: Percentages do NOT change with currency</li><li><strong>On comparisons</strong>: Use the same rate for compared periods</li></ul><h4>Important recommendations:</h4><ul><li>📌 For trend analysis, maintain the same currency</li><li>📌 Document rates used in official reports</li><li>📌 Consider the impact of devaluations/revaluations</li><li>📌 For consolidations, use period average rates</li></ul><h4>Advanced tips:</h4><ul><li>Export data with applied rates for audit purposes</li><li>Save rate configurations for recurring reports</li><li>Review significant rate variations month to month</li></ul>',
    
    'help.filters.units.title': 'Display Scale (Normal, K, M)',
    'help.filters.units.content': '<p>The <strong>units selector</strong> adjusts the display scale of monetary values to improve readability based on the magnitude of figures.</p><h4>Available options:</h4><ul><li><strong>Normal</strong>: Shows complete values (e.g., $1,234,567)</li><li><strong>K (Thousands)</strong>: Divides by 1,000 (e.g., $1,234.6K)</li><li><strong>M (Millions)</strong>: Divides by 1,000,000 (e.g., $1.2M)</li></ul><h4>When to use each scale?</h4><ul><li><strong>Normal</strong>:<ul><li>Small businesses with figures < $100,000</li><li>Detailed analysis of specific costs</li><li>Individual transaction review</li><li>Legal documents or audits</li></ul></li><li><strong>Thousands (K)</strong>:<ul><li>Medium businesses ($100K - $10M in revenue)</li><li>Monthly operational reports</li><li>Executive dashboards for SMEs</li><li>Facilitates reading without losing precision</li></ul></li><li><strong>Millions (M)</strong>:<ul><li>Large enterprises (> $10M in revenue)</li><li>Board of directors reports</li><li>Investor presentations</li><li>High-level strategic analysis</li></ul></li></ul><h4>Impact on visualization:</h4><ul><li>Only affects <strong>presentation</strong>, not calculations</li><li>Percentages and ratios remain unchanged</li><li>Charts adjust automatically</li><li>Tooltips show complete values on hover</li></ul><h4>Best practices by audience:</h4><ul><li><strong>Daily operations</strong>: Use Normal or K for precision</li><li><strong>Middle management</strong>: Use K for balance between detail and clarity</li><li><strong>Senior leadership</strong>: Use M for strategic focus</li><li><strong>External reports</strong>: Follow industry standards</li></ul><h4>Important considerations:</h4><ul><li>⚠️ Maintain consistency throughout the report</li><li>⚠️ Clearly indicate units in titles/notes</li><li>⚠️ In meetings, confirm everyone understands the scale</li><li>⚠️ For comparisons, use the same scale</li></ul><h4>Professional tips:</h4><ul><li>Adjust based on value range (if you have $100K to $10M, use K)</li><li>In presentations, start with M and drill down to K if necessary</li><li>For specific KPIs, consider keeping complete values</li><li>Export with clear units in headers</li></ul>',
    
    // Add help category translation
    'help.category.filters': 'Filters',
    
    // Matrix Mapper Translations
    'mapper.aiAnalysis.title': 'AI Analysis',
    'mapper.aiAnalysis.completed': 'AI Analysis Completed - You can continue',
    'mapper.aiAnalysis.classificationCompleted': 'AI Classification Completed',
    'mapper.aiAnalysis.analysisComplete': 'Analysis Complete',
    'mapper.aiAnalysis.accountsClassified': 'accounts classified',
    'mapper.aiAnalysis.ready': 'Ready for AI analysis',
    'mapper.aiAnalysis.processing': 'Analyzing document structure with AI',
    'mapper.aiAnalysis.classifying': 'Classifying accounts with AI - Please wait...',
    'mapper.currency.title': 'Currency',
    'mapper.currency.selected': 'Selected',
    'mapper.progress.completed': 'completed',
    'mapper.aiAnalysis.analyzing': 'AI is analyzing detected accounts and automatically assigning categories...',
    'mapper.aiAnalysis.completeAnalysis': 'Complete analysis',
    'mapper.aiAnalysis.unifiedCompleted': 'Unified analysis completed in',
    'mapper.aiAnalysis.confidence': 'Confidence',
    'mapper.aiAnalysis.columns': 'columns',
    'mapper.aiAnalysis.periods': 'periods',
    // Duplicates removed - already defined above
    'common.skip': 'Skip',
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