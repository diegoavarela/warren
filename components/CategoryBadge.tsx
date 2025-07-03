"use client";

import { useState, useRef, useEffect } from "react";
import { AccountClassification } from "@/types";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  ShoppingCartIcon,
  WrenchIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  CreditCardIcon,
  TruckIcon,
  MegaphoneIcon,
  BriefcaseIcon,
  HomeIcon,
  BeakerIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  ScaleIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

interface CategoryBadgeProps {
  classification: AccountClassification;
  onClick?: () => void;
}

// Map categories to icons
const categoryIcons: Record<string, any> = {
  // Revenue categories
  revenue: CurrencyDollarIcon,
  service_revenue: BriefcaseIcon,
  other_revenue: ChartBarIcon,
  interest_income: BuildingLibraryIcon,
  
  // Cost categories
  cost_of_sales: ShoppingCartIcon,
  direct_materials: TruckIcon,
  direct_labor: UserGroupIcon,
  manufacturing_overhead: WrenchIcon,
  
  // Operating expenses
  salaries_wages: UserGroupIcon,
  payroll_taxes: ShieldCheckIcon,
  benefits: AcademicCapIcon,
  rent_utilities: HomeIcon,
  marketing_advertising: MegaphoneIcon,
  professional_services: BriefcaseIcon,
  office_supplies: BeakerIcon,
  depreciation: ChartBarIcon,
  insurance: ShieldCheckIcon,
  travel_entertainment: TruckIcon,
  
  // Financial
  interest_expense: CreditCardIcon,
  income_tax: CalculatorIcon,
  other_taxes: BuildingLibraryIcon,
  
  // Balance sheet
  current_assets: BanknotesIcon,
  non_current_assets: BuildingOfficeIcon,
  current_liabilities: CreditCardIcon,
  non_current_liabilities: ScaleIcon,
  equity: ChartBarIcon,
  
  // Default
  default: SparklesIcon
};

export function CategoryBadge({ classification, onClick }: CategoryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const Icon = categoryIcons[classification.suggestedCategory] || categoryIcons.default;
  
  useEffect(() => {
    if (showTooltip && badgeRef.current && tooltipRef.current) {
      const badgeRect = badgeRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Calculate position to keep tooltip on screen
      let top = badgeRect.top - tooltipRect.height - 10;
      let left = badgeRect.left + badgeRect.width / 2 - tooltipRect.width / 2;
      
      // Adjust if tooltip would go off screen
      if (top < 10) {
        top = badgeRect.bottom + 10;
      }
      if (left < 10) {
        left = 10;
      } else if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      
      setTooltipPosition({ top, left });
    }
  }, [showTooltip]);
  
  const getCategoryDisplayName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'Alta';
    if (confidence >= 60) return 'Media';
    return 'Baja';
  };
  
  return (
    <>
      <div 
        ref={badgeRef}
        className="relative inline-flex"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          onClick={onClick}
          className={`
            inline-flex items-center justify-center w-8 h-8 rounded-full
            transition-all duration-200 transform hover:scale-110
            ${classification.isInflow 
              ? 'bg-green-100 hover:bg-green-200 text-green-700' 
              : 'bg-red-100 hover:bg-red-200 text-red-700'
            }
            hover:shadow-md cursor-pointer
          `}
          title="Click para editar categoría"
        >
          <Icon className="w-4 h-4" />
        </button>
        
        {/* Small confidence indicator */}
        <div className={`
          absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white
          ${classification.confidence >= 80 ? 'bg-green-500' :
            classification.confidence >= 60 ? 'bg-yellow-500' :
            'bg-red-500'
          }
        `} />
      </div>
      
      {/* Elaborate Tooltip */}
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          style={{ top: `${tooltipPosition.top}px`, left: `${tooltipPosition.left}px` }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-purple-200 p-4 max-w-sm">
            <div className="flex items-start space-x-3">
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                ${classification.isInflow ? 'bg-green-100' : 'bg-red-100'}
              `}>
                <Icon className={`w-6 h-6 ${classification.isInflow ? 'text-green-700' : 'text-red-700'}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {getCategoryDisplayName(classification.suggestedCategory)}
                  </h3>
                  <span className={`
                    inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${classification.isInflow 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                    }
                  `}>
                    {classification.isInflow ? 
                      <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> : 
                      <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                    }
                    {classification.isInflow ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
                
                <div className="mt-2 space-y-2">
                  {/* Confidence */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Confianza:</span>
                    <div className="flex items-center space-x-1">
                      <div className="flex-1 w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            classification.confidence >= 80 ? 'bg-green-500' :
                            classification.confidence >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${classification.confidence}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${getConfidenceColor(classification.confidence)}`}>
                        {classification.confidence}% ({getConfidenceLabel(classification.confidence)})
                      </span>
                    </div>
                  </div>
                  
                  {/* AI Reasoning */}
                  <div>
                    <span className="text-xs text-gray-500">Análisis IA:</span>
                    <p className="text-xs text-gray-700 mt-1 italic">
                      {classification.reasoning}
                    </p>
                  </div>
                  
                  {/* Alternative Categories */}
                  {classification.alternativeCategories && classification.alternativeCategories.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Alternativas:</span>
                      <div className="mt-1 space-y-1">
                        {classification.alternativeCategories.slice(0, 3).map((alt, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              • {getCategoryDisplayName(alt.category)}
                            </span>
                            <span className={`ml-2 ${getConfidenceColor(alt.confidence)}`}>
                              {alt.confidence}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-purple-600 flex items-center">
                    <SparklesIcon className="w-3 h-3 mr-1" />
                    Click para cambiar categoría manualmente
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}