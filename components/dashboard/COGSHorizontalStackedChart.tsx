"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTranslation } from '@/lib/translations';
import { useLocale } from '@/contexts/LocaleContext';
import { WARREN_COLORS, CHART_COLORS } from '@/components/charts/WarrenChart';

interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
  subcategory?: string;
  items?: Array<{
    accountName: string;
    amount: number;
    percentage: number;
  }>;
}

interface COGSHorizontalStackedChartProps {
  data: ExpenseData[];
  currency?: string;
  originalCurrency?: string;
  displayUnits?: 'normal' | 'K' | 'M';
  locale?: string;
  onCategoryClick?: (category: ExpenseData) => void;
  formatValue?: (value: number) => string;
}

// Extended color palette for subcategories
const SUBCATEGORY_COLORS = [
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan  
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5A3C', // Brown
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#F97316', // Orange
  '#14B8A6', // Teal
];

export function COGSHorizontalStackedChart({
  data,
  currency = 'USD',
  originalCurrency,
  displayUnits = 'normal',
  locale,
  onCategoryClick,
  formatValue
}: COGSHorizontalStackedChartProps) {
  const { locale: contextLocale } = useLocale();
  const { t } = useTranslation(locale || contextLocale);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Clean up category names
  const cleanCategoryName = (categoryName: string, context?: 'category' | 'account', parentCategory?: string) => {
    if (!categoryName || categoryName.trim() === '') {
      return context === 'account' ? 'Account Item' : 'Unknown Category';
    }
    
    // Check for database hash IDs
    const isHashId = /^[a-f0-9]{16,}$/i.test(categoryName) || 
                     /[a-f0-9]{12,}/i.test(categoryName) ||
                     (categoryName.length > 15 && !/\s/.test(categoryName) && /^[a-zA-Z0-9]+$/.test(categoryName));
    
    if (isHashId) {
      if (context === 'account' && parentCategory) {
        const parent = parentCategory.toLowerCase();
        if (parent.includes('salary') || parent.includes('salaries')) {
          return 'Salary Payment';
        } else if (parent.includes('professional') || parent.includes('service')) {
          return 'Professional Service';
        } else if (parent.includes('material')) {
          return 'Material Cost';
        } else if (parent.includes('labor')) {
          return 'Labor Cost';
        } else {
          return 'Cost Item';
        }
      } else {
        return 'Professional Services';
      }
    }
    
    const cleaned = categoryName
      .replace(/\s*\(CoR\)$/i, '')
      .replace(/\s*\(cor\)$/i, '')
      .trim();
    
    return cleaned || (context === 'account' ? 'Account Item' : 'Professional Services');
  };

  // Process data for horizontal stacked chart - one bar per category with subcategories stacked
  const chartData = useMemo(() => {
    console.log('Processing COGS data:', data);
    
    const processedData = data.map((item, categoryIndex) => {
      const categoryName = cleanCategoryName(item.category);
      const categoryData: { [key: string]: any } = {
        category: categoryName,
        originalCategory: item.category,
        categoryAmount: item.amount,
        categoryPercentage: item.percentage
      };

      // Only add subcategory data that has actual values (no zeros)
      if (item.items && item.items.length > 0) {
        item.items.forEach((subItem) => {
          if (subItem.amount > 0) {
            categoryData[subItem.accountName] = subItem.amount;
          }
        });
      } else {
        // Single segment for the entire category if no subcategories
        categoryData['Main Amount'] = item.amount;
      }

      console.log(`Category ${categoryName} data:`, categoryData);
      return categoryData;
    });

    console.log('Final chart data:', processedData);
    return processedData;
  }, [data]);

  // Get all unique subcategory keys for consistent rendering
  const allSubcategoryKeys = useMemo(() => {
    const keys = new Set<string>();
    chartData.forEach(categoryData => {
      Object.keys(categoryData).forEach(key => {
        if (!key.startsWith('category') && !key.startsWith('original') && key !== 'categoryAmount' && key !== 'categoryPercentage') {
          keys.add(key);
        }
      });
    });
    console.log('All subcategory keys:', Array.from(keys));
    
    // Filter keys that have at least one non-zero value
    const activeKeys = Array.from(keys).filter(key => {
      return chartData.some(categoryData => categoryData[key] > 0);
    });
    
    console.log('Active subcategory keys (with non-zero values):', activeKeys);
    return activeKeys.sort();
  }, [chartData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const categoryName = label;
      const categoryData = payload[0]?.payload;
      const categoryAmount = categoryData?.categoryAmount || 0;
      const categoryPercentage = categoryData?.categoryPercentage || 0;
      
      return (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64">
          <p className="font-semibold text-gray-900 mb-3 text-base">{categoryName}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              if (entry.value && entry.value > 0) {
                const subcategoryName = entry.dataKey === 'Main Amount' ? 'Main Amount' : entry.dataKey;
                const subcategoryPercentage = categoryAmount > 0 ? (entry.value / categoryAmount) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center justify-between space-x-4">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full border border-white" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-gray-700 font-medium">{subcategoryName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-gray-900 text-sm">
                        {formatValue ? formatValue(entry.value) : entry.value?.toLocaleString()}
                      </span>
                      <div className="text-xs text-gray-500">
                        {subcategoryPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }).filter(Boolean)}
          </div>
          <div className="border-t border-gray-200 mt-3 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-800">Category Total:</span>
              <span className="font-bold text-gray-900">
                {formatValue ? formatValue(categoryAmount) : categoryAmount?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-600">Of Total COGS:</span>
              <span className="text-xs font-medium text-gray-700">
                {categoryPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle bar click
  const handleBarClick = (chartData: any) => {
    console.log('COGS Bar clicked:', chartData);
    const originalCategory = chartData.payload?.originalCategory;
    const originalData = originalCategory ? 
      data.find((item: ExpenseData) => item.category === originalCategory) : null;
    
    if (originalData && onCategoryClick) {
      onCategoryClick(originalData);
    }
  };

  return (
    <div className="w-full px-6 py-4">
      <ResponsiveContainer width="100%" height={Math.max(400, data.length * 70)}>
        <BarChart
          data={chartData}
          layout="horizontal"
          margin={{ 
            top: 20, 
            right: isMobile ? 40 : 80, 
            left: isMobile ? 100 : 150, 
            bottom: 20 
          }}
          barCategoryGap="20%"
          maxBarSize={60}
        >
          <defs>
            {SUBCATEGORY_COLORS.map((color, index) => (
              <linearGradient key={index} id={`cogsGradient${index}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.7} />
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#E5E7EB" 
            strokeOpacity={0.6}
            horizontal={false}
            vertical={true}
          />
          
          <XAxis 
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => formatValue ? formatValue(value) : value.toLocaleString()}
            domain={[0, 'dataMax']}
          />
          
          <YAxis 
            type="category"
            dataKey="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: isMobile ? 11 : 13, fill: '#374151', fontWeight: 500 }}
            width={isMobile ? 100 : 150}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px'
            }}
            formatter={(value) => {
              // Show the actual subcategory name
              const cleanName = value === 'Main Amount' ? 'Main Amount' : value;
              return <span className="text-gray-700 font-medium">{cleanName}</span>;
            }}
          />
          
          {/* Render stacked bars for each subcategory - Only non-zero values */}
          {allSubcategoryKeys.map((subcategoryKey, index) => (
            <Bar
              key={subcategoryKey}
              dataKey={subcategoryKey}
              stackId="cogs"
              fill={SUBCATEGORY_COLORS[index % SUBCATEGORY_COLORS.length]}
              stroke={SUBCATEGORY_COLORS[index % SUBCATEGORY_COLORS.length]}
              strokeWidth={0.5}
              cursor="pointer"
              radius={[0, 2, 2, 0]}
              onClick={(barData: any) => {
                console.log('Bar clicked:', barData);
                const categoryData = barData?.payload || barData;
                const originalData = data.find(item => item.category === categoryData?.originalCategory);
                if (originalData && onCategoryClick) {
                  onCategoryClick(originalData);
                }
              }}
              onMouseEnter={() => setHoveredBar(subcategoryKey)}
              onMouseLeave={() => setHoveredBar(null)}
              style={{
                filter: hoveredBar && hoveredBar !== subcategoryKey ? 'opacity(0.7)' : 'opacity(1)',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      
      {/* Chart Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {formatValue ? formatValue(data.reduce((sum, item) => sum + item.amount, 0)) : 
               data.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('metrics.totalCOGS')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">{data.length}</div>
            <div className="text-sm font-medium text-gray-600">{t('metrics.categories')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {data.length > 0 ? 
                (formatValue ? formatValue(Math.max(...data.map(item => item.amount))) : 
                 Math.max(...data.map(item => item.amount)).toLocaleString()) : 
                '0'}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('heatmap.highest')}</div>
          </div>
          <div className="text-center bg-gray-50 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900">
              {data.length > 0 ? `${Math.max(...data.map(item => item.percentage)).toFixed(1)}%` : '0%'}
            </div>
            <div className="text-sm font-medium text-gray-600">{t('heatmap.largestShare')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}