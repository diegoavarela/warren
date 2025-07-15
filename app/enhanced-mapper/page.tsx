"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { readExcelFile } from "@/lib/excel-reader";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { 
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline";
import { detectTotalRows, TotalDetectionResult } from "@/lib/total-detection";
import { LocalAccountClassifier } from "@/lib/local-classifier";
import { useTranslation } from "@/lib/translations";
import { MainCategoryDropdown } from "@/components/MainCategoryDropdown";
import { SubcategoryDropdown } from "@/components/SubcategoryDropdown";
import { WorkflowBreadcrumbs } from "@/components/Breadcrumbs";

interface AccountNode {
  id: string;
  rowIndex: number;
  accountName: string;
  accountCode?: string;
  category: string;
  subcategory?: string;
  isInflow: boolean;
  isTotal: boolean;
  isSubtotal: boolean;
  isExpanded: boolean;
  children: AccountNode[];
  parentId: string | null;
  confidence: number;
  periods: Record<string, number>;
  hasFinancialData: boolean;
  isCalculated?: boolean;
  isSectionHeader?: boolean;
  isActive: boolean; // New property for row deactivation
}

function EnhancedMapperContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { user } = useAuth();
  const { t } = useTranslation(locale);
  
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState<string>("Inicializando...");
  const [excelData, setExcelData] = useState<any[][] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  
  // Enhanced UI State
  const [accountTree, setAccountTree] = useState<AccountNode[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);
  const [aiAnalysisComplete, setAiAnalysisComplete] = useState(false);
  const [detectedStructure, setDetectedStructure] = useState<any>(null);
  const [periodColumns, setPeriodColumns] = useState<any[]>([]);
  const [currency, setCurrency] = useState<string>("USD");
  const [showPreview, setShowPreview] = useState(true);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  
  // Click-to-edit states
  const [editingAccountType, setEditingAccountType] = useState(false);
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Data period range state
  const [actualDataRange, setActualDataRange] = useState<{first: string, last: string} | null>(null);
  
  // Column width states for resizable columns
  const [columnWidths, setColumnWidths] = useState({
    row: 4, // Row numbers
    type: 6, // Super compact type selector
    account: 18, // Account name
    mainCategory: 24, // Main category
    subcategory: 24, // Subcategory  
    amount: 14 // Amount column
    // Total: 90% - leaves 10% for padding/gaps
  });
  // Main categories structure
  const [mainCategories] = useState([
    { value: 'revenue', label: 'Revenue', isInflow: true },
    { value: 'cogs', label: 'Cost of Sales', isInflow: false },
    { value: 'operating_expenses', label: 'Operating Expenses', isInflow: false },
    { value: 'financial_expenses', label: 'Financial Expenses', isInflow: false },
    { value: 'taxes', label: 'Taxes', isInflow: false },
    { value: 'profitability_metrics', label: 'Profitability Metrics', isInflow: false },
    { value: 'margin_ratios', label: 'Margin & Ratios', isInflow: false },
    { value: 'financial_calculations', label: 'Financial Calculations', isInflow: false },
    { value: 'other', label: 'Other', isInflow: false }
  ]);

  // Subcategories by main category
  const [subcategoriesData] = useState({
    revenue: [
      { value: 'sales', label: 'Sales' },
      { value: 'services', label: 'Services' },
      { value: 'other_income', label: 'Other Income' },
      { value: 'interest_income', label: 'Interest Income' },
      { value: 'investment_income', label: 'Investment Income' }
    ],
    cogs: [
      { value: 'materials', label: 'Materials' },
      { value: 'direct_labor', label: 'Direct Labor' },
      { value: 'manufacturing', label: 'Manufacturing Costs' },
      { value: 'inventory', label: 'Inventory' },
      { value: 'direct_costs', label: 'Direct Costs' }
    ],
    operating_expenses: [
      { value: 'salaries', label: 'Salaries & Wages' },
      { value: 'rent', label: 'Rent' },
      { value: 'utilities', label: 'Utilities' },
      { value: 'marketing', label: 'Marketing & Advertising' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'travel', label: 'Travel & Entertainment' },
      { value: 'banking', label: 'Banking Fees' },
      { value: 'office_supplies', label: 'Office Supplies' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'depreciation', label: 'Depreciation' },
      { value: 'amortization', label: 'Amortization' }
    ],
    financial_expenses: [
      { value: 'interest_expense', label: 'Interest Expense' },
      { value: 'bank_fees', label: 'Bank Fees' },
      { value: 'foreign_exchange', label: 'Foreign Exchange' },
      { value: 'financial_costs', label: 'Other Financial Costs' }
    ],
    taxes: [
      { value: 'income_tax', label: 'Income Tax' },
      { value: 'vat', label: 'VAT' },
      { value: 'payroll_taxes', label: 'Payroll Taxes' },
      { value: 'property_taxes', label: 'Property Taxes' },
      { value: 'other_taxes', label: 'Other Taxes' }
    ],
    other: [
      { value: 'extraordinary_items', label: 'Extraordinary Items' },
      { value: 'other_expenses', label: 'Other Expenses' },
      { value: 'miscellaneous', label: 'Miscellaneous' }
    ],
    // Calculated fields don't typically need subcategories, but we'll provide empty arrays
    profitability_metrics: [],
    margin_ratios: [],
    financial_calculations: []
  });

  // Custom subcategories (user-added)
  const [customSubcategories, setCustomSubcategories] = useState({});
  
  // Company context
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // Helper function to get subcategories for a main category
  const getSubcategoriesForMainCategory = (mainCategory: string) => {
    const standard = (subcategoriesData as any)[mainCategory] || [];
    const custom = (customSubcategories as any)[mainCategory] || [];
    return [...standard, ...custom];
  };

  // Helper function to add custom subcategory
  const addCustomSubcategory = (mainCategory: string, subcategory: { value: string; label: string }) => {
    setCustomSubcategories(prev => ({
      ...prev,
      [mainCategory]: [...((prev as any)[mainCategory] || []), subcategory]
    }));
  };

  // Helper function to get account type
  const getAccountType = (node: AccountNode): string => {
    if (node.isSectionHeader) return 'header';
    if (node.isCalculated) return 'calculated';
    if (node.isTotal) return 'total';
    return 'detail';
  };

  // Helper function to update account classification type
  const updateAccountClassificationType = (accountId: string, newType: string) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          return {
            ...node,
            isSectionHeader: newType === 'header',
            isCalculated: newType === 'calculated',
            isTotal: newType === 'total',
            // Clear subcategory if not detail type
            subcategory: newType === 'detail' ? node.subcategory : ''
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
    
    // Update selected account if it's the one being modified
    if (selectedAccount && selectedAccount.id === accountId) {
      setSelectedAccount({
        ...selectedAccount,
        isSectionHeader: newType === 'header',
        isCalculated: newType === 'calculated',
        isTotal: newType === 'total',
        subcategory: newType === 'detail' ? selectedAccount.subcategory : ''
      });
    }
  };

  // Helper function to map old category to new main category and subcategory
  const mapOldCategoryToNew = (oldCategory: string) => {
    const categoryMapping = {
      // Revenue mappings
      'revenue': { main: 'revenue', sub: 'sales' },
      'sales': { main: 'revenue', sub: 'sales' },
      'other_income': { main: 'revenue', sub: 'other_income' },
      'interest_income': { main: 'revenue', sub: 'interest_income' },
      'investment_income': { main: 'revenue', sub: 'investment_income' },
      'service_revenue': { main: 'revenue', sub: 'services' },
      'services': { main: 'revenue', sub: 'services' },
      
      // COGS mappings
      'cost_of_sales': { main: 'cogs', sub: 'materials' },
      'cost_of_goods_sold': { main: 'cogs', sub: 'materials' },
      'direct_costs': { main: 'cogs', sub: 'direct_costs' },
      'materials': { main: 'cogs', sub: 'materials' },
      'inventory': { main: 'cogs', sub: 'inventory' },
      
      // Operating expenses mappings
      'operating_expenses': { main: 'operating_expenses', sub: 'salaries' },
      'personnel_costs': { main: 'operating_expenses', sub: 'salaries' },
      'salaries': { main: 'operating_expenses', sub: 'salaries' },
      'benefits': { main: 'operating_expenses', sub: 'salaries' },
      'rent': { main: 'operating_expenses', sub: 'rent' },
      'utilities': { main: 'operating_expenses', sub: 'utilities' },
      'marketing': { main: 'operating_expenses', sub: 'marketing' },
      'professional_services': { main: 'operating_expenses', sub: 'professional_services' },
      'insurance': { main: 'operating_expenses', sub: 'insurance' },
      'office_supplies': { main: 'operating_expenses', sub: 'office_supplies' },
      'travel': { main: 'operating_expenses', sub: 'travel' },
      'maintenance': { main: 'operating_expenses', sub: 'maintenance' },
      'depreciation': { main: 'operating_expenses', sub: 'depreciation' },
      'amortization': { main: 'operating_expenses', sub: 'amortization' },
      
      // Financial expenses mappings
      'financial_costs': { main: 'financial_expenses', sub: 'financial_costs' },
      'interest_expense': { main: 'financial_expenses', sub: 'interest_expense' },
      'bank_fees': { main: 'financial_expenses', sub: 'bank_fees' },
      'foreign_exchange': { main: 'financial_expenses', sub: 'foreign_exchange' },
      
      // Tax mappings
      'taxes': { main: 'taxes', sub: 'income_tax' },
      'income_tax': { main: 'taxes', sub: 'income_tax' },
      'vat': { main: 'taxes', sub: 'vat' },
      'payroll_taxes': { main: 'taxes', sub: 'payroll_taxes' },
      'property_taxes': { main: 'taxes', sub: 'property_taxes' },
      
      // Other mappings
      'other_expenses': { main: 'other', sub: 'other_expenses' },
      'extraordinary_items': { main: 'other', sub: 'extraordinary_items' },
      'other': { main: 'other', sub: 'miscellaneous' }
    };
    
    // Check if we have a direct mapping
    if ((categoryMapping as any)[oldCategory]) {
      return (categoryMapping as any)[oldCategory];
    }
    
    // Try to match partial keywords for unmapped categories
    const lowerCategory = oldCategory.toLowerCase();
    
    // Revenue keywords
    if (lowerCategory.includes('revenue') || lowerCategory.includes('income') || 
        lowerCategory.includes('sales') || lowerCategory.includes('service')) {
      return { main: 'revenue', sub: 'sales' };
    }
    
    // Cost keywords  
    if (lowerCategory.includes('cost') || lowerCategory.includes('cogs') ||
        lowerCategory.includes('material') || lowerCategory.includes('direct')) {
      return { main: 'cogs', sub: 'materials' };
    }
    
    // Expense keywords
    if (lowerCategory.includes('expense') || lowerCategory.includes('operating') ||
        lowerCategory.includes('admin') || lowerCategory.includes('overhead')) {
      return { main: 'operating_expenses', sub: 'salaries' };
    }
    
    // Tax keywords
    if (lowerCategory.includes('tax') || lowerCategory.includes('impuesto')) {
      return { main: 'taxes', sub: 'income_tax' };
    }
    
    // Calculated profit/income metrics
    if (lowerCategory.includes('gross_profit') || lowerCategory.includes('net_profit') ||
        lowerCategory.includes('operating_profit') || lowerCategory.includes('ebitda') ||
        lowerCategory.includes('ebit') || lowerCategory.includes('utilidad_bruta') ||
        lowerCategory.includes('utilidad_neta') || lowerCategory.includes('utilidad_operativa')) {
      return { main: 'profitability_metrics', sub: '' };
    }
    
    // Margin and ratio metrics
    if (lowerCategory.includes('margin') || lowerCategory.includes('margen') ||
        lowerCategory.includes('ratio') || lowerCategory.includes('%')) {
      return { main: 'margin_ratios', sub: '' };
    }
    
    // Other financial calculations
    if (lowerCategory.includes('working_capital') || lowerCategory.includes('cash_flow') ||
        lowerCategory.includes('depreciation') || lowerCategory.includes('amortization')) {
      return { main: 'financial_calculations', sub: '' };
    }
    
    // Default fallback
    return { main: 'other', sub: 'miscellaneous' };
  };

  // Helper function to update account category and subcategory
  const updateAccountCategoryAndSubcategory = (accountId: string, mainCategory: string, subcategory: string) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          // Update isInflow based on main category
          const categoryInfo = mainCategories.find(cat => cat.value === mainCategory);
          const isInflow = categoryInfo?.isInflow || false;
          
          return { 
            ...node, 
            category: mainCategory,
            subcategory: subcategory,
            isInflow: isInflow
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
    
    // Update selected account if it's the one being modified
    if (selectedAccount && selectedAccount.id === accountId) {
      const categoryInfo = mainCategories.find(cat => cat.value === mainCategory);
      const isInflow = categoryInfo?.isInflow || false;
      
      setSelectedAccount({ 
        ...selectedAccount, 
        category: mainCategory,
        subcategory: subcategory,
        isInflow: isInflow
      });
    }
  };

  useEffect(() => {
    loadExcelData();
  }, [searchParams]);

  const loadExcelData = async () => {
    try {
      setLoadingStep("Verificando datos de sesión...");
      const uploadSession = searchParams.get('session') || sessionStorage.getItem('uploadSession');
      const uploadedFileStr = sessionStorage.getItem('uploadedFile');
      
      // Get company context
      const preSelectedCompanyId = sessionStorage.getItem('selectedCompanyId');
      if (preSelectedCompanyId) {
        setSelectedCompanyId(preSelectedCompanyId);
        // Fetch company details
        try {
          const response = await fetch(`/api/v1/companies/${preSelectedCompanyId}`);
          if (response.ok) {
            const data = await response.json();
            setSelectedCompany(data.data);
          }
        } catch (err) {
          console.warn('Failed to fetch company details:', err);
        }
      }
      
      if (!uploadSession || !uploadedFileStr) {
        throw new Error('No se encontró archivo cargado');
      }

      const uploadedFile = JSON.parse(uploadedFileStr);
      setFileName(uploadedFile.fileName);

      setLoadingStep("Recuperando datos del archivo...");
      // Get file from server
      const fileDataResponse = await fetch(`/api/upload-session/${uploadSession}`);
      if (!fileDataResponse.ok) {
        throw new Error('No se pudo recuperar el archivo');
      }
      
      const fileDataResult = await fileDataResponse.json();
      const fileDataBase64 = fileDataResult.fileData;
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(fileDataBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      setLoadingStep("Analizando estructura del documento...");
      const selectedSheetName = searchParams.get('sheet') || sessionStorage.getItem('selectedSheet');
      const selectedSheet = uploadedFile.sheets.find((s: any) => s.name === selectedSheetName) || 
                           uploadedFile.sheets.find((s: any) => s.hasData) || 
                           uploadedFile.sheets[0];
      setSheetName(selectedSheet.name);
      
      const data = await readExcelFile(bytes.buffer, selectedSheet.name);
      setExcelData(data.rawData);
      
      // Debug: Show Excel structure for period detection
      console.log("🔍 Excel structure analysis for period detection:");
      for (let i = 0; i < Math.min(5, data.rawData.length); i++) {
        console.log(`Row ${i}:`, data.rawData[i]?.slice(0, 15)); // Show first 15 columns
      }
      
      // Manual period detection before AI analysis
      console.log("🔍 Running manual period detection...");
      const manualPeriods = detectPeriodColumns(data.rawData);
      console.log("Manual period detection result:", manualPeriods);
      
      // Start AI analysis
      await runAIAnalysis(data.rawData);
      
    } catch (err) {
      console.error('Error loading Excel data:', err);
      setLoadingStep("Error al cargar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async (rawData: any[][]) => {
    setLoadingStep("🤖 Analizando con Inteligencia Artificial...");
    
    try {
      // Run AI analysis - send first 30 rows for structure detection only
      const response = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          rawData: rawData.slice(0, Math.min(30, rawData.length)),
          fileName: fileName
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const { structure, classifications } = result.data;
        setDetectedStructure(structure);
        
        // If AI didn't detect period columns, fall back to local detection
        let finalPeriodColumns = structure.periodColumns || [];
        if (finalPeriodColumns.length === 0) {
          console.log('⚠️ AI did not detect period columns, falling back to local detection');
          finalPeriodColumns = detectPeriodColumns(rawData);
          console.log('🔍 Local detection found:', finalPeriodColumns.length, 'period columns');
        }
        
        setPeriodColumns(finalPeriodColumns);
        setCurrency(structure.currency || "USD");
        
        // Calculate actual data range
        if (finalPeriodColumns.length > 0) {
          setActualDataRange({
            first: finalPeriodColumns[0].label,
            last: finalPeriodColumns[finalPeriodColumns.length - 1].label
          });
        }
        
        // Build account tree with AI + local detection
        const tree = buildAccountTree(rawData, { ...structure, periodColumns: finalPeriodColumns }, classifications);
        setAccountTree(tree);
        setAiAnalysisComplete(true);
      } else {
        // Fallback to local detection only
        console.log('⚠️ AI analysis failed, using local detection only');
        const localPeriods = detectPeriodColumns(rawData);
        setPeriodColumns(localPeriods);
        
        // Set actual data range
        if (localPeriods.length > 0) {
          setActualDataRange({
            first: localPeriods[0].label,
            last: localPeriods[localPeriods.length - 1].label
          });
        }
        
        const tree = buildAccountTreeLocal(rawData);
        setAccountTree(tree);
        setAiAnalysisComplete(true);
      }
    } catch (error) {
      console.error('AI Analysis failed:', error);
      // Fallback to local detection
      console.log('⚠️ AI analysis error, using local detection only');
      const localPeriods = detectPeriodColumns(rawData);
      setPeriodColumns(localPeriods);
      
      // Set actual data range
      if (localPeriods.length > 0) {
        setActualDataRange({
          first: localPeriods[0].label,
          last: localPeriods[localPeriods.length - 1].label
        });
      }
      
      const tree = buildAccountTreeLocal(rawData);
      setAccountTree(tree);
      setAiAnalysisComplete(true);
    }
  };

  const buildAccountTree = (rawData: any[][], structure: any, aiClassifications: any[]): AccountNode[] => {
    const accountNameCol = structure?.accountColumns?.nameColumn || 0;
    const dataStartRow = structure?.dataStartRow || 3;
    // Process ALL rows in the Excel file, not just what AI detected
    const dataEndRow = rawData.length - 1;
    
    // Detect totals first
    const detectedTotals = detectTotalRows(rawData, {}, accountNameCol, dataStartRow);
    const totalRowIndices = new Set(detectedTotals.map(t => t.rowIndex));
    
    // Create a map of AI classifications
    const aiClassMap = new Map(
      aiClassifications.map(c => [c.accountName.toLowerCase(), c])
    );
    
    const allNodes: AccountNode[] = [];
    const nodeMap = new Map<number, AccountNode>();
    
    console.log(`📊 Processing Excel data: rows ${dataStartRow} to ${dataEndRow} (total: ${rawData.length} rows)`);
    
    // Process all rows in data range
    let processedCount = 0;
    let skippedCount = 0;
    for (let i = dataStartRow; i <= dataEndRow && i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) {
        skippedCount++;
        continue;
      }
      
      const accountName = row[accountNameCol];
      
      // Skip completely empty rows or rows without account names
      if (!accountName || !String(accountName).trim()) {
        // Check if row has any financial data even without a name
        let hasAnyData = false;
        for (let j = 1; j < row.length; j++) {
          if (row[j] && String(row[j]).trim() && !isNaN(parseFloat(String(row[j]).replace(/[^0-9.-]/g, '')))) {
            hasAnyData = true;
            break;
          }
        }
        if (!hasAnyData) {
          skippedCount++;
          continue;
        }
      }
      
      processedCount++;
      
      const cleanName = String(accountName).trim();
      const isTotal = totalRowIndices.has(i);
      const totalInfo = detectedTotals.find(t => t.rowIndex === i);
      
      // Check if this is a calculated field (gross profit, margin, etc.)
      const isCalculatedField = isCalculatedFieldName(cleanName);
      
      // Get classification from AI or local
      let classification = aiClassMap.get(cleanName.toLowerCase());
      if (!classification) {
        const localClass = LocalAccountClassifier.classifyAccount(
          cleanName,
          row[1], // First value column
          { statementType: structure?.statementType || 'profit_loss' }
        );
        classification = {
          accountName: cleanName,
          suggestedCategory: localClass.suggestedCategory,
          isInflow: localClass.isInflow,
          confidence: localClass.confidence
        };
      }
      
      // Extract period data
      const periodData: Record<string, number> = {};
      structure?.periodColumns?.forEach((pc: any) => {
        const value = row[pc.columnIndex];
        if (value !== null && value !== undefined && value !== '') {
          const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
          if (!isNaN(numericValue)) {
            periodData[pc.periodLabel] = numericValue;
          }
        }
      });
      
      // Map AI category to our dropdown categories
      let mappedCategory = mapOldCategoryToNew(classification.suggestedCategory);
      
      // Override category for calculated fields
      if (isCalculatedField) {
        const lowerName = cleanName.toLowerCase();
        if (lowerName.includes('margin') || lowerName.includes('margen') || lowerName.includes('%')) {
          mappedCategory = { main: 'margin_ratios', sub: '' };
        } else if (lowerName.includes('profit') || lowerName.includes('utilidad') || 
                   lowerName.includes('ebitda') || lowerName.includes('ebit')) {
          mappedCategory = { main: 'profitability_metrics', sub: '' };
        } else {
          mappedCategory = { main: 'financial_calculations', sub: '' };
        }
      }
      
      const node: AccountNode = {
        id: `row_${i}`,
        rowIndex: i,
        accountName: cleanName,
        category: mappedCategory.main,
        subcategory: mappedCategory.sub,
        isInflow: classification.isInflow,
        isTotal: isTotal,
        isSubtotal: (totalInfo as any)?.type === 'subtotal',
        isExpanded: true,
        children: [],
        parentId: null,
        confidence: classification.confidence,
        periods: periodData,
        hasFinancialData: Object.keys(periodData).length > 0,
        isCalculated: isCalculatedField,
        isActive: true // Default to active
      };
      
      nodeMap.set(i, node);
      allNodes.push(node);
    }
    
    console.log(`✅ Processed ${processedCount} accounts from Excel (found ${allNodes.length} valid items, skipped ${skippedCount} empty rows)`);
    
    // Build hierarchy preserving Excel order
    return buildExcelOrderTree(allNodes);
  };

  const buildAccountTreeLocal = (rawData: any[][]): AccountNode[] => {
    // Fallback local-only detection - process ALL rows
    const structure = {
      accountColumns: { nameColumn: 0 },
      dataStartRow: 3,
      dataEndRow: rawData.length - 1,
      periodColumns: detectPeriodColumns(rawData)
    };
    
    return buildAccountTree(rawData, structure, []);
  };

  const detectPeriodColumns = (rawData: any[][]): any[] => {
    // Enhanced period detection - check multiple rows for period headers
    const periodCols: any[] = [];
    
    // Check rows 1, 2, and 3 for period headers (Excel files often have periods in different rows)
    const rowsToCheck = [rawData[1], rawData[2], rawData[3]].filter(row => row && row.length > 0);
    
    console.log('🔍 Detecting periods from multiple header rows:');
    rowsToCheck.forEach((row, rowIndex) => {
      console.log(`Header row ${rowIndex + 1}:`, row?.slice(0, 15));
    });
    
    // Find the row with the most period-like patterns
    let bestRow = null;
    let bestScore = 0;
    
    rowsToCheck.forEach((row, rowIndex) => {
      let score = 0;
      row.forEach((cell, colIndex) => {
        if (cell && colIndex > 0) {
          const cellStr = String(cell).trim();
          
          // Enhanced period patterns including your format (Jan-25, Feb-25, etc.)
          if (cellStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-_]\d{2,4}$/i) ||
              cellStr.match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[-_]\d{2,4}$/i) ||
              cellStr.match(/^\d{1,2}[-/]\d{2,4}$/) ||
              cellStr.match(/^q[1-4][-_]\d{2,4}$/i) ||
              cellStr.match(/^[12]\d{3}$/) ||
              cellStr === 'TOTAL' || cellStr === 'Total') {
            score++;
          }
        }
      });
      
      console.log(`Row ${rowIndex + 1} period score: ${score}`);
      if (score > bestScore) {
        bestScore = score;
        bestRow = row;
      }
    });
    
    if (bestRow) {
      console.log('🎯 Best period header row found with score:', bestScore);
      
      // First pass: collect all potential period columns
      const allPotentialPeriods: any[] = [];
      (bestRow as any[]).forEach((cell: any, index: number) => {
        if (cell && index > 0) { // Skip first column (account names)
          const cellStr = String(cell).trim();
          
          // Enhanced period patterns
          const isPeriod = cellStr.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-_]\d{2,4}$/i) ||
                          cellStr.match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)[-_]\d{2,4}$/i) ||
                          cellStr.match(/^\d{1,2}[-/]\d{2,4}$/) ||
                          cellStr.match(/^q[1-4][-_]\d{2,4}$/i) ||
                          cellStr.match(/^[12]\d{3}$/) ||
                          cellStr === 'TOTAL' || cellStr === 'Total';
          
          if (isPeriod) {
            allPotentialPeriods.push({
              columnIndex: index,
              periodLabel: cellStr,
              label: cellStr,
              periodType: 'month'
            });
          }
        }
      });
      
      console.log(`🔍 Found ${allPotentialPeriods.length} potential period columns`);
      
      // Second pass: validate which periods actually have data
      console.log('📊 Validating periods with actual data...');
      const dataStartRow = 4; // Assuming data starts at row 4
      
      allPotentialPeriods.forEach(period => {
        let hasData = false;
        let nonZeroCount = 0;
        let totalValues = 0;
        
        // Check data in this column across multiple rows
        for (let rowIdx = dataStartRow; rowIdx < Math.min(rawData.length, dataStartRow + 50); rowIdx++) {
          const row = rawData[rowIdx];
          if (row && row[period.columnIndex] !== null && row[period.columnIndex] !== undefined) {
            const value = row[period.columnIndex];
            const valueStr = String(value).trim();
            
            // Skip empty cells and obvious non-numeric data
            if (valueStr && valueStr !== '' && valueStr !== '-' && valueStr !== '0' && valueStr !== '$-') {
              // Try to parse as number
              const numericValue = typeof value === 'number' ? value : parseFloat(valueStr.replace(/[^0-9.-]/g, ''));
              if (!isNaN(numericValue)) {
                totalValues++;
                if (numericValue !== 0) {
                  nonZeroCount++;
                  hasData = true;
                }
              }
            }
          }
        }
        
        console.log(`Period "${period.label}" - Total values: ${totalValues}, Non-zero: ${nonZeroCount}, Has data: ${hasData}`);
        
        // Only include periods that have actual non-zero data
        if (hasData) {
          periodCols.push(period);
          console.log(`✅ Period "${period.label}" has data - included`);
        } else {
          console.log(`❌ Period "${period.label}" has no data - excluded`);
        }
      });
    }
    
    console.log(`🎉 Final result: ${periodCols.length} periods with actual data:`, periodCols.map(p => p.label));
    return periodCols;
  };

  const toggleAccountExpanded = (accountId: string) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
  };

  const toggleRowActive = (accountId: string) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          return { ...node, isActive: !node.isActive };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
  };

  const updateAccountCategory = (accountId: string, newCategory: string) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          // Update isInflow based on category
          const isInflow = ['revenue', 'other_income'].includes(newCategory);
          return { ...node, category: newCategory, isInflow };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
    
    // Update selected account if it's the one being modified
    if (selectedAccount && selectedAccount.id === accountId) {
      const isInflow = ['revenue', 'other_income'].includes(newCategory);
      setSelectedAccount({ ...selectedAccount, category: newCategory, isInflow });
    }
  };

  const updateAccountType = (accountId: string, isInflow: boolean) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          // Also update category if it doesn't match the type
          let category = node.category;
          if (isInflow && !['revenue', 'other_income'].includes(category)) {
            category = 'revenue';
          } else if (!isInflow && ['revenue', 'other_income'].includes(category)) {
            category = 'operating_expenses';
          }
          return { ...node, isInflow, category };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
    
    // Update selected account if it's the one being modified
    if (selectedAccount && selectedAccount.id === accountId) {
      let category = selectedAccount.category;
      if (isInflow && !['revenue', 'other_income'].includes(category)) {
        category = 'revenue';
      } else if (!isInflow && ['revenue', 'other_income'].includes(category)) {
        category = 'operating_expenses';
      }
      setSelectedAccount({ ...selectedAccount, isInflow, category });
    }
  };

  const updateAccountTotalStatus = (accountId: string, isTotal: boolean, isCalculated: boolean) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          return { 
            ...node, 
            isTotal: isTotal && !isCalculated,
            isCalculated: isCalculated,
            isSubtotal: false, // Reset subtotal when manually setting
            isSectionHeader: false // Reset section header when setting other types
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
    
    // Update selected account if it's the one being modified
    if (selectedAccount && selectedAccount.id === accountId) {
      setSelectedAccount({ 
        ...selectedAccount, 
        isTotal: isTotal && !isCalculated,
        isCalculated: isCalculated,
        isSubtotal: false,
        isSectionHeader: false
      });
    }
  };

  const updateAccountSectionHeader = (accountId: string, isSectionHeader: boolean) => {
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          return { 
            ...node, 
            isSectionHeader: isSectionHeader,
            isTotal: false,
            isCalculated: false,
            isSubtotal: false
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    
    setAccountTree(updateNode(accountTree));
    
    // Update selected account if it's the one being modified
    if (selectedAccount && selectedAccount.id === accountId) {
      setSelectedAccount({ 
        ...selectedAccount, 
        isSectionHeader: isSectionHeader,
        isTotal: false,
        isCalculated: false,
        isSubtotal: false
      });
    }
  };

  const findNodeById = (node: AccountNode, id: string): AccountNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  const findNodeInTree = (nodes: AccountNode[], id: string): AccountNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node, id);
      if (found) return found;
    }
    return null;
  };

  const isCalculatedFieldName = (name: string): boolean => {
    const lowerName = name.toLowerCase();
    const calculatedKeywords = [
      'gross profit', 'gross margin', 'utilidad bruta', 'margen bruto',
      'net profit', 'net margin', 'utilidad neta', 'margen neto',
      'operating profit', 'operating margin', 'utilidad operativa', 'margen operativo',
      'ebitda', 'ebit', 'profit margin', 'margen de ganancia',
      'gross income', 'ingreso bruto', 'operating income', 'ingreso operativo'
    ];
    
    return calculatedKeywords.some(keyword => lowerName.includes(keyword));
  };

  const getValidationStats = () => {
    const activeAccounts = accountTree.filter(node => node.isActive);
    const nonHeaderAccounts = activeAccounts.filter(node => !node.isSectionHeader);
    const categorized = nonHeaderAccounts.filter(node => {
      // Must have main category
      if (!node.category || node.category === 'uncategorized') return false;
      
      // If it's a detail type, must also have subcategory
      if (getAccountType(node) === 'detail') {
        return node.subcategory && node.subcategory.trim() !== '';
      }
      
      // For non-detail types (total, calculated, header), just need main category
      return true;
    }).length;
    const uncategorized = nonHeaderAccounts.length - categorized;
    
    return {
      total: nonHeaderAccounts.length,
      categorized,
      uncategorized,
      completionPercentage: nonHeaderAccounts.length > 0 ? (categorized / nonHeaderAccounts.length) * 100 : 0
    };
  };

  const validateMapping = () => {
    const stats = getValidationStats();
    const uncategorizedAccounts = accountTree.filter(node => {
      if (node.isSectionHeader) return false;
      
      // Must have main category
      if (!node.category || node.category === 'uncategorized') return true;
      
      // If it's a detail type, must also have subcategory
      if (getAccountType(node) === 'detail') {
        return !node.subcategory || node.subcategory.trim() === '';
      }
      
      // For non-detail types, we're good if we have main category
      return false;
    });
    
    if (stats.uncategorized > 0) {
      // Focus on first uncategorized account
      if (uncategorizedAccounts.length > 0) {
        setSelectedAccount(uncategorizedAccounts[0]);
      }
      
      alert(`Faltan ${stats.uncategorized} cuentas por categorizar:\n\n${
        uncategorizedAccounts.slice(0, 5).map(acc => `• ${acc.accountName}`).join('\n')
      }${uncategorizedAccounts.length > 5 ? '\n• ...' : ''}\n\nPor favor categoriza todas las cuentas antes de guardar.`);
    } else {
      alert(`✅ Mapeo completo!\n\n${stats.total} cuentas categorizadas correctamente.\nPuedes proceder a guardar.`);
    }
  };

  const buildExcelOrderTree = (allNodes: AccountNode[]): AccountNode[] => {
    // Simply return all nodes sorted by Excel row order
    // This preserves the EXACT Excel structure without any reorganization
    return [...allNodes].sort((a, b) => a.rowIndex - b.rowIndex);
  };

  const renderAccountTree = (nodes: AccountNode[], level: number = 0): JSX.Element[] => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={`
            border-b border-gray-200 hover:bg-blue-50 hover:border-l-4 hover:border-blue-300 transition-all duration-200
            ${!node.isActive ? 'opacity-50' : ''}
            ${selectedAccount?.id === node.id 
              ? 'bg-blue-100 border-l-4 border-blue-600 shadow-sm' 
              : node.isSectionHeader 
                ? 'bg-purple-50 border-l-4 border-purple-400' 
                : node.isTotal 
                  ? 'bg-slate-100 border-l-4 border-slate-500 font-semibold' 
                  : node.isCalculated
                    ? 'bg-amber-50 border-l-4 border-amber-400'
                    : node.category && node.category !== 'uncategorized' 
                      ? 'bg-green-50 border-l-4 border-green-300' 
                      : 'border-l-4 border-red-200 bg-red-50'}
          `}
        >
          <div className="flex gap-2 px-4 py-3 items-center min-h-[60px]">
            {/* Row Number */}
            <div style={{ width: `${columnWidths.row}%` }} className="flex-shrink-0">
              <button
                onClick={() => toggleRowActive(node.id)}
                className={`
                  flex items-center justify-center w-8 h-8 rounded text-xs font-mono border transition-all
                  ${node.isActive 
                    ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 border-gray-300 hover:bg-gray-200'
                  }
                  hover:shadow-sm cursor-pointer
                `}
                title={node.isActive ? 'Click to exclude row' : 'Click to include row'}
              >
                {node.rowIndex + 1}
              </button>
            </div>
            
            {/* Type Selector */}
            <div style={{ width: `${columnWidths.type}%` }} className="flex-shrink-0">
              {editingAccountType && selectedAccount?.id === node.id ? (
                <select
                  value={getAccountType(node)}
                  onChange={(e) => {
                    updateAccountClassificationType(node.id, e.target.value);
                    setEditingAccountType(false);
                    setSelectedAccount(null);
                  }}
                  className="w-full text-xs border border-gray-300 rounded px-1 py-1 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                >
                  <option value="detail">Detail</option>
                  <option value="total">Total</option>
                  <option value="calculated">Calculated</option>
                  <option value="header">Header</option>
                </select>
              ) : (
                <button
                  onClick={() => {
                    setSelectedAccount(node);
                    setEditingAccountType(true);
                  }}
                  className="w-full flex items-center justify-center gap-1 py-2 px-1 rounded border border-gray-200 hover:border-blue-300 hover:bg-white transition-colors text-xs min-h-[40px]"
                >
                  {node.isSectionHeader ? (
                    <FolderIcon className="w-3 h-3 text-purple-500 flex-shrink-0" />
                  ) : node.isCalculated ? (
                    <SparklesIcon className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  ) : node.isTotal ? (
                    <CurrencyDollarIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <DocumentIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium leading-none">
                    {node.isSectionHeader ? 'Hdr' : node.isCalculated ? 'Cal' : node.isTotal ? 'Tot' : 'Det'}
                  </span>
                  <span className={`text-xs leading-none ${
                    node.isCalculated ? 'text-amber-600' : node.isInflow ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {node.isCalculated ? '=' : node.isInflow ? '↗' : '↘'}
                  </span>
                </button>
              )}
            </div>
            
            {/* Account Name */}
            <div style={{ width: `${columnWidths.account}%` }} className="flex-shrink-0 pr-2">
              <div className="flex flex-col justify-center">
                <span className={`text-sm break-words leading-tight ${
                  node.isSectionHeader ? 'text-purple-900 font-bold uppercase text-xs' :
                  node.isCalculated ? 'text-amber-900 font-semibold' :
                  node.isTotal ? 'text-slate-900 font-bold' : 'text-gray-800 font-medium'
                }`}>
                  {node.accountName}
                </span>
                {/* Add a subtle description based on type */}
                <span className={`text-xs mt-0.5 ${
                  node.isTotal ? 'text-slate-600 font-medium' : 'text-gray-500'
                }`}>
                  {node.isSectionHeader ? 'Section Header' :
                   node.isCalculated ? 'Calculated Field' :
                   node.isTotal ? 'Total/Subtotal' : 'Detail Account'}
                </span>
              </div>
            </div>
            
            {/* Main Category */}
            <div style={{ width: `${columnWidths.mainCategory}%` }} className="flex-shrink-0">
              <MainCategoryDropdown
                value={node.category}
                onChange={(mainCategory) => {
                  updateAccountCategoryAndSubcategory(node.id, mainCategory, '');
                }}
                categories={mainCategories}
                placeholder="Select main category..."
                className="w-full"
              />
            </div>
            
            {/* Subcategory */}
            <div style={{ width: `${columnWidths.subcategory}%` }} className="flex-shrink-0">
              {getAccountType(node) === 'detail' ? (
                <SubcategoryDropdown
                  value={node.subcategory || ''}
                  onChange={(subcategory) => {
                    updateAccountCategoryAndSubcategory(node.id, node.category, subcategory);
                  }}
                  subcategories={getSubcategoriesForMainCategory(node.category)}
                  onAddSubcategory={(newSubcategory) => {
                    addCustomSubcategory(node.category, newSubcategory);
                  }}
                  placeholder="Select subcategory..."
                  className="w-full"
                  disabled={!node.category || node.category === 'uncategorized'}
                />
              ) : (
                <div className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm">
                  {node.isTotal ? '—' : node.isCalculated ? '—' : node.isSectionHeader ? '—' : 'N/A'}
                </div>
              )}
            </div>
            
            {/* Amount */}
            <div style={{ width: `${columnWidths.amount}%` }} className="flex-shrink-0 px-2">
              <div className="flex items-center justify-end gap-2 min-h-[40px]">
                {/* Validation indicator on the left */}
                {!node.isSectionHeader && (
                  <span className={`text-sm ${
                    // Check if categorization is complete based on account type
                    (!node.category || node.category === 'uncategorized' || 
                     (getAccountType(node) === 'detail' && !node.subcategory))
                      ? 'text-red-500' 
                      : 'text-green-500'
                  }`}>
                    {(!node.category || node.category === 'uncategorized' || 
                      (getAccountType(node) === 'detail' && !node.subcategory)) ? '⚠️' : '✓'}
                  </span>
                )}
                
                {/* Amount on the right */}
                {node.hasFinancialData && Object.values(node.periods).length > 0 ? (
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {Object.values(node.periods)[0]?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Object.keys(node.periods)[0]}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 font-medium">-</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const handleComplete = async () => {
    // Convert tree to flat structure for persistence
    const flattenTree = (nodes: AccountNode[], parentId: string | null = null): any[] => {
      const result: any[] = [];
      
      nodes.forEach(node => {
        // Only include active rows in the final export
        if (!node.isActive) return;
        
        result.push({
          rowIndex: node.rowIndex,
          accountCode: node.accountCode || `ROW_${node.rowIndex}`,
          accountName: node.accountName,
          originalAccountName: node.accountName, // Add this for compatibility
          category: node.category,
          subcategory: getAccountType(node) === 'detail' ? (node.subcategory || null) : null, // Only include subcategory for detail accounts
          isInflow: node.isInflow,
          isTotal: node.isTotal,
          isSubtotal: node.isSubtotal,
          isCalculated: node.isCalculated || false, // Add this field
          isSectionHeader: node.isSectionHeader || false, // Add this field
          parentTotalId: parentId,
          periods: node.periods,
          amount: Object.values(node.periods)[0] || 0, // Add primary amount
          isValid: true,
          hasFinancialData: node.hasFinancialData,
          confidence: node.confidence,
          detectedAsTotal: node.isTotal,
          totalConfidence: node.confidence
        });
        
        if (node.children.length > 0) {
          result.push(...flattenTree(node.children, node.id));
        }
      });
      
      return result;
    };
    
    const allAccounts = flattenTree(accountTree);
    
    // Generate period columns from the first account that has period data
    const generatePeriodColumns = () => {
      const firstAccountWithData = accountTree.find(node => node.hasFinancialData && Object.keys(node.periods).length > 0);
      if (firstAccountWithData) {
        return Object.keys(firstAccountWithData.periods).map((periodKey, index) => ({
          columnIndex: index,
          periodLabel: periodKey,
          label: periodKey
        }));
      }
      return [];
    };
    
    // Prepare data for persistence
    const accountMapping = {
      statementType: detectedStructure?.statementType || 'profit_loss',
      currency: currency,
      periodColumns: periodColumns.length > 0 ? periodColumns : generatePeriodColumns(),
      accounts: allAccounts,
      hierarchyDetected: true,
      totalItemsCount: allAccounts.length,
      totalRowsCount: allAccounts.filter(a => a.isTotal).length,
      detailRowsCount: allAccounts.filter(a => !a.isTotal && a.hasFinancialData).length
    };
    
    const validationResults = {
      totalRows: allAccounts.length,
      validRows: allAccounts.length,
      invalidRows: 0,
      warnings: [],
      errors: [],
      data: allAccounts
    };
    
    // Debug logging
    console.log('Enhanced Mapper - Saving data:', {
      periodColumns: accountMapping.periodColumns,
      periodColumnsCount: accountMapping.periodColumns.length,
      accountsCount: allAccounts.length,
      companyId: selectedCompanyId,
      statementType: accountMapping.statementType,
      currency: accountMapping.currency
    });
    
    // Store for persistence
    sessionStorage.setItem('validationResults', JSON.stringify(validationResults));
    sessionStorage.setItem('accountMapping', JSON.stringify(accountMapping));
    sessionStorage.setItem('selectedCompanyId', selectedCompanyId);
    
    // Navigate to persist
    router.push('/persist');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppLayout showFooter={false}>
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600 mb-2">Cargando Enhanced Mapper</p>
              <p className="text-sm text-blue-600 font-medium">{loadingStep}</p>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout showFooter={false}>
        <div className="flex flex-col h-screen bg-gray-50">
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
            {/* Breadcrumbs */}
            <div className="mb-3">
              <WorkflowBreadcrumbs 
                currentStep="map-accounts" 
                fileName={fileName}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-gray-900 truncate">Enhanced Financial Mapper</h1>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <DocumentTextIcon className="w-3 h-3" />
                    <span className="truncate max-w-32">{fileName}</span>
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-24">{sheetName}</span>
                  <span>•</span>
                  <span className="whitespace-nowrap font-semibold text-blue-600">
                    {accountTree.filter(n => n.isActive).length}/{accountTree.length} cuentas activas
                  </span>
                  <span>•</span>
                  <span className={`whitespace-nowrap font-medium ${
                    getValidationStats().uncategorized > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {getValidationStats().categorized}/{getValidationStats().total} mapeadas
                  </span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          getValidationStats().uncategorized > 0 ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${getValidationStats().completionPercentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      getValidationStats().uncategorized > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {Math.round(getValidationStats().completionPercentage)}%
                    </span>
                  </div>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    <span className="whitespace-nowrap font-medium text-purple-600">
                      {periodColumns.length} periodos con datos
                    </span>
                  </span>
                  {actualDataRange && (
                    <>
                      <span>•</span>
                      <span className="text-xs text-green-600 font-medium max-w-40 truncate">
                        {actualDataRange.first} → {actualDataRange.last}
                      </span>
                    </>
                  )}
                  {periodColumns.length > 0 && !actualDataRange && (
                    <>
                      <span>•</span>
                      <span className="text-xs text-gray-500 max-w-40 truncate">
                        {periodColumns.slice(0, 3).map(p => p.label).join(', ')}
                        {periodColumns.length > 3 && '...'}
                      </span>
                    </>
                  )}
                  {selectedCompany && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <BuildingOfficeIcon className="w-3 h-3" />
                        <span className="truncate max-w-32">{selectedCompany.name}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {aiAnalysisComplete && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">AI Complete</span>
                  </span>
                )}
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {showPreview ? 'Ocultar' : 'Preview'}
                </button>
                <button
                  onClick={validateMapping}
                  className={`px-3 py-1.5 text-xs border rounded-lg flex items-center gap-1 ${
                    getValidationStats().uncategorized > 0 
                      ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' 
                      : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {getValidationStats().uncategorized > 0 ? '⚠️' : '✓'} Validate
                </button>
                <button
                  onClick={handleComplete}
                  disabled={getValidationStats().uncategorized > 0}
                  className={`px-4 py-1.5 rounded-lg flex items-center gap-1 text-xs ${
                    getValidationStats().uncategorized > 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>
          </div>
          
          {/* Main Content - Full width account list */}
          <div className="flex-1 flex min-h-0">
            {/* Full Width Account Panel */}
            <div className="w-full bg-white flex flex-col">
              <div className="flex-shrink-0 p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Structure</h2>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Categorize each account by selecting its main category and subcategory</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowHelpModal(true)}
                      className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="How this works - Step by step guide"
                    >
                      <QuestionMarkCircleIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => runAIAnalysis(excelData!)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      Re-analyze
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Column Headers */}
              <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="flex gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div style={{ width: `${columnWidths.row}%` }} className="flex-shrink-0">Row</div>
                  <div style={{ width: `${columnWidths.type}%` }} className="flex-shrink-0">Type</div>
                  <div style={{ width: `${columnWidths.account}%` }} className="flex-shrink-0">Account Name</div>
                  <div style={{ width: `${columnWidths.mainCategory}%` }} className="flex-shrink-0">Main Category</div>
                  <div style={{ width: `${columnWidths.subcategory}%` }} className="flex-shrink-0">Subcategory</div>
                  <div style={{ width: `${columnWidths.amount}%` }} className="flex-shrink-0 text-right px-2">Amount</div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {accountTree.length > 0 ? (
                  renderAccountTree(accountTree)
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">Analizando estructura...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {locale === 'es' ? '¿Cómo funciona el Mapeador Financiero?' : 'How does the Financial Mapper work?'}
                </h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {locale === 'es' ? (
                  // Spanish content
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 Resumen del Proceso</h4>
                      <p className="text-blue-800">
                        El Mapeador Financiero te ayuda a categorizar automáticamente las cuentas de tu estado financiero 
                        utilizando Inteligencia Artificial, y luego te permite ajustar manualmente cada categorización.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">🚀 Pasos Detallados:</h4>
                      
                      <div className="grid gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Análisis Automático con IA</h5>
                              <p className="text-gray-600 mt-1">
                                • La IA examina los nombres de las cuentas (ej: "SRL Services", "LLC transfers")<br/>
                                • Detecta automáticamente el tipo: Detalle, Total, Calculado, o Encabezado<br/>
                                • Asigna una categoría principal (Ingresos, Costos, Gastos, etc.)<br/>
                                • Sugiere una subcategoría específica
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Código de Colores y Revisión Visual</h5>
                              <p className="text-gray-600 mt-1 mb-3">
                                <strong>Estado de las filas (bordes izquierdos):</strong><br/>
                                • <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-green-800">Verde</span>: Cuentas completamente categorizadas ✅<br/>
                                • <span className="px-2 py-1 bg-red-50 border border-red-200 rounded text-red-800">Rojo</span>: Cuentas que requieren categorización ⚠️<br/>
                                • <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-800">Morado</span>: Encabezados de sección 📁<br/>
                                • <span className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 font-semibold">Gris Oscuro</span>: Cuentas de totales 🧮<br/>
                                • <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-800">Ámbar</span>: Campos calculados 🧮<br/>
                                • <span className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800">Azul</span>: Cuenta seleccionada actualmente
                              </p>
                              <p className="text-gray-600 mt-1">
                                <strong>Indicadores de validación (columna de montos):</strong><br/>
                                • <span className="text-green-600">✓</span> = Categorización completa<br/>
                                • <span className="text-red-500">⚠️</span> = Faltan categorías o subcategorías
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">💰</div>
                            <div>
                              <h5 className="font-semibold text-emerald-900">¿Por qué Categorizar? Beneficios Clave</h5>
                              <p className="text-emerald-800 mt-1 mb-2">
                                <strong>Las categorías transforman datos contables en información estratégica:</strong>
                              </p>
                              <ul className="text-emerald-700 space-y-1 text-sm">
                                <li>• <strong>Análisis Financiero Automatizado</strong>: Genera gráficos, tendencias y KPIs automáticamente</li>
                                <li>• <strong>Comparación Temporal</strong>: Compara el mismo tipo de gastos/ingresos entre períodos</li>
                                <li>• <strong>Identificación de Oportunidades</strong>: Detecta dónde ahorrar o invertir más</li>
                                <li>• <strong>Reportes Profesionales</strong>: Crea dashboards ejecutivos y reportes para inversionistas</li>
                                <li>• <strong>Cumplimiento y Auditorías</strong>: Facilita la preparación de estados financieros estándar</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Edición Manual - Qué Hacer</h5>
                              <p className="text-gray-600 mt-1 mb-2">
                                <strong>Tu objetivo:</strong> Todas las filas deben estar en <span className="text-green-600">verde ✅</span>
                              </p>
                              <p className="text-gray-600 mt-1">
                                • <strong>Tipo</strong>: Haz clic en Det/Tot/Cal/Hdr para cambiar el tipo de cuenta<br/>
                                • <strong>Categoría Principal</strong>: Selecciona la naturaleza del gasto/ingreso (ej: Marketing, Ventas, Costos)<br/>
                                • <strong>Subcategoría</strong>: Especifica el detalle (ej: Marketing Digital, Publicidad Online)<br/>
                                • <strong>Solo cuentas "Detalle"</strong> necesitan subcategoría - los totales no<br/>
                                • Los cambios se guardan automáticamente
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-orange-100 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Control de Filas</h5>
                              <p className="text-gray-600 mt-1">
                                • <strong>Navegación:</strong> Usa la barra de navegación (breadcrumbs) para moverte entre pasos<br/>
                                • <strong>Activar/Desactivar filas:</strong> Haz clic en el número de fila para excluir cuentas innecesarias<br/>
                                • <strong>Filas inactivas:</strong> Se muestran con opacidad reducida y se excluyen del guardado<br/>
                                • <strong>Contador activo:</strong> El header muestra cuántas filas están activas del total
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-amber-100 text-amber-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">5</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Validación y Guardado</h5>
                              <p className="text-gray-600 mt-1">
                                • Usa "Validar" para verificar que todas las cuentas estén categorizadas<br/>
                                • El progreso se muestra en tiempo real en la parte superior<br/>
                                • "Guardar" se habilita solo cuando todo esté completo<br/>
                                • Los datos se envían al dashboard para análisis
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                      <h5 className="font-semibold text-yellow-900 mb-2">💡 Guía Práctica de Categorización:</h5>
                      <div className="text-yellow-800 space-y-2 text-sm">
                        <div>
                          <strong>Reglas de Tipos:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• <strong>Detalle (Det)</strong>: Cuentas específicas - requieren categoría Y subcategoría</li>
                            <li>• <strong>Total (Tot)</strong>: Sumas - solo requieren categoría principal</li>
                            <li>• <strong>Calculado (Cal)</strong>: Fórmulas - solo requieren categoría principal</li>
                            <li>• <strong>Encabezado (Hdr)</strong>: Títulos de sección - no requieren categorías</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Ejemplos de Categorización:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• "Gastos Google Ads" → Marketing &gt; Publicidad Digital</li>
                            <li>• "Sueldos Enero" → Personal &gt; Salarios Base</li>
                            <li>• "Ventas Producto A" → Ingresos &gt; Ventas Directas</li>
                            <li>• "Total Gastos" → Gastos Operativos (sin subcategoría)</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Tips Rápidos:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• Enfócate primero en filas rojas ⚠️</li>
                            <li>• Usa "Validar" para verificar progreso</li>
                            <li>• Un solo clic abre categorías - ¡más rápido!</li>
                            <li>• Haz clic en números de fila para desactivar cuentas innecesarias</li>
                            <li>• Re-analiza si modificas mucho el archivo</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // English content
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <h4 className="font-semibold text-blue-900 mb-2">📋 Process Overview</h4>
                      <p className="text-blue-800">
                        The Financial Mapper helps you automatically categorize your financial statement accounts 
                        using Artificial Intelligence, then allows you to manually adjust each categorization.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">🚀 Detailed Steps:</h4>
                      
                      <div className="grid gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Automatic AI Analysis</h5>
                              <p className="text-gray-600 mt-1">
                                • AI examines account names (e.g.: "SRL Services", "LLC transfers")<br/>
                                • Automatically detects type: Detail, Total, Calculated, or Header<br/>
                                • Assigns a main category (Revenue, Costs, Expenses, etc.)<br/>
                                • Suggests a specific subcategory
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Color Coding & Visual Review</h5>
                              <p className="text-gray-600 mt-1 mb-3">
                                <strong>Row status (left borders):</strong><br/>
                                • <span className="px-2 py-1 bg-green-50 border border-green-200 rounded text-green-800">Green</span>: Fully categorized accounts ✅<br/>
                                • <span className="px-2 py-1 bg-red-50 border border-red-200 rounded text-red-800">Red</span>: Accounts requiring categorization ⚠️<br/>
                                • <span className="px-2 py-1 bg-purple-50 border border-purple-200 rounded text-purple-800">Purple</span>: Section headers 📁<br/>
                                • <span className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800 font-semibold">Dark Gray</span>: Total accounts 🧮<br/>
                                • <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-amber-800">Amber</span>: Calculated fields 🧮<br/>
                                • <span className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-blue-800">Blue</span>: Currently selected account
                              </p>
                              <p className="text-gray-600 mt-1">
                                <strong>Validation indicators (amount column):</strong><br/>
                                • <span className="text-green-600">✓</span> = Complete categorization<br/>
                                • <span className="text-red-500">⚠️</span> = Missing categories or subcategories
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-emerald-100 text-emerald-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">💰</div>
                            <div>
                              <h5 className="font-semibold text-emerald-900">Why Categorize? Key Benefits</h5>
                              <p className="text-emerald-800 mt-1 mb-2">
                                <strong>Categories transform accounting data into strategic insights:</strong>
                              </p>
                              <ul className="text-emerald-700 space-y-1 text-sm">
                                <li>• <strong>Automated Financial Analysis</strong>: Generate charts, trends, and KPIs automatically</li>
                                <li>• <strong>Time-Based Comparisons</strong>: Compare same expense/income types across periods</li>
                                <li>• <strong>Opportunity Identification</strong>: Spot where to save money or invest more</li>
                                <li>• <strong>Professional Reports</strong>: Create executive dashboards and investor reports</li>
                                <li>• <strong>Compliance & Audits</strong>: Streamline preparation of standard financial statements</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Manual Editing - What To Do</h5>
                              <p className="text-gray-600 mt-1 mb-2">
                                <strong>Your goal:</strong> All rows should be <span className="text-green-600">green ✅</span>
                              </p>
                              <p className="text-gray-600 mt-1">
                                • <strong>Type</strong>: Click on Det/Tot/Cal/Hdr to change account type<br/>
                                • <strong>Main Category</strong>: Select the nature of expense/income (e.g., Marketing, Sales, Costs)<br/>
                                • <strong>Subcategory</strong>: Specify the detail (e.g., Digital Marketing, Online Advertising)<br/>
                                • <strong>Only "Detail" accounts</strong> need subcategories - totals don't<br/>
                                • Changes are saved automatically
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-orange-100 text-orange-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Row Control</h5>
                              <p className="text-gray-600 mt-1">
                                • <strong>Navigation:</strong> Use breadcrumb navigation to move between steps<br/>
                                • <strong>Activate/Deactivate rows:</strong> Click row numbers to exclude unnecessary accounts<br/>
                                • <strong>Inactive rows:</strong> Shown with reduced opacity and excluded from save<br/>
                                • <strong>Active counter:</strong> Header shows how many rows are active out of total
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="bg-amber-100 text-amber-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">5</div>
                            <div>
                              <h5 className="font-semibold text-gray-900">Validation and Save</h5>
                              <p className="text-gray-600 mt-1">
                                • Use "Validate" to check that all accounts are categorized<br/>
                                • Progress is shown in real-time at the top<br/>
                                • "Save" is enabled only when everything is complete<br/>
                                • Data is sent to dashboard for analysis
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                      <h5 className="font-semibold text-yellow-900 mb-2">💡 Practical Categorization Guide:</h5>
                      <div className="text-yellow-800 space-y-2 text-sm">
                        <div>
                          <strong>Type Rules:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• <strong>Detail (Det)</strong>: Specific accounts - require category AND subcategory</li>
                            <li>• <strong>Total (Tot)</strong>: Sums - only require main category</li>
                            <li>• <strong>Calculated (Cal)</strong>: Formulas - only require main category</li>
                            <li>• <strong>Header (Hdr)</strong>: Section titles - no categories needed</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Categorization Examples:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• "Google Ads Expense" → Marketing &gt; Digital Advertising</li>
                            <li>• "January Salaries" → Personnel &gt; Base Salaries</li>
                            <li>• "Product A Sales" → Revenue &gt; Direct Sales</li>
                            <li>• "Total Expenses" → Operating Expenses (no subcategory)</li>
                          </ul>
                        </div>
                        <div>
                          <strong>Quick Tips:</strong>
                          <ul className="ml-4 mt-1 space-y-1">
                            <li>• Focus on red rows first ⚠️</li>
                            <li>• Use "Validate" to check progress</li>
                            <li>• Single-click opens categories - faster!</li>
                            <li>• Click row numbers to deactivate unnecessary accounts</li>
                            <li>• Re-analyze if you modify the file significantly</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {locale === 'es' ? 'Entendido' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Management Modal */}
        {showCategoryManagement && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Gestionar Categorías</h3>
                <button
                  onClick={() => setShowCategoryManagement(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Aquí puedes agregar, editar o eliminar categorías personalizadas para tu organización.
                  </p>
                  
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-2">Próximamente:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Agregar categorías personalizadas</li>
                      <li>• Editar nombres de categorías existentes</li>
                      <li>• Crear subcategorías</li>
                      <li>• Importar/exportar configuraciones</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowCategoryManagement(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}

export default function EnhancedMapperPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <EnhancedMapperContent />
    </Suspense>
  );
}