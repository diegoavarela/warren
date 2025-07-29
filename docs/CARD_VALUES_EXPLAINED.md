# Where Each Card Value Comes From - Simple Explanation

## Overview
Each card in the P&L dashboard shows a value that comes from your uploaded Excel file. The system looks for specific account names or categories to calculate each value.

---

## 1. REVENUE Card 💰
**Where it comes from:**
- The system looks for line items marked as "revenue" category
- It searches for accounts with names like:
  - "Ingresos"
  - "Ventas" 
  - "Sales"
  - "Revenue"
  - Any line item categorized as "revenue" during mapping

**How it's calculated:**
- Takes all revenue line items
- Adds them together
- Shows the total

---

## 2. GROSS PROFIT Card 📊
**Where it comes from:**
- This is a calculated value, not directly from Excel

**How it's calculated:**
- Takes the REVENUE total
- Subtracts the COGS total
- Result = Gross Profit

**Formula:** Revenue - Cost of Goods Sold = Gross Profit

---

## 3. GROSS MARGIN % Card 📈
**Where it comes from:**
- This is a calculated percentage

**How it's calculated:**
- Takes the Gross Profit
- Divides by Revenue
- Multiplies by 100 to get percentage

**Formula:** (Gross Profit ÷ Revenue) × 100 = Gross Margin %

---

## 4. COGS (Cost of Goods Sold) Card 📦
**Where it comes from:**
- The system looks for line items marked as "cogs" category
- It searches for accounts with names like:
  - "Costo de Ventas"
  - "Cost of Goods Sold"
  - "COGS"
  - "Costos Directos"
  - Any line item categorized as "cogs" during mapping

**How it's calculated:**
- Takes all COGS line items
- Adds them together
- Shows the total

---

## 5. OPERATING EXPENSES Card 💼
**Where it comes from:**
- The system looks for line items marked as "operating_expenses" category
- It searches for accounts with names like:
  - "Gastos Operativos"
  - "Operating Expenses"
  - "Gastos de Administración"
  - "Gastos de Venta"
  - Any line item categorized as "operating_expenses" during mapping

**How it's calculated:**
- Takes all operating expense line items
- Adds them together
- Shows the total

---

## 6. OPERATING INCOME Card 💵
**Where it comes from:**
- This is a calculated value

**How it's calculated:**
- Takes the Gross Profit
- Subtracts Operating Expenses
- Result = Operating Income

**Formula:** Gross Profit - Operating Expenses = Operating Income

---

## 7. OPERATING MARGIN % Card 📊
**Where it comes from:**
- This is a calculated percentage

**How it's calculated:**
- Takes the Operating Income
- Divides by Revenue
- Multiplies by 100 to get percentage

**Formula:** (Operating Income ÷ Revenue) × 100 = Operating Margin %

---

## 8. NET INCOME Card 💰
**Where it comes from:**
- FIRST: The system looks for a line item specifically labeled as Net Income:
  - "Utilidad Neta"
  - "Net Income"
  - "Net Profit"
  - "Resultado Neto"
- IF NOT FOUND: It calculates it

**How it's calculated (if not found directly):**
- Takes Operating Income
- Adds Other Income
- Subtracts Other Expenses
- Subtracts Taxes
- Result = Net Income

---

## 9. NET MARGIN % Card 📈
**Where it comes from:**
- This is a calculated percentage

**How it's calculated:**
- Takes the Net Income
- Divides by Revenue
- Multiplies by 100 to get percentage

**Formula:** (Net Income ÷ Revenue) × 100 = Net Margin %

---

## 10. EBITDA Card 💎
**Where it comes from:**
- FIRST: The system looks for a line item specifically labeled as EBITDA:
  - "EBITDA"
  - "EBIT"
- IF NOT FOUND: It uses Operating Income as an approximation

---

## 11. EBITDA MARGIN % Card 📊
**Where it comes from:**
- This is a calculated percentage

**How it's calculated:**
- Takes the EBITDA
- Divides by Revenue
- Multiplies by 100 to get percentage

**Formula:** (EBITDA ÷ Revenue) × 100 = EBITDA Margin %

---

## 12. YTD (Year to Date) Section 📅
**Where it comes from:**
- Adds up all the monthly values for the current year

**How it's calculated:**
- For each metric (Revenue, COGS, etc.)
- Takes the value from each month of the current year
- Adds them all together
- Shows the total for the year so far

---

## IMPORTANT NOTES:

### About Units 📏
- If your Excel has values in THOUSANDS (like 150 meaning 150,000), the system multiplies by 1,000
- If your Excel has values in MILLIONS (like 1.5 meaning 1,500,000), the system multiplies by 1,000,000
- This is detected during the upload process

### About Currency 💱
- The system detects the original currency from your Excel file
- It can convert between currencies (USD, MXN, EUR, etc.)
- The conversion happens automatically based on exchange rates

### About Period Selection 📆
- When you select a specific month, the system looks for that month's column in your Excel
- Each line item can have different values for different months
- The system reads the value for the selected month

---

## Common Problems and Solutions:

### Problem: "My revenue is showing as 150 instead of 150,000"
**Solution:** The system didn't detect that your values are in thousands. Check the units setting during upload.

### Problem: "My values are in MXN but showing as USD"
**Solution:** The system didn't detect the correct currency. Check the currency setting.

### Problem: "Some categories are showing as zero"
**Solution:** The line items weren't categorized correctly during the mapping process. They need to be marked as "revenue", "cogs", or "operating_expenses".

### Problem: "The totals don't match my Excel"
**Solution:** Check if some line items were skipped during mapping or if the categories were assigned incorrectly.

---

## How to Verify:

1. **Check your Excel file** - Note down the totals for Revenue, COGS, and Operating Expenses
2. **Check the mapping** - Make sure each line item was assigned the correct category
3. **Check the units** - Verify if your numbers are in thousands or millions
4. **Check the currency** - Confirm the original currency is detected correctly
5. **Check the period** - Make sure you're looking at the same month/period as in your Excel