const XLSX = require('xlsx');
const fs = require('fs');

// Spanish P&L data
const spanishPLData = [
  ['Cuenta', 'Descripción', 'Ene 2024', 'Feb 2024', 'Mar 2024', 'Abr 2024'],
  ['', '', '', 'Estado de Resultados', '', ''],
  ['', '', '', 'Empresa ABC S.A. de C.V.', '', ''],
  ['', '', '', 'Enero - Abril 2024', '', ''],
  ['', '', '', '(En miles de pesos)', '', ''],
  ['', '', '', '', '', ''],
  ['Ingresos', '', '', '', '', ''],
  ['4100', 'Ingresos por Servicios', 850, 920, 1050, 980],
  ['4200', 'Ingresos por Consultoría', 450, 520, 480, 610],
  ['4300', 'Otros Ingresos Operativos', 75, 85, 90, 65],
  ['4400', 'Ingresos Financieros', 25, 30, 28, 35],
  ['', 'Total Ingresos', 1400, 1555, 1648, 1690],
  ['', '', '', '', '', ''],
  ['Costo de Ventas', '', '', '', '', ''],
  ['5100', 'Personal Directo (CoR)', 320, 340, 380, 360],
  ['5200', 'Materiales Directos (CoR)', 180, 195, 210, 205],
  ['5300', 'Servicios Subcontratados (CoR)', 120, 135, 145, 140],
  ['5400', 'Otros Costos Directos', 85, 90, 95, 88],
  ['', 'Total Costo de Ventas', 705, 760, 830, 793],
  ['', '', '', '', '', ''],
  ['', 'Utilidad Bruta', 695, 795, 818, 897],
  ['', '', '', '', '', ''],
  ['Gastos Operativos', '', '', '', '', ''],
  ['6100', 'Sueldos y Salarios', 285, 285, 290, 295],
  ['6200', 'Impuestos sobre Nómina', 45, 45, 46, 47],
  ['6300', 'Prestaciones y Beneficios', 52, 52, 53, 54],
  ['6400', 'Renta y Servicios', 85, 85, 85, 85],
  ['6500', 'Marketing y Publicidad', 35, 45, 55, 40],
  ['6600', 'Servicios Profesionales', 25, 30, 28, 32],
  ['6700', 'Viajes y Entretenimiento', 18, 22, 25, 20],
  ['6800', 'Suministros de Oficina', 12, 15, 18, 14],
  ['6900', 'Depreciación', 35, 35, 35, 35],
  ['7000', 'Seguros', 15, 15, 15, 15],
  ['7100', 'Capacitación y Desarrollo', 8, 12, 15, 10],
  ['', 'Total Gastos Operativos', 615, 641, 665, 647],
  ['', '', '', '', '', ''],
  ['', 'Utilidad Operativa', 80, 154, 153, 250],
  ['', '', '', '', '', ''],
  ['Otros Ingresos y Gastos', '', '', '', '', ''],
  ['8100', 'Ganancia en Venta de Activos', 0, 15, 0, 0],
  ['8200', 'Gastos Financieros', 12, 14, 16, 18],
  ['8300', 'Diferencia Cambiaria', 5, -3, 2, 8],
  ['', '', '', '', '', ''],
  ['', 'Utilidad antes de Impuestos', 73, 152, 139, 240],
  ['', '', '', '', '', ''],
  ['Impuestos', '', '', '', '', ''],
  ['9100', 'Impuesto sobre la Renta', 22, 46, 42, 72],
  ['9200', 'Otros Impuestos', 3, 4, 4, 6],
  ['', 'Total Impuestos', 25, 50, 46, 78],
  ['', '', '', '', '', ''],
  ['', 'Utilidad Neta', 48, 102, 93, 162]
];

// Spanish Cash Flow data
const spanishCFData = [
  ['Cuenta', 'Descripción', 'Ene 2024', 'Feb 2024', 'Mar 2024', 'Abr 2024'],
  ['', '', '', 'Estado de Flujos de Efectivo', '', ''],
  ['', '', '', 'Empresa ABC S.A. de C.V.', '', ''],
  ['', '', '', 'Enero - Abril 2024', '', ''],
  ['', '', '', '(En miles de pesos)', '', ''],
  ['', '', '', '', '', ''],
  ['Actividades Operativas', '', '', '', '', ''],
  ['1100', 'Efectivo de Clientes', 1350, 1480, 1620, 1590],
  ['1200', 'Efectivo a Proveedores', -680, -720, -780, -760],
  ['1300', 'Efectivo a Empleados', -340, -345, -350, -355],
  ['1400', 'Intereses Pagados', -12, -14, -16, -18],
  ['1500', 'Impuestos Pagados', -85, -95, -105, -110],
  ['', 'Flujo Neto de Actividades Operativas', 233, 306, 369, 347],
  ['', '', '', '', '', ''],
  ['Actividades de Inversión', '', '', '', '', ''],
  ['2100', 'Compra de Prop. Planta y Equipo', -125, -85, -200, -150],
  ['2200', 'Venta de Prop. Planta y Equipo', 0, 45, 0, 0],
  ['2300', 'Compra de Inversiones', -50, -75, -100, -80],
  ['2400', 'Venta de Inversiones', 25, 0, 35, 60],
  ['', 'Flujo Neto de Actividades de Inversión', -150, -115, -265, -170],
  ['', '', '', '', '', ''],
  ['Actividades de Financiamiento', '', '', '', '', ''],
  ['3100', 'Préstamos Obtenidos', 200, 0, 150, 100],
  ['3200', 'Pago de Préstamos', -45, -50, -55, -60],
  ['3300', 'Emisión de Acciones', 0, 0, 500, 0],
  ['3400', 'Dividendos Pagados', 0, -25, 0, -35],
  ['', 'Flujo Neto de Actividades de Financiamiento', 155, -75, 595, 5],
  ['', '', '', '', '', ''],
  ['', 'Aumento (Disminución) Neto en Efectivo', 238, 116, 699, 182],
  ['', 'Efectivo al Inicio del Período', 450, 688, 804, 1503],
  ['', 'Efectivo al Final del Período', 688, 804, 1503, 1685]
];

// Create workbooks
const spanishPLWorkbook = XLSX.utils.book_new();
const spanishPLWorksheet = XLSX.utils.aoa_to_sheet(spanishPLData);
XLSX.utils.book_append_sheet(spanishPLWorkbook, spanishPLWorksheet, 'Estado de Resultados');

const spanishCFWorkbook = XLSX.utils.book_new();
const spanishCFWorksheet = XLSX.utils.aoa_to_sheet(spanishCFData);
XLSX.utils.book_append_sheet(spanishCFWorkbook, spanishCFWorksheet, 'Flujo de Efectivo');

// Write files
try {
  XLSX.writeFile(spanishPLWorkbook, './test-files/Estado_Resultados_ES.xlsx');
  XLSX.writeFile(spanishCFWorkbook, './test-files/Flujo_Efectivo_ES.xlsx');
  console.log('✅ Excel test files created successfully');
  console.log('📁 Files created:');
  console.log('   - test-files/Estado_Resultados_ES.xlsx');
  console.log('   - test-files/Flujo_Efectivo_ES.xlsx');
} catch (error) {
  console.error('❌ Error creating Excel files:', error.message);
  console.log('💡 Make sure to run: npm install xlsx');
}