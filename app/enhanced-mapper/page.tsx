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
  QuestionMarkCircleIcon,
  ChartBarIcon
} from "@heroicons/react/24/outline";
import { detectTotalRows, TotalDetectionResult } from "@/lib/total-detection";
import { LocalAccountClassifier } from "@/lib/local-classifier";
import { useTranslation } from "@/lib/translations";
import { MainCategoryDropdown } from "@/components/MainCategoryDropdown";
import { SubcategoryDropdown } from "@/components/SubcategoryDropdown";

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
  const [units, setUnits] = useState<string>("normal");
  const [showPreview, setShowPreview] = useState(true);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  
  // Click-to-edit states
  const [editingAccountType, setEditingAccountType] = useState(false);
  const [isSettingSubcategory, setIsSettingSubcategory] = useState(false);
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Data period range state
  const [actualDataRange, setActualDataRange] = useState<{first: string, last: string} | null>(null);
  
  // Bulk assignment state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignHeaderId, setBulkAssignHeaderId] = useState<string | null>(null);
  const [bulkAssignCategory, setBulkAssignCategory] = useState<string>('');
  const [bulkAssignSubcategory, setBulkAssignSubcategory] = useState<string>('');
  const [selectedChildrenIds, setSelectedChildrenIds] = useState<string[]>([]);
  const [bulkAssignProgress, setBulkAssignProgress] = useState(false);
  const [bulkAssignSuccess, setBulkAssignSuccess] = useState<string | null>(null);
  const [bulkAssignError, setBulkAssignError] = useState<string | null>(null);
  
  // Column width states for resizable columns
  const [columnWidths, setColumnWidths] = useState({
    row: 5, // Row numbers
    type: 8, // Type selector
    account: 22, // Account name - reduced for better layout
    mainCategory: 28, // Main category - increased for better visibility
    subcategory: 25, // Subcategory  
    amount: 12 // Amount column - right-aligned
    // Total: 100% - uses full width
  });
  // Main categories structure with locale-based labels
  const mainCategories = [
    // Regular account categories
    { value: 'revenue', label: locale?.startsWith('es') ? 'Ingresos' : 'Revenue', isInflow: true, isOutflow: false },
    { value: 'cogs', label: locale?.startsWith('es') ? 'Costo de Ventas' : 'Cost of Sales', isInflow: false, isOutflow: true },
    { value: 'operating_expenses', label: locale?.startsWith('es') ? 'Gastos Operativos' : 'Operating Expenses', isInflow: false, isOutflow: true },
    { value: 'other_income', label: locale?.startsWith('es') ? 'Otros Ingresos' : 'Other Income', isInflow: true, isOutflow: false },
    { value: 'other_expenses', label: locale?.startsWith('es') ? 'Otros Gastos' : 'Other Expenses', isInflow: false, isOutflow: true },
    { value: 'taxes', label: locale?.startsWith('es') ? 'Impuestos' : 'Taxes', isInflow: false, isOutflow: true },
    
    // Special categories for totals and calculations
    { value: 'total', label: locale?.startsWith('es') ? '📊 Total (ej. Ingresos Totales, Utilidad Bruta)' : '📊 Total (e.g., Total Revenue, Gross Profit)', isInflow: true, isOutflow: false },
    { value: 'margin', label: locale?.startsWith('es') ? '📈 Margen % (ej. Margen Bruto %, Margen Neto %)' : '📈 Margin % (e.g., Gross Margin %, Net Margin %)', isInflow: false, isOutflow: false },
    { value: 'calculation', label: locale?.startsWith('es') ? '🧮 Cálculo (ej. EBITDA, Utilidad Operativa)' : '🧮 Calculation (e.g., EBITDA, Operating Income)', isInflow: true, isOutflow: false },
    
    // Other
    { value: 'other', label: locale?.startsWith('es') ? 'Otro' : 'Other', isInflow: false, isOutflow: true }
  ];

  // Subcategories organized by income/outcome type
  const [subcategoriesData] = useState({
    income: [
      { value: 'sales', label: 'Sales' },
      { value: 'services', label: 'Services' },
      { value: 'other_income', label: 'Other Income' },
      { value: 'interest_income', label: 'Interest Income' },
      { value: 'investment_income', label: 'Investment Income' },
      { value: 'extraordinary_income', label: 'Extraordinary Income' },
      { value: 'gain_on_sale', label: 'Gain on Sale' },
      { value: 'miscellaneous_income', label: 'Miscellaneous Income' }
    ],
    outcome: [
      // Labor & Personnel
      { value: 'salaries', label: 'Salaries & Wages' },
      { value: 'direct_labor', label: 'Direct Labor' },
      { value: 'payroll_taxes', label: 'Payroll Taxes' },
      { value: 'employee_benefits', label: 'Employee Benefits' },
      { value: 'contractor_fees', label: 'Contractor Fees' },
      
      // Materials & Inventory
      { value: 'materials', label: 'Materials' },
      { value: 'inventory', label: 'Inventory' },
      { value: 'manufacturing', label: 'Manufacturing Costs' },
      { value: 'direct_costs', label: 'Direct Costs' },
      { value: 'production_supplies', label: 'Production Supplies' },
      
      // Operating Expenses
      { value: 'rent', label: 'Rent' },
      { value: 'utilities', label: 'Utilities' },
      { value: 'marketing', label: 'Marketing & Advertising' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'travel', label: 'Travel & Entertainment' },
      { value: 'office_supplies', label: 'Office Supplies' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'technology', label: 'Technology & Software' },
      { value: 'communications', label: 'Communications' },
      
      // Financial & Accounting
      { value: 'interest_expense', label: 'Interest Expense' },
      { value: 'bank_fees', label: 'Bank Fees' },
      { value: 'banking', label: 'Banking Fees' },
      { value: 'foreign_exchange', label: 'Foreign Exchange' },
      { value: 'financial_costs', label: 'Other Financial Costs' },
      { value: 'depreciation', label: 'Depreciation' },
      { value: 'amortization', label: 'Amortization' },
      
      // Taxes
      { value: 'income_tax', label: 'Income Tax' },
      { value: 'vat', label: 'VAT' },
      { value: 'property_taxes', label: 'Property Taxes' },
      { value: 'other_taxes', label: 'Other Taxes' },
      
      // Other Expenses
      { value: 'extraordinary_items', label: 'Extraordinary Items' },
      { value: 'other_expenses', label: 'Other Expenses' },
      { value: 'miscellaneous', label: 'Miscellaneous' }
    ]
  });

  // Custom subcategories (user-added)
  const [customSubcategories, setCustomSubcategories] = useState({});
  
  // Template subcategories (loaded from active template)
  const [templateSubcategories, setTemplateSubcategories] = useState<{
    income: { value: string; label: string }[];
    outcome: { value: string; label: string }[];
  }>({
    income: [],
    outcome: []
  });
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  
  // Company context
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // Helper function to get subcategories for a main category based on income/outcome
  const getSubcategoriesForMainCategory = (mainCategory: string, isInflow: boolean): { value: string; label: string }[] => {
    const selectedCategory = mainCategories.find(cat => cat.value === mainCategory);
    if (!selectedCategory) return [];
    
    let availableSubcategories: { value: string; label: string }[] = [];
    
    // First try to get subcategories from the active template, then fall back to defaults
    if (selectedCategory.isInflow && isInflow) {
      // Always include default subcategories
      availableSubcategories = [...subcategoriesData.income];
      // Add template subcategories if available (they might have custom ones)
      if (templateSubcategories.income.length > 0) {
        // Merge template subcategories with defaults, avoiding duplicates
        const existingValues = new Set(availableSubcategories.map(s => s.value));
        templateSubcategories.income.forEach(sub => {
          if (!existingValues.has(sub.value)) {
            availableSubcategories.push(sub);
          }
        });
      }
    }
    
    if (selectedCategory.isOutflow && !isInflow) {
      // Always include default subcategories
      availableSubcategories = [...subcategoriesData.outcome];
      // Add template subcategories if available (they might have custom ones)
      if (templateSubcategories.outcome.length > 0) {
        // Merge template subcategories with defaults, avoiding duplicates
        const existingValues = new Set(availableSubcategories.map(s => s.value));
        templateSubcategories.outcome.forEach(sub => {
          if (!existingValues.has(sub.value)) {
            availableSubcategories.push(sub);
          }
        });
      }
    }
    
    // Add custom subcategories for this category
    const customKey = `${mainCategory}_${isInflow ? 'income' : 'outcome'}`;
    const custom = (customSubcategories as any)[customKey] || [];
    
    // Combine all subcategories
    const allSubcategories = [...availableSubcategories, ...custom];
    
    // Remove duplicates based on value
    const uniqueMap = new Map<string, { value: string; label: string }>();
    allSubcategories.forEach(sub => {
      if (!uniqueMap.has(sub.value)) {
        uniqueMap.set(sub.value, sub);
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  // Helper function to add custom subcategory
  const addCustomSubcategory = async (mainCategory: string, isInflow: boolean, subcategory: { value: string; label: string }) => {
    const customKey = `${mainCategory}_${isInflow ? 'income' : 'outcome'}`;
    
    // Add to local state immediately
    setCustomSubcategories(prev => ({
      ...prev,
      [customKey]: [...((prev as any)[customKey] || []), subcategory]
    }));
    
    // Save to active template if we have one
    if (activeTemplate && selectedCompanyId) {
      try {
        const endpoint = activeTemplate.source === 'organization' 
          ? `/api/organizations/${selectedCompany?.organizationId}/subcategories`
          : `/api/companies/${selectedCompanyId}/subcategories`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            value: subcategory.value,
            label: subcategory.label,
            mainCategories: [mainCategory],
            templateId: activeTemplate.source === 'organization' ? activeTemplate.id : undefined,
            companyTemplateId: activeTemplate.source === 'company' ? activeTemplate.id : undefined
          })
        });
        
        if (response.ok) {
          // Update template subcategories state
          const targetArray = isInflow ? 'income' : 'outcome';
          setTemplateSubcategories(prev => ({
            ...prev,
            [targetArray]: [...prev[targetArray], subcategory]
          }));
          
          console.log('Subcategory saved to template successfully');
        } else {
          console.warn('Failed to save subcategory to template');
        }
      } catch (error) {
        console.warn('Error saving subcategory to template:', error);
      }
    }
  };

  // Helper function to get account type
  const getAccountType = (node: AccountNode): string => {
    if (node.isSectionHeader) return 'header';
    if (node.isCalculated) return 'calculated';
    if (node.isTotal) return 'total';
    return 'detail';
  };

  // Helper function to get all children of a node recursively
  const getAllChildren = (node: AccountNode): AccountNode[] => {
    let children: AccountNode[] = [];
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        children.push(child);
        children = children.concat(getAllChildren(child));
      }
    }
    
    return children;
  };

  // Helper function to check if account is eligible for bulk assignment
  const getAssignmentEligibility = (node: AccountNode): { eligible: boolean; reason: string } => {
    if (node.isSectionHeader) {
      return { eligible: false, reason: 'Section header' };
    }
    if (node.isCalculated) {
      return { eligible: false, reason: 'Calculated field' };
    }
    if (node.isTotal) {
      return { eligible: false, reason: 'Total/Subtotal' };
    }
    if (!node.isActive) {
      return { eligible: false, reason: 'Deactivated' };
    }
    return { eligible: true, reason: 'Detail account' };
  };

  // Helper function to get all available accounts for manual selection
  const getAllAvailableAccounts = (headerNodeId: string) => {
    try {
      const headerNode = findNodeInTree(accountTree, headerNodeId);
      if (!headerNode) return [];
      
      // Find the index of the header in the account tree
      const headerIndex = accountTree.findIndex(account => account.id === headerNodeId);
      if (headerIndex === -1) return [];
      
      // Get only accounts that come AFTER this header in the tree
      const availableAccounts = [];
      
      for (let i = headerIndex + 1; i < accountTree.length; i++) {
        const account = accountTree[i];
        
        // For maximum flexibility, we have two modes:
        // 1. If there's another header, stop there (section mode)
        // 2. If no more headers, include all remaining accounts
        
        // Only stop at another header if it's a section header
        if (account.isSectionHeader) {
          // Option: Include a setting to control whether to stop at headers
          break;
        }
        
        // Include active accounts that are not empty
        if (account.isActive && account.accountName && account.accountName.trim() !== '') {
          // Additional checks for valid accounts
          const hasData = account.hasFinancialData || 
                         Object.values(account.periods || {}).some(val => val !== 0);
          
          if (hasData || getAccountType(account) === 'detail') {
            availableAccounts.push(account);
          }
        }
      }
      
      // If no accounts found after header, try alternative approach
      if (availableAccounts.length === 0) {
        // Get all non-header active accounts as fallback
        const fallbackAccounts = accountTree.filter((account, index) => 
          index > headerIndex && 
          !account.isSectionHeader && 
          account.isActive &&
          account.accountName && 
          account.accountName.trim() !== ''
        );
        
        return fallbackAccounts.map(account => ({
          ...account,
          eligibility: getAssignmentEligibility(account)
        }));
      }
      
      return availableAccounts.map(account => ({
        ...account,
        eligibility: getAssignmentEligibility(account)
      }));
    } catch (error) {
      console.error('Error getting available accounts:', error);
      return [];
    }
  };

  // Helper function to start bulk assignment
  const startBulkAssignment = (headerNodeId: string) => {
    const headerNode = findNodeInTree(accountTree, headerNodeId);
    if (!headerNode || !headerNode.category) return;
    
    const availableAccounts = getAllAvailableAccounts(headerNodeId);
    const eligibleAccounts = availableAccounts.filter(acc => acc.eligibility.eligible);
    
    setBulkAssignHeaderId(headerNodeId);
    setBulkAssignCategory(headerNode.category);
    setBulkAssignSubcategory(headerNode.subcategory || '');
    // Pre-select eligible accounts by default
    setSelectedChildrenIds(eligibleAccounts.map(acc => acc.id));
    setShowBulkAssignModal(true);
  };

  // Helper function to execute bulk assignment
  const executeBulkAssignment = async () => {
    if (!bulkAssignHeaderId || !bulkAssignCategory || selectedChildrenIds.length === 0) return;
    
    setBulkAssignProgress(true);
    
    try {
      // Apply category to each selected child
      const updateNode = (nodes: AccountNode[]): AccountNode[] => {
        return nodes.map(node => {
          if (selectedChildrenIds.includes(node.id)) {
            // Update isInflow based on main category
            const categoryInfo = mainCategories.find(cat => cat.value === bulkAssignCategory);
            const isInflow = categoryInfo?.isInflow || false;
            
            return {
              ...node,
              category: bulkAssignCategory,
              subcategory: bulkAssignSubcategory,
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
      
      // Close modal and reset state
      setShowBulkAssignModal(false);
      setBulkAssignHeaderId(null);
      setBulkAssignCategory('');
      setBulkAssignSubcategory('');
      setSelectedChildrenIds([]);
      
      // Show success message
      setBulkAssignSuccess(`Successfully applied category to ${selectedChildrenIds.length} accounts`);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setBulkAssignSuccess(null);
      }, 5000);
      
    } catch (error) {
      console.error('Error during bulk assignment:', error);
      setBulkAssignError('Error occurred during bulk assignment. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setBulkAssignError(null);
      }, 5000);
    } finally {
      setBulkAssignProgress(false);
    }
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
    console.log(`📝 Updating account category and subcategory:`, { accountId, mainCategory, subcategory });
    
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          // Update isInflow based on main category
          const categoryInfo = mainCategories.find(cat => cat.value === mainCategory);
          const isInflow = categoryInfo?.isInflow || false;
          
          console.log(`📝 Account "${node.accountName}" updated:`, {
            oldCategory: node.category,
            newCategory: mainCategory,
            oldSubcategory: node.subcategory,
            newSubcategory: subcategory,
            oldIsInflow: node.isInflow,
            newIsInflow: isInflow
          });
          
          // Check if this is causing a type change that might trigger another update
          if (node.isInflow !== isInflow) {
            console.log(`⚠️ Category change is causing income/outcome type change from ${node.isInflow ? 'Income' : 'Outcome'} to ${isInflow ? 'Income' : 'Outcome'}`);
            console.log(`🔧 Preserving subcategory "${subcategory}" despite type change`);
          }
          
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
    
    // Debug: Check if subcategory is preserved after a delay
    setTimeout(() => {
      const currentNode = accountTree.find(node => node.id === accountId);
      if (currentNode && currentNode.subcategory !== subcategory) {
        console.log(`🚨 Subcategory was cleared after update! Expected: "${subcategory}", Current: "${currentNode.subcategory}"`);
      }
    }, 100);
  };

  // Load active template and its subcategories
  const loadActiveTemplate = async (companyId: string) => {
    try {
      // Get active template
      const templateResponse = await fetch(`/api/companies/${companyId}/active-template`);
      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        if (templateData.success && templateData.data) {
          setActiveTemplate(templateData.data);
          
          // Load subcategories from this template
          console.log(`📋 Loading subcategories for template ${templateData.data.id}`);
          const subcategoriesResponse = await fetch(`/api/companies/${companyId}/subcategories/by-template/${templateData.data.id}`);
          if (subcategoriesResponse.ok) {
            const subcategoriesData = await subcategoriesResponse.json();
            console.log(`📊 Subcategories API response:`, {
              success: subcategoriesData.success,
              dataCount: subcategoriesData.data?.length,
              sampleData: subcategoriesData.data?.slice(0, 3)
            });
            if (subcategoriesData.success) {
              const organizedSubcategories: {
                income: { value: string; label: string }[];
                outcome: { value: string; label: string }[];
              } = { income: [], outcome: [] };
              
              // Use Set to track unique subcategories
              const incomeSet = new Set<string>();
              const outcomeSet = new Set<string>();
              
              subcategoriesData.data.forEach((sub: any) => {
                if (sub.mainCategories && Array.isArray(sub.mainCategories)) {
                  sub.mainCategories.forEach((category: string) => {
                    const mainCategory = mainCategories.find(cat => cat.value === category);
                    if (mainCategory) {
                      if (mainCategory.isInflow && !incomeSet.has(sub.value)) {
                        incomeSet.add(sub.value);
                        organizedSubcategories.income.push({
                          value: sub.value,
                          label: sub.label
                        });
                      }
                      if (mainCategory.isOutflow && !outcomeSet.has(sub.value)) {
                        outcomeSet.add(sub.value);
                        organizedSubcategories.outcome.push({
                          value: sub.value,
                          label: sub.label
                        });
                      }
                    }
                  });
                }
              });
              
              console.log(`✅ Organized subcategories:`, {
                incomeCount: organizedSubcategories.income.length,
                outcomeCount: organizedSubcategories.outcome.length,
                income: organizedSubcategories.income.slice(0, 5),
                outcome: organizedSubcategories.outcome.slice(0, 5),
                allIncome: organizedSubcategories.income.map(s => s.value),
                allOutcome: organizedSubcategories.outcome.map(s => s.value)
              });
              
              setTemplateSubcategories(organizedSubcategories);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load active template:', error);
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
            // Load active template and subcategories
            await loadActiveTemplate(preSelectedCompanyId);
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
      
      // Set currency if available from uploaded file
      if (uploadedFile.currency) {
        setCurrency(uploadedFile.currency);
      }
      
      // Set units if available from uploaded file
      if (uploadedFile.selectedUnits) {
        setUnits(uploadedFile.selectedUnits);
      }
      
      // Check if auto-template mode is enabled
      const autoTemplate = searchParams.get('autoTemplate') === 'true';
      let templateToApply = null;
      
      if (autoTemplate && uploadedFile.selectedTemplate) {
        templateToApply = uploadedFile.selectedTemplate;
        console.log('Auto-template mode: applying template', templateToApply);
        console.log('Company ID for template:', preSelectedCompanyId);
        console.log('Selected Company:', selectedCompany);
        setLoadingStep("Aplicando plantilla seleccionada...");
      }

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
      
      // Apply template or run AI analysis
      if (templateToApply) {
        await applyTemplate(templateToApply, data.rawData);
      } else {
        // Start AI analysis
        await runAIAnalysis(data.rawData);
      }
      
    } catch (err) {
      console.error('Error loading Excel data:', err);
      setLoadingStep("Error al cargar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (template: any, rawData: any[][]) => {
    try {
      setLoadingStep("🎯 Aplicando plantilla: " + template.templateName);
      
      // Apply the template using the templates API
      const response = await fetch('/api/v1/templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          rawData: rawData,
          fileName: fileName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to apply template');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setLoadingStep("✅ Plantilla aplicada exitosamente");
        
        // Set currency from template
        if (result.data.currency) {
          setCurrency(result.data.currency);
        }
        
        // Debug: Check what we received
        console.log('📋 Template API response:', {
          templateName: result.data.templateName,
          hasColumnMappings: !!result.data.columnMappings,
          columnMappingsType: typeof result.data.columnMappings,
          hasAccounts: !!(result.data.columnMappings?.accounts),
          accountsCount: result.data.columnMappings?.accounts?.length || 0,
          sampleAccount: result.data.columnMappings?.accounts?.[0]
        });
        
        // Apply the column mappings from template
        if (result.data.columnMappings) {
          setLoadingStep("📋 Aplicando mapeo de columnas...");
          
          // First, load the active template and its subcategories
          const companyId = selectedCompanyId || sessionStorage.getItem('selectedCompanyId') || sessionStorage.getItem('uploadCompanyId');
          if (companyId) {
            console.log('🔄 Loading subcategories for company before template application:', companyId);
            setLoadingStep("🔄 Cargando subcategorías...");
            await loadActiveTemplate(companyId);
          } else {
            console.log('⚠️ No company ID found for loading subcategories');
          }
          
          setLoadingStep("📋 Aplicando mapeo de columnas...");
          await applyTemplateMappings(result.data.columnMappings, rawData);
        }
        
        console.log('✅ Template applied successfully:', template.templateName);
      } else {
        throw new Error(result.error?.message || 'Template application failed');
      }
      
    } catch (error) {
      console.error('❌ Error applying template:', error);
      // Fall back to AI analysis if template fails
      setLoadingStep("🤖 Plantilla falló, usando análisis AI...");
      await runAIAnalysis(rawData);
    }
  };

  const applyTemplateMappings = async (columnMappings: any, rawData: any[][]) => {
    setLoadingStep("🏗️ Construyendo estructura de cuentas...");
    
    // Debug what we received
    console.log('🔍 applyTemplateMappings received:', {
      hasAccounts: !!columnMappings.accounts,
      accountsLength: columnMappings.accounts?.length,
      hasPeriodColumns: !!columnMappings.periodColumns,
      periodColumnsLength: columnMappings.periodColumns?.length,
      sampleMapping: columnMappings.accounts?.[0],
      currentSelectedCompanyId: selectedCompanyId
    });
    
    // Check if columnMappings contains the full account mapping data
    const hasFullMapping = columnMappings.accounts && Array.isArray(columnMappings.accounts);
    
    if (hasFullMapping) {
      // We have the full account mappings saved in the template
      console.log('📋 Applying saved account mappings from template');
      console.log(`📊 Found ${columnMappings.accounts.length} accounts in template`);
      
      // Extract period columns from the saved mapping
      if (columnMappings.periodColumns) {
        setPeriodColumns(columnMappings.periodColumns);
        
        // Set actual data range
        if (columnMappings.periodColumns.length > 0) {
          setActualDataRange({
            first: columnMappings.periodColumns[0].label,
            last: columnMappings.periodColumns[columnMappings.periodColumns.length - 1].label
          });
        }
      }
      
      // Create account nodes from saved mappings
      // We need to update the periods data from the current Excel file
      const nodes: AccountNode[] = columnMappings.accounts.map((savedAccount: any, index: number) => {
        // Get the current row data from rawData
        const currentRowData = rawData[savedAccount.rowIndex];
        const updatedPeriods: Record<string, number> = {};
        
        // Debug subcategory application
        if (index < 5 || !savedAccount.subcategory) {
          const availableSubcategories = getSubcategoriesForMainCategory(savedAccount.category, savedAccount.isInflow);
          console.log(`🔍 Processing template account ${index}:`, {
            accountName: savedAccount.accountName,
            savedSubcategory: savedAccount.subcategory,
            savedCategory: savedAccount.category,
            isInflow: savedAccount.isInflow,
            isTotal: savedAccount.isTotal,
            isCalculated: savedAccount.isCalculated,
            hasSubcategory: !!savedAccount.subcategory,
            availableSubcategoriesCount: availableSubcategories?.length || 0,
            availableSubcategoryValues: availableSubcategories?.map(s => s.value).slice(0, 5) || [],
            subcategoryInAvailable: savedAccount.subcategory ? 
              availableSubcategories?.some(s => s.value === savedAccount.subcategory) : false
          });
        }
        
        // Update period values from current Excel data
        if (currentRowData && columnMappings.periodColumns) {
          columnMappings.periodColumns.forEach((periodCol: any) => {
            const value = currentRowData[periodCol.columnIndex];
            if (value !== null && value !== undefined && value !== '') {
              const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
              if (!isNaN(numericValue)) {
                updatedPeriods[periodCol.label] = numericValue;
              }
            }
          });
        }
        
        const node: AccountNode = {
          id: savedAccount.id || `account_${savedAccount.rowIndex}`,
          rowIndex: savedAccount.rowIndex || index,
          accountName: savedAccount.accountName || savedAccount.name,
          accountCode: savedAccount.accountCode,
          category: savedAccount.category || 'other',
          subcategory: savedAccount.subcategory || null,
          isInflow: savedAccount.isInflow || false,
          isTotal: savedAccount.isTotal || false,
          isSubtotal: savedAccount.isSubtotal || false,
          isExpanded: true,
          children: [],
          parentId: savedAccount.parentId || null,
          confidence: savedAccount.confidence || 1.0,
          periods: updatedPeriods, // Use updated periods from current Excel
          hasFinancialData: Object.keys(updatedPeriods).length > 0,
          isCalculated: savedAccount.isCalculated || false,
          isSectionHeader: savedAccount.isSectionHeader || false,
          isActive: savedAccount.isActive !== false // Default to true if not specified
        };
        
        // Debug first few mappings and any without subcategory
        if (index < 5 || (!node.subcategory && !node.isTotal && !node.isCalculated)) {
          console.log(`📝 Applied mapping for row ${savedAccount.rowIndex}:`, {
            accountName: node.accountName,
            category: node.category,
            subcategory: node.subcategory,
            savedSubcategory: savedAccount.subcategory,
            isTotal: node.isTotal,
            isCalculated: node.isCalculated,
            accountType: 'detail',
            periods: Object.keys(node.periods).length
          });
        }
        
        return node;
      });
      
      // Build the tree structure if needed
      const tree = buildExcelOrderTree(nodes);
      setAccountTree(tree);
      
      // Set AI analysis as complete since we're using a template
      setAiAnalysisComplete(true);
      
      console.log(`✅ Applied ${nodes.length} account mappings from template`);
      
      // Report missing subcategories for detail accounts
      const missingSubcategories = nodes.filter(node => 
        !node.isTotal && !node.isCalculated && !node.isSectionHeader && !node.subcategory
      );
      
      if (missingSubcategories.length > 0) {
        console.log(`🔍 Found ${missingSubcategories.length} detail accounts missing subcategories:`, 
          missingSubcategories.map(node => ({
            accountName: node.accountName,
            category: node.category,
            isInflow: node.isInflow,
            rowIndex: node.rowIndex + 1
          }))
        );
      }
    } else {
      // Fallback: Create nodes from raw data with basic template info
      console.log('⚠️ Template has basic column mappings only, creating nodes from raw data');
      
      const nodes: AccountNode[] = [];
      const startRow = columnMappings.headerRow ? columnMappings.headerRow + 1 : 1;
      
      // Process ALL rows, not just first 200
      for (let i = startRow; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Skip empty rows
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          continue;
        }
        
        // Extract account name from the designated column
        const accountNameCol = columnMappings.accountNameColumn || 0;
        const accountName = row[accountNameCol]?.toString()?.trim();
        
        if (!accountName) continue;
        
        // Try to detect category from account name
        const localClass = LocalAccountClassifier.classifyAccount(
          accountName,
          row[1], // First value column
          { statementType: columnMappings.statementType || 'profit_loss' }
        );
        
        const mappedCategory = mapOldCategoryToNew(localClass.suggestedCategory);
        
        const node: AccountNode = {
          id: `account_${i}`,
          rowIndex: i,
          accountName: accountName,
          category: mappedCategory.main,
          subcategory: mappedCategory.sub,
          isInflow: localClass.isInflow,
          isTotal: isCalculatedFieldName(accountName),
          isSubtotal: false,
          isExpanded: true,
          children: [],
          parentId: null,
          confidence: localClass.confidence,
          periods: {},
          hasFinancialData: false,
          isActive: true
        };
        
        // Extract period data from amount columns
        if (columnMappings.amountColumns) {
          for (const [periodName, colIndex] of Object.entries(columnMappings.amountColumns)) {
            const value = row[colIndex as number];
            if (value && !isNaN(Number(value))) {
              node.periods[periodName as string] = Number(value);
              node.hasFinancialData = true;
            }
          }
        }
        
        nodes.push(node);
      }
      
      setAccountTree(nodes);
      console.log(`📊 Created ${nodes.length} account nodes from basic template`);
    }
    
    setAiAnalysisComplete(true);
    setLoadingStep("✅ Plantilla aplicada exitosamente");
  };

  const runAIAnalysis = async (rawData: any[][]) => {
    setLoadingStep("🤖 Analizando con Inteligencia Artificial...");
    
    // First check for confirmed periods from period identification page
    const confirmedPeriodsStr = sessionStorage.getItem('confirmedPeriods');
    const currentPeriodStr = sessionStorage.getItem('currentPeriod');
    const effectiveDateStr = sessionStorage.getItem('effectiveDate');
    const periodClassificationStr = sessionStorage.getItem('periodClassification');
    
    let finalPeriodColumns = [];
    
    if (confirmedPeriodsStr) {
      console.log('✅ Using confirmed periods from period identification');
      finalPeriodColumns = JSON.parse(confirmedPeriodsStr);
      setPeriodColumns(finalPeriodColumns);
      
      // Log period classification info
      if (periodClassificationStr) {
        const classification = JSON.parse(periodClassificationStr);
        console.log('📊 Period Classification:', {
          actual: classification.actual.length,
          current: classification.current?.label,
          forecast: classification.forecast.length,
          effectiveDate: effectiveDateStr
        });
      }
      
      // Still run AI analysis for other structure detection but skip period detection
      try {
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
          setCurrency(structure.currency || "USD");
          
          // Calculate actual data range
          if (finalPeriodColumns.length > 0) {
            setActualDataRange({
              first: finalPeriodColumns[0].label,
              last: finalPeriodColumns[finalPeriodColumns.length - 1].label
            });
          }
          
          // Build account tree with confirmed periods
          const tree = buildAccountTree(rawData, { ...structure, periodColumns: finalPeriodColumns }, classifications);
          setAccountTree(tree);
          setAiAnalysisComplete(true);
          return; // Exit early since we have everything we need
        }
      } catch (error) {
        console.error('AI Analysis failed with confirmed periods:', error);
      }
    }
    
    // If no confirmed periods, continue with original AI analysis logic
    try {
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
    // Don't update type if we're in the middle of setting a subcategory
    if (isSettingSubcategory) {
      console.log(`🛑 Ignoring type change while setting subcategory`);
      return;
    }
    
    const updateNode = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.map(node => {
        if (node.id === accountId) {
          // Only update if the type is actually changing
          if (node.isInflow === isInflow) {
            return node; // No change needed
          }
          
          console.log(`🔄 Changing account type for "${node.accountName}" from ${node.isInflow ? 'Income' : 'Outcome'} to ${isInflow ? 'Income' : 'Outcome'}`);
          
          // Also update category if it doesn't match the type
          let category = node.category;
          if (isInflow && !['revenue', 'other_income'].includes(category)) {
            category = 'revenue';
          } else if (!isInflow && ['revenue', 'other_income'].includes(category)) {
            category = 'operating_expenses';
          }
          // Clear subcategory when switching type as available subcategories will change
          return { ...node, isInflow, category, subcategory: '' };
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
      setSelectedAccount({ ...selectedAccount, isInflow, category, subcategory: '' });
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
    
    // Check for missing subcategories from template
    const missingSubcategories = getMissingSubcategoriesFromTemplate();
    
    return {
      total: nonHeaderAccounts.length,
      categorized,
      uncategorized,
      missingSubcategories,
      completionPercentage: nonHeaderAccounts.length > 0 ? (categorized / nonHeaderAccounts.length) * 100 : 0
    };
  };

  const getMissingSubcategoriesFromTemplate = () => {
    // Only check if we have a template loaded
    if (!activeTemplate || !activeTemplate.columnMappings) {
      return 0;
    }

    const activeAccounts = accountTree.filter(node => node.isActive);
    const detailAccounts = activeAccounts.filter(node => 
      !node.isSectionHeader && getAccountType(node) === 'detail'
    );

    let missingCount = 0;
    
    detailAccounts.forEach(node => {
      // Check if this account has a mapping in the template
      const mapping = activeTemplate.columnMappings[node.accountName];
      if (mapping && mapping.subcategory) {
        // Template specifies a subcategory, but account doesn't have it
        if (!node.subcategory || node.subcategory.trim() === '') {
          missingCount++;
        }
      }
    });

    return missingCount;
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

    // Get accounts with missing subcategories from template
    const missingSubcategoryAccounts: AccountNode[] = [];
    if (activeTemplate && activeTemplate.columnMappings) {
      const activeAccounts = accountTree.filter(node => node.isActive);
      const detailAccounts = activeAccounts.filter(node => 
        !node.isSectionHeader && getAccountType(node) === 'detail'
      );
      
      detailAccounts.forEach(node => {
        const mapping = activeTemplate.columnMappings[node.accountName];
        if (mapping && mapping.subcategory) {
          // Template specifies a subcategory, but account doesn't have it
          if (!node.subcategory || node.subcategory.trim() === '') {
            missingSubcategoryAccounts.push(node);
          }
        }
      });
    }
    
    if (stats.uncategorized > 0 || stats.missingSubcategories > 0) {
      // Focus on first problem account
      if (uncategorizedAccounts.length > 0) {
        setSelectedAccount(uncategorizedAccounts[0]);
      } else if (missingSubcategoryAccounts.length > 0) {
        setSelectedAccount(missingSubcategoryAccounts[0]);
      }
      
      let message = '';
      if (stats.uncategorized > 0) {
        message += `Faltan ${stats.uncategorized} cuentas por categorizar:\n\n${
          uncategorizedAccounts.slice(0, 5).map(acc => `• ${acc.accountName}`).join('\n')
        }${uncategorizedAccounts.length > 5 ? '\n• ...' : ''}\n\n`;
      }
      
      if (stats.missingSubcategories > 0) {
        message += `⚠️ ${stats.missingSubcategories} subcategorías faltantes de la plantilla:\n\n${
          missingSubcategoryAccounts.slice(0, 5).map(acc => `• ${acc.accountName}`).join('\n')
        }${missingSubcategoryAccounts.length > 5 ? '\n• ...' : ''}\n\n`;
      }
      
      message += 'Por favor completa toda la información antes de guardar.';
      alert(message);
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
    console.log('🔍 renderAccountTree called with', nodes.length, 'nodes');
    if (nodes.length === 0) {
      console.log('❌ No nodes to render');
      return [];
    }
    return nodes.map(node => (
      <tr
        key={node.id}
        className={`
          border-b border-gray-200 hover:bg-blue-50 transition-all duration-200
          ${!node.isActive ? 'opacity-50' : ''}
          ${selectedAccount?.id === node.id 
            ? 'bg-blue-100 shadow-sm' 
            : node.isSectionHeader 
              ? 'bg-purple-50' 
              : node.isTotal 
                ? 'bg-slate-100 font-semibold' 
                : node.isCalculated
                  ? 'bg-amber-50'
                  : node.category && node.category !== 'uncategorized' 
                    ? 'bg-green-50' 
                    : 'bg-red-50'}
        `}
        style={{ minHeight: '32px' }}
      >
        {/* Row Number */}
        <td className={`px-3 py-1 ${
          selectedAccount?.id === node.id 
            ? 'border-l-4 border-blue-600' 
            : node.isSectionHeader 
              ? 'border-l-4 border-purple-400' 
              : node.isTotal 
                ? 'border-l-4 border-slate-500' 
                : node.isCalculated
                  ? 'border-l-4 border-amber-400'
                  : node.category && node.category !== 'uncategorized' 
                    ? 'border-l-4 border-green-300' 
                    : 'border-l-4 border-red-200'
        }`}>
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
          </td>
          
          {/* Type Selector */}
          <td className="px-2 py-1">
              {editingAccountType && selectedAccount?.id === node.id ? (
                <select
                  value={getAccountType(node)}
                  onChange={(e) => {
                    updateAccountClassificationType(node.id, e.target.value);
                    setEditingAccountType(false);
                    setSelectedAccount(null);
                  }}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full flex items-center justify-center gap-1 py-0.5 px-1 rounded border border-gray-200 hover:border-blue-300 hover:bg-white transition-colors text-xs min-h-[24px]"
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
                  {!node.isCalculated && !node.isSectionHeader && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        updateAccountType(node.id, !node.isInflow);
                      }}
                      className={`text-xs leading-none ml-1 px-1 py-0.5 rounded transition-colors cursor-pointer ${
                        node.isInflow 
                          ? 'text-green-600 bg-green-50 hover:bg-green-100' 
                          : 'text-red-600 bg-red-50 hover:bg-red-100'
                      }`}
                      title={`Click to toggle: Currently ${node.isInflow ? 'Income' : 'Outcome'}`}
                    >
                      {node.isInflow ? '↓' : '↑'}
                    </span>
                  )}
                  {node.isCalculated && (
                    <span className="text-xs leading-none text-amber-600 ml-1">=</span>
                  )}
                </button>
              )}
            </td>
            
            {/* Account Name */}
            <td className="px-3 py-1">
              <div className="flex flex-col justify-center">
                <span className={`text-sm line-clamp-2 ${
                  node.isSectionHeader ? 'text-purple-900 font-bold uppercase' :
                  node.isCalculated ? 'text-amber-900 font-semibold' :
                  node.isTotal ? 'text-slate-900 font-bold' : 'text-gray-900 font-medium'
                }`}
                title={node.accountName}
                >
                  {node.accountName}
                </span>
                {/* Add a subtle description based on type */}
                <span className={`text-xs mt-1 ${
                  node.isTotal ? 'text-slate-600 font-medium' : 'text-gray-500'
                }`}>
                  {node.isSectionHeader ? 'Section Header' :
                   node.isCalculated ? 'Calculated Field' :
                   node.isTotal ? 'Total/Subtotal' : 'Detail Account'}
                </span>
              </div>
            </td>
            
            {/* Main Category */}
            <td className="px-3 py-1">
              <div className="flex gap-1">
                <div className="flex-1 min-w-0">
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
                
                {/* Apply to Children Button */}
                {node.isSectionHeader && 
                 node.category && 
                 node.category !== 'uncategorized' && (
                  <button
                    onClick={() => startBulkAssignment(node.id)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded border border-blue-300 hover:bg-blue-200 hover:border-blue-400 transition-colors whitespace-nowrap"
                    title={`Apply "${node.category}" to selected accounts`}
                  >
                    Apply to Accounts
                  </button>
                )}
              </div>
            </td>
            
            {/* Subcategory */}
            <td className="px-3 py-1">
              {getAccountType(node) === 'detail' ? (
                <div className="relative min-w-0">
                  <SubcategoryDropdown
                    value={node.subcategory || ''}
                    onChange={(subcategory) => {
                      setIsSettingSubcategory(true);
                      console.log(`🎯 Setting subcategory "${subcategory}" for account "${node.accountName}"`);
                      
                      // Determine the correct category for this subcategory
                      const subcategoryInfo = getSubcategoriesForMainCategory(node.category, node.isInflow)
                        .find(sub => sub.value === subcategory);
                      
                      if (subcategoryInfo) {
                        updateAccountCategoryAndSubcategory(node.id, node.category, subcategory);
                      } else {
                        // If subcategory not found in current category, find the right category
                        const allSubcategories = [...subcategoriesData.income, ...subcategoriesData.outcome];
                        const foundSubcategory = allSubcategories.find(sub => sub.value === subcategory);
                        
                        if (foundSubcategory) {
                          // Determine if this is an income or outcome subcategory
                          const isIncomeSubcategory = subcategoriesData.income.some(sub => sub.value === subcategory);
                          const newCategory = isIncomeSubcategory ? 'revenue' : 'operating_expenses';
                          updateAccountCategoryAndSubcategory(node.id, newCategory, subcategory);
                        } else {
                          updateAccountCategoryAndSubcategory(node.id, node.category, subcategory);
                        }
                      }
                      
                      // Reset the flag after a short delay
                      setTimeout(() => {
                        setIsSettingSubcategory(false);
                      }, 200);
                    }}
                    subcategories={getSubcategoriesForMainCategory(node.category, node.isInflow)}
                    onAddSubcategory={async (newSubcategory) => {
                      await addCustomSubcategory(node.category, node.isInflow, newSubcategory);
                    }}
                    placeholder="Select subcategory..."
                    className="w-full"
                    disabled={!node.category || node.category === 'uncategorized'}
                  />
                  {!node.subcategory && node.category && node.category !== 'uncategorized' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium">
                  {node.isTotal ? '—' : node.isCalculated ? '—' : node.isSectionHeader ? '—' : 'N/A'}
                </div>
              )}
            </td>
            
            {/* Amount */}
            <td className="px-4 py-4 text-right">
              <div className="flex items-center justify-end gap-2 min-h-[48px]">
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
                    <div className={`text-base font-semibold ${
                      Object.values(node.periods)[0] >= 0 
                        ? 'text-green-700' 
                        : 'text-red-700'
                    }`}>
                      {Object.values(node.periods)[0] >= 0 ? '+' : ''}
                      {Object.values(node.periods)[0]?.toLocaleString() || '0'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {Object.keys(node.periods)[0]}
                    </div>
                  </div>
                ) : (
                  <div className="text-base text-gray-400 font-medium">-</div>
                )}
              </div>
            </td>
          </tr>
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
          id: node.id, // Preserve the node ID
          rowIndex: node.rowIndex,
          accountCode: node.accountCode || `ROW_${node.rowIndex}`,
          accountName: node.accountName,
          originalAccountName: node.accountName, // Add this for compatibility
          category: node.category || 'uncategorized', // Ensure category is always set
          subcategory: node.subcategory || null, // Include subcategory for ALL accounts
          isInflow: node.isInflow,
          isTotal: node.isTotal,
          isSubtotal: node.isSubtotal,
          isCalculated: node.isCalculated || false, // Add this field
          isSectionHeader: node.isSectionHeader || false, // Add this field
          parentTotalId: parentId,
          parentId: node.parentId, // Preserve parent relationship
          periods: node.periods,
          amount: Object.values(node.periods)[0] || 0, // Add primary amount
          isValid: true,
          hasFinancialData: node.hasFinancialData,
          confidence: node.confidence,
          detectedAsTotal: node.isTotal,
          totalConfidence: node.confidence,
          isActive: node.isActive // Preserve active state
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
    
    // Get period columns that actually have data
    const getValidPeriodColumns = () => {
      // If we have detected period columns, filter them to only include those with data
      if (periodColumns.length > 0) {
        console.log('🔍 Original period columns:', periodColumns.map(pc => pc.label || pc.periodLabel));
        
        // Find all unique periods that have data in any account
        const periodsWithData = new Set<string>();
        allAccounts.forEach(account => {
          if (account.hasFinancialData && account.periods) {
            Object.keys(account.periods).forEach(period => {
              // Include period if it has any non-null value (including 0 for totals)
              if (account.periods[period] !== null && account.periods[period] !== undefined) {
                periodsWithData.add(period);
              }
            });
          }
        });
        
        console.log('📊 Periods with actual data:', Array.from(periodsWithData));
        
        // Filter period columns to only include those with data
        const validPeriods = periodColumns.filter(pc => 
          periodsWithData.has(pc.label) || periodsWithData.has(pc.periodLabel)
        );
        
        console.log('✅ Valid period columns:', validPeriods.map(pc => pc.label || pc.periodLabel));
        return validPeriods;
      }
      
      // Fallback to generating from actual data
      return generatePeriodColumns();
    };

    // Prepare data for persistence
    const accountMapping = {
      statementType: detectedStructure?.statementType || 'profit_loss',
      currency: currency,
      units: units,
      periodColumns: getValidPeriodColumns(),
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
      currency: accountMapping.currency,
      units: accountMapping.units
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
        <div className="flex flex-col h-full bg-gray-50">
          <div className="flex-shrink-0 bg-white border-b border-gray-200">
            
            <div className="px-6 pb-3 space-y-2">
              {/* Success/Error Messages */}
              {bulkAssignSuccess && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-green-800">{bulkAssignSuccess}</span>
                  </div>
                </div>
              )}
              
              {bulkAssignError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-sm text-red-800">⚠️ {bulkAssignError}</span>
                  </div>
                </div>
              )}
              
              {/* Title moved up */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Enhanced Financial Mapper</h1>
              </div>
              
              {/* Two-line structure as requested */}
              <div className="space-y-3">
                {/* Line 1: Colored status indicators */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {aiAnalysisComplete && (
                      <span className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full h-9">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">AI Complete</span>
                      </span>
                    )}
                    <span className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg h-9">
                      <span className="text-lg font-bold text-blue-700">
                        {accountTree.filter(n => n.isActive).length}/{accountTree.length}
                      </span>
                      <span className="text-sm font-medium text-blue-600">cuentas activas</span>
                    </span>
                    <span className={`flex items-center gap-2 px-3 py-2 rounded-lg h-9 ${
                      getValidationStats().uncategorized > 0 ? 'bg-red-50' : 'bg-green-50'
                    }`}>
                      <span className={`text-lg font-bold ${
                        getValidationStats().uncategorized > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {getValidationStats().categorized}/{getValidationStats().total}
                      </span>
                      <span className={`text-sm font-medium ${
                        getValidationStats().uncategorized > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>categorizadas</span>
                    </span>
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg h-9">
                      <div className="w-20 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            getValidationStats().uncategorized > 0 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${getValidationStats().completionPercentage}%` }}
                        />
                      </div>
                      <span className={`text-xl font-bold ${
                        getValidationStats().uncategorized > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        {Math.round(getValidationStats().completionPercentage)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={validateMapping}
                      className={`px-3 py-2 h-9 text-xs border rounded-md font-medium transition-colors ${
                        getValidationStats().uncategorized > 0 || getValidationStats().missingSubcategories > 0
                          ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' 
                          : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      {getValidationStats().uncategorized > 0 || getValidationStats().missingSubcategories > 0 ? '⚠️' : '✓'} {locale?.startsWith('es') ? 'Validar' : 'Validate'}
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={getValidationStats().uncategorized > 0 || getValidationStats().missingSubcategories > 0}
                      className={`px-4 py-2 h-9 rounded-md flex items-center gap-1 text-xs font-semibold transition-colors ${
                        getValidationStats().uncategorized > 0 || getValidationStats().missingSubcategories > 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {locale?.startsWith('es') ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Line 2: File info, currency selector, units, and period */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg h-9">
                      <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                      <span className="truncate max-w-40 font-medium text-gray-900">{fileName}</span>
                    </span>
                    <span className="text-gray-400 self-center">•</span>
                    <span className="flex items-center truncate max-w-32 font-medium text-gray-700 bg-gray-100 px-3 py-2 rounded-lg h-9">{sheetName}</span>
                    <span className="text-gray-400 self-center">•</span>
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-lg h-9">
                      <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="text-sm font-bold border-0 bg-transparent focus:outline-none focus:ring-0 text-green-800"
                      >
                        <option value="USD">USD</option>
                        <option value="MXN">MXN</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                        <option value="BRL">BRL</option>
                        <option value="ARS">ARS</option>
                        <option value="CLP">CLP</option>
                        <option value="COP">COP</option>
                        <option value="PEN">PEN</option>
                      </select>
                    </div>
                    <span className="text-gray-400 self-center">•</span>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg h-9">
                      <ChartBarIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">
                        {units === 'normal' ? (locale?.startsWith('es') ? 'Normal' : 'Normal') :
                         units === 'thousands' ? (locale?.startsWith('es') ? 'Miles' : 'Thousands') :
                         (locale?.startsWith('es') ? 'Millones' : 'Millions')}
                      </span>
                    </div>
                    <span className="text-gray-400 self-center">•</span>
                    <span className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg h-9">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">{periodColumns.length} períodos</span>
                    </span>
                    {actualDataRange && (
                      <>
                        <span className="text-gray-400 self-center">•</span>
                        <span className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg h-9">
                          <CalendarIcon className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700 max-w-40 truncate">
                            {actualDataRange.first} → {actualDataRange.last}
                          </span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content Area - Simplified */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full bg-white flex flex-col">
              {/* Account Structure Header */}
              <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{locale?.startsWith('es') ? 'Estructura de Cuentas' : 'Account Structure'}</h2>
                    <p className="text-sm text-gray-600 mt-1">{locale?.startsWith('es') ? 'Categoriza cada cuenta seleccionando su categoría principal y subcategoría' : 'Categorize each account by selecting its main category and subcategory'}</p>
                  </div>
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
                      {locale?.startsWith('es') ? 'Re-analizar' : 'Re-analyze'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Table Container */}
              <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-full table-fixed bg-white">
                  <colgroup>
                    <col style={{ width: `${columnWidths.row}%` }} />
                    <col style={{ width: `${columnWidths.type}%` }} />
                    <col style={{ width: `${columnWidths.account}%` }} />
                    <col style={{ width: `${columnWidths.mainCategory}%` }} />
                    <col style={{ width: `${columnWidths.subcategory}%` }} />
                    <col style={{ width: `${columnWidths.amount}%` }} />
                  </colgroup>
                  {/* Column Headers */}
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="px-3 py-1 text-left text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ width: `${columnWidths.row}%` }}>{locale?.startsWith('es') ? 'Fila' : 'Row'}</th>
                      <th className="px-2 py-1 text-left text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ width: `${columnWidths.type}%` }}>{locale?.startsWith('es') ? 'Tipo' : 'Type'}</th>
                      <th className="px-3 py-1 text-left text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ width: `${columnWidths.account}%` }}>{locale?.startsWith('es') ? 'Nombre de Cuenta' : 'Account Name'}</th>
                      <th className="px-3 py-1 text-left text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ width: `${columnWidths.mainCategory}%` }}>{locale?.startsWith('es') ? 'Categoría Principal' : 'Main Category'}</th>
                      <th className="px-3 py-1 text-left text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ width: `${columnWidths.subcategory}%` }}>{locale?.startsWith('es') ? 'Subcategoría' : 'Subcategory'}</th>
                      <th className="px-3 py-1 text-right text-xs font-bold text-gray-800 uppercase tracking-wide" style={{ width: `${columnWidths.amount}%` }}>{locale?.startsWith('es') ? 'Monto' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      console.log('🔍 accountTree state:', { length: accountTree.length, hasData: accountTree.length > 0 });
                      
                      // Add a test row first to verify table structure works
                      if (accountTree.length === 0) {
                        // Add a simple test row to verify the table works
                        return (
                          <>
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-gray-500">
                                <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg">Analizando estructura...</p>
                              </td>
                            </tr>
                            <tr className="bg-blue-50">
                              <td className="px-4 py-3 border-l-4 border-blue-300">1</td>
                              <td className="px-2 py-3">Det</td>
                              <td className="px-3 py-1">Test Account</td>
                              <td className="px-3 py-1">Revenue</td>
                              <td className="px-3 py-1">Sales</td>
                              <td className="px-4 py-3 text-right">$100</td>
                            </tr>
                          </>
                        );
                      }
                      
                      // Try to render actual data
                      try {
                        const result = renderAccountTree(accountTree);
                        console.log('✅ renderAccountTree returned:', result?.length, 'elements');
                        return result;
                      } catch (error) {
                        console.error('❌ renderAccountTree error:', error);
                        return (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-red-500">
                              <p className="text-lg">Error rendering table: {(error as Error).message}</p>
                            </td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
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

        {/* Bulk Assignment Modal */}
        {showBulkAssignModal && bulkAssignHeaderId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Apply Category to Accounts
                </h3>
                <button
                  onClick={() => setShowBulkAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={bulkAssignProgress}
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Header Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Header Account:</h4>
                  <p className="text-blue-800">
                    <strong>{findNodeInTree(accountTree, bulkAssignHeaderId)?.accountName}</strong>
                  </p>
                  <p className="text-blue-700 mt-1">
                    Category: <strong>{bulkAssignCategory}</strong>
                    {bulkAssignSubcategory && (
                      <span> → <strong>{bulkAssignSubcategory}</strong></span>
                    )}
                  </p>
                </div>

                {/* Available Accounts */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">
                    Accounts Below This Header ({getAllAvailableAccounts(bulkAssignHeaderId).length} found)
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Select accounts below "<strong>{findNodeInTree(accountTree, bulkAssignHeaderId)?.accountName}</strong>" 
                    to apply the category "<strong>{bulkAssignCategory}</strong>" to them.
                    <br/>
                    <span className="text-xs text-gray-500">
                      {getAllAvailableAccounts(bulkAssignHeaderId).length === 0 
                        ? "No eligible accounts found below this header. Make sure accounts are active and have data."
                        : "Showing accounts from this header until the next header or end of list."}
                    </span>
                  </p>
                  {getAllAvailableAccounts(bulkAssignHeaderId).length === 0 ? (
                    <div className="border rounded-lg p-8 text-center text-gray-500">
                      <p className="mb-2">No accounts available for bulk assignment.</p>
                      <p className="text-sm">This could be because:</p>
                      <ul className="text-sm mt-2 space-y-1">
                        <li>• There are no accounts after this header</li>
                        <li>• All following accounts are headers or totals</li>
                        <li>• Following accounts are deactivated</li>
                        <li>• This is the last header in the list</li>
                      </ul>
                    </div>
                  ) : (
                  <div className="border rounded-lg">
                    <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Select accounts to apply category ({selectedChildrenIds.length} selected)
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const eligibleAccounts = getAllAvailableAccounts(bulkAssignHeaderId)
                              .filter(account => {
                                const eligibility = getAssignmentEligibility(account);
                                const isAlreadyCorrect = account.category === bulkAssignCategory && 
                                                       (!bulkAssignSubcategory || account.subcategory === bulkAssignSubcategory);
                                return eligibility.eligible && !isAlreadyCorrect;
                              });
                            setSelectedChildrenIds(eligibleAccounts.map(account => account.id));
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                          disabled={bulkAssignProgress}
                        >
                          Select All Eligible
                        </button>
                        <button
                          onClick={() => setSelectedChildrenIds([])}
                          className="text-sm text-red-600 hover:text-red-800"
                          disabled={bulkAssignProgress}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {getAllAvailableAccounts(bulkAssignHeaderId).map((account) => {
                        const eligibility = getAssignmentEligibility(account);
                        const isAlreadyCorrect = account.category === bulkAssignCategory && 
                                               (!bulkAssignSubcategory || account.subcategory === bulkAssignSubcategory);
                        const isEligible = eligibility.eligible && !isAlreadyCorrect;
                        
                        return (
                          <div
                            key={account.id}
                            className={`border-b last:border-b-0 px-4 py-3 flex items-center justify-between ${
                              !isEligible ? 'bg-gray-50 opacity-75' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedChildrenIds.includes(account.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedChildrenIds([...selectedChildrenIds, account.id]);
                                  } else {
                                    setSelectedChildrenIds(selectedChildrenIds.filter(id => id !== account.id));
                                  }
                                }}
                                disabled={!isEligible || bulkAssignProgress}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {account.accountName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Current: {account.category || 'Uncategorized'}
                                  {account.subcategory && ` → ${account.subcategory}`}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm">
                              {isAlreadyCorrect ? (
                                <span className="text-gray-500">Already assigned</span>
                              ) : eligibility.eligible ? (
                                <span className="text-green-600">✓ Eligible</span>
                              ) : (
                                <span className="text-red-500">
                                  ✗ {eligibility.reason}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </div>
              </div>

              {/* Actions - Outside scrollable area */}
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <button
                  onClick={() => setShowBulkAssignModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={bulkAssignProgress}
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkAssignment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={selectedChildrenIds.length === 0 || bulkAssignProgress}
                >
                  {bulkAssignProgress ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                      Applying...
                    </>
                  ) : (
                    `Apply to ${selectedChildrenIds.length} Account${selectedChildrenIds.length !== 1 ? 's' : ''}`
                  )}
                </button>
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