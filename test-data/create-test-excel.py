#!/usr/bin/env python3
import pandas as pd
from datetime import datetime, timedelta
import numpy as np
import os

# Create directory if it doesn't exist
os.makedirs('/Users/diegovarela/AI Agents/warren/test-data', exist_ok=True)

# Generate months
months = []
start_date = datetime(2024, 1, 1)
for i in range(12):
    months.append(start_date + timedelta(days=30*i))

month_names = [m.strftime('%B %Y') for m in months]

# 1. Standard Format Cashflow (English)
print("Creating Standard Cashflow...")
cashflow_data = {
    'Description': [
        'Beginning Balance',
        'Total Income',
        'Total Expenses', 
        'Net Cash Flow',
        'Ending Balance',
        'Lowest Balance in Month'
    ]
}

# Add monthly data
beginning_balance = 50000
for i, month in enumerate(month_names):
    income = np.random.randint(80000, 120000)
    expenses = np.random.randint(70000, 100000)
    net_flow = income - expenses
    ending_balance = beginning_balance + net_flow
    lowest = beginning_balance - np.random.randint(5000, 15000)
    
    cashflow_data[month] = [
        beginning_balance,
        income,
        expenses,
        net_flow,
        ending_balance,
        lowest
    ]
    beginning_balance = ending_balance

df_cashflow = pd.DataFrame(cashflow_data)
df_cashflow.to_excel('/Users/diegovarela/AI Agents/warren/test-data/Cashflow_Standard_2024.xlsx', index=False)

# 2. Non-Standard Cashflow (Spanish)
print("Creating Non-Standard Spanish Cashflow...")
cashflow_spanish = {
    'Concepto': [
        'INGRESOS',
        'Ventas Contado',
        'Cobros a Crédito',
        'Otros Ingresos',
        'TOTAL INGRESOS',
        '',
        'EGRESOS', 
        'Proveedores',
        'Sueldos y Cargas',
        'Gastos Operativos',
        'Impuestos',
        'TOTAL EGRESOS',
        '',
        'FLUJO NETO DEL MES',
        'SALDO INICIAL',
        'SALDO FINAL',
        'SALDO MÍNIMO'
    ]
}

# Add months with Spanish names
spanish_months = ['Ene-24', 'Feb-24', 'Mar-24', 'Abr-24', 'May-24', 'Jun-24', 
                 'Jul-24', 'Ago-24', 'Sep-24', 'Oct-24', 'Nov-24', 'Dic-24']

saldo_inicial = 75000
for month in spanish_months:
    ventas_contado = np.random.randint(40000, 60000)
    cobros_credito = np.random.randint(30000, 50000)
    otros = np.random.randint(5000, 10000)
    total_ing = ventas_contado + cobros_credito + otros
    
    proveedores = np.random.randint(35000, 45000)
    sueldos = np.random.randint(25000, 30000)
    gastos_op = np.random.randint(10000, 15000)
    impuestos = np.random.randint(8000, 12000)
    total_egr = proveedores + sueldos + gastos_op + impuestos
    
    flujo_neto = total_ing - total_egr
    saldo_final = saldo_inicial + flujo_neto
    saldo_min = saldo_inicial - np.random.randint(10000, 20000)
    
    cashflow_spanish[month] = [
        '', ventas_contado, cobros_credito, otros, total_ing,
        '', '', proveedores, sueldos, gastos_op, impuestos, total_egr,
        '', flujo_neto, saldo_inicial, saldo_final, saldo_min
    ]
    saldo_inicial = saldo_final

df_cashflow_spanish = pd.DataFrame(cashflow_spanish)
df_cashflow_spanish.to_excel('/Users/diegovarela/AI Agents/warren/test-data/Cashflow_NonStandard_Spanish_2024.xlsx', index=False)

# 3. Standard P&L (English)
print("Creating Standard P&L...")
pnl_data = {
    'Line Item': [
        'Revenue',
        'Cost of Goods Sold',
        'Gross Profit',
        'Gross Margin %',
        '',
        'Operating Expenses:',
        'Sales & Marketing',
        'General & Administrative', 
        'Research & Development',
        'Total Operating Expenses',
        '',
        'EBITDA',
        'EBITDA Margin %',
        'Depreciation & Amortization',
        'Operating Income',
        'Interest Expense',
        'Tax Expense',
        'Net Income',
        'Net Margin %'
    ]
}

for month in month_names:
    revenue = np.random.randint(200000, 300000)
    cogs = int(revenue * np.random.uniform(0.55, 0.65))
    gross_profit = revenue - cogs
    gross_margin = (gross_profit / revenue) * 100
    
    sales_marketing = int(revenue * 0.12)
    general_admin = int(revenue * 0.08)
    rd = int(revenue * 0.10)
    total_opex = sales_marketing + general_admin + rd
    
    ebitda = gross_profit - total_opex
    ebitda_margin = (ebitda / revenue) * 100
    depreciation = int(revenue * 0.03)
    operating_income = ebitda - depreciation
    interest = 5000
    tax = int((operating_income - interest) * 0.25)
    net_income = operating_income - interest - tax
    net_margin = (net_income / revenue) * 100
    
    pnl_data[month] = [
        revenue, cogs, gross_profit, f"{gross_margin:.1f}%",
        '', '', sales_marketing, general_admin, rd, total_opex,
        '', ebitda, f"{ebitda_margin:.1f}%", depreciation, operating_income,
        interest, tax, net_income, f"{net_margin:.1f}%"
    ]

df_pnl = pd.DataFrame(pnl_data)
df_pnl.to_excel('/Users/diegovarela/AI Agents/warren/test-data/PnL_Standard_2024.xlsx', index=False)

# 4. Non-Standard P&L (Mixed Spanish/English)
print("Creating Non-Standard P&L...")
pnl_mixed = {
    'Cuenta': [
        'INGRESOS OPERACIONALES',
        'Ventas Productos',
        'Servicios Prestados', 
        'Total Revenue',
        '',
        'COSTO DE VENTAS',
        'Materia Prima',
        'Mano de Obra Directa',
        'Total COGS',
        '',
        'UTILIDAD BRUTA',
        'Margen Bruto',
        '',
        'GASTOS OPERACIONALES',
        'Administración',
        'Ventas',
        'Total Gastos Op.',
        '',
        'EBITDA',
        'Margen EBITDA', 
        '',
        'Utilidad Neta'
    ]
}

# Mix of date formats
mixed_months = ['Jan/24', 'Feb/24', 'Mar/24', 'Q1-2024 Total', 'Apr/24', 'May/24', 
                'Jun/24', 'Q2-2024 Total', 'Jul/24', 'Aug/24', 'Sep/24', 'Q3-2024 Total']

for i, month in enumerate(mixed_months):
    if 'Total' in month:
        # Quarterly totals
        pnl_mixed[month] = [''] * len(pnl_mixed['Cuenta'])
    else:
        ventas_prod = np.random.randint(120000, 180000)
        servicios = np.random.randint(50000, 80000)
        total_rev = ventas_prod + servicios
        
        materia_prima = int(total_rev * 0.35)
        mano_obra = int(total_rev * 0.25)
        total_cogs = materia_prima + mano_obra
        
        utilidad_bruta = total_rev - total_cogs
        margen_bruto = f"{(utilidad_bruta/total_rev)*100:.1f}%"
        
        admin = int(total_rev * 0.10)
        ventas = int(total_rev * 0.08)
        total_gastos = admin + ventas
        
        ebitda = utilidad_bruta - total_gastos
        margen_ebitda = f"{(ebitda/total_rev)*100:.1f}%"
        
        utilidad_neta = int(ebitda * 0.75)
        
        pnl_mixed[month] = [
            '', ventas_prod, servicios, total_rev,
            '', '', materia_prima, mano_obra, total_cogs,
            '', utilidad_bruta, margen_bruto,
            '', '', admin, ventas, total_gastos,
            '', ebitda, margen_ebitda, '', utilidad_neta
        ]

df_pnl_mixed = pd.DataFrame(pnl_mixed)
df_pnl_mixed.to_excel('/Users/diegovarela/AI Agents/warren/test-data/PnL_NonStandard_Mixed_2024.xlsx', index=False)

print("\nTest files created successfully in /Users/diegovarela/AI Agents/warren/test-data/:")
print("1. Cashflow_Standard_2024.xlsx - Standard English format")
print("2. Cashflow_NonStandard_Spanish_2024.xlsx - Spanish format to test AI wizard")
print("3. PnL_Standard_2024.xlsx - Standard English P&L")
print("4. PnL_NonStandard_Mixed_2024.xlsx - Mixed language format to test AI wizard")