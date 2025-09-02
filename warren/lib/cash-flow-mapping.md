# Cash Flow Composition Mapping

This document defines the exact CSV row mapping for the Composición Cash Flow component.

## Inflows (Entradas)

### Categories:
1. **Initial Balance** - Row 10
2. **Total Collections** - Row 20  
3. **Total Investment Income** - Row 23

## Outflows (Salidas)

### Operating Expenses (OPEX) - Row 52
Subcategories that sum to Total OPEX:
- **Total Rent Expense** - Row 27
- **Total External Professional Services** - Row 37
- **Total Utilities** - Row 40
- **Total Other Expenses** - Row 51

### Wages - Row 80
Subcategories that sum to Total Wages:
- **Total Consulting Education** - Row 55
- **Total Benefits** - Row 57
- **Total Prepaid Health Coverage** - Row 60
- **Total Contractors** - Row 70
- **Total Salaries** - Row 79

### Other Outflows:
- **Total Taxes** - Row 88
- **Total Bank Expenses and Taxes** - Row 100

## Data Structure for Components:

```javascript
const inflowCategories = [
  { name: 'Balance Inicial', row: 10, color: '#10B981' },
  { name: 'Cobranzas Totales', row: 20, color: '#34D399' },
  { name: 'Ingresos Inversión', row: 23, color: '#6EE7B7' }
];

const outflowCategories = [
  { name: 'Gastos Operativos', row: 52, color: '#EF4444', 
    subcategories: [
      { name: 'Alquileres', row: 27 },
      { name: 'Servicios Profesionales', row: 37 },
      { name: 'Servicios Públicos', row: 40 },
      { name: 'Otros Gastos', row: 51 }
    ]
  },
  { name: 'Sueldos y Salarios', row: 80, color: '#F97316',
    subcategories: [
      { name: 'Consultoría/Educación', row: 55 },
      { name: 'Beneficios', row: 57 },
      { name: 'Cobertura Salud', row: 60 },
      { name: 'Contratistas', row: 70 },
      { name: 'Salarios', row: 79 }
    ]
  },
  { name: 'Impuestos', row: 88, color: '#DC2626' },
  { name: 'Gastos Bancarios', row: 100, color: '#B91C1C' }
];
```

## Validation Rules:
- Row 55 + Row 57 + Row 60 + Row 70 + Row 79 = Row 80 (Total Wages)
- Row 27 + Row 37 + Row 40 + Row 51 = Row 52 (Total OPEX)