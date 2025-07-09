"use client";

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';

// Warren color palette
export const WARREN_COLORS = {
  primary: '#8B5CF6', // Purple
  secondary: '#06B6D4', // Cyan
  success: '#10B981', // Emerald
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  info: '#3B82F6', // Blue
  muted: '#6B7280', // Gray
  gradient: {
    purple: ['#8B5CF6', '#A78BFA'],
    blue: ['#3B82F6', '#60A5FA'],
    emerald: ['#10B981', '#34D399'],
    rose: ['#EF4444', '#FB7185'],
    orange: ['#F59E0B', '#FBBF24']
  }
};

export const CHART_COLORS = [
  WARREN_COLORS.primary,
  WARREN_COLORS.secondary,
  WARREN_COLORS.success,
  WARREN_COLORS.warning,
  WARREN_COLORS.danger,
  WARREN_COLORS.info
];

interface ChartData {
  [key: string]: any;
}

interface ChartConfig {
  xKey: string;
  yKeys: string[];
  colors?: string[];
  type: 'line' | 'area' | 'bar' | 'pie';
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  curved?: boolean;
  stacked?: boolean;
  gradient?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  currency?: string;
  formatValue?: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, 
  payload, 
  label, 
  currency = '',
  formatValue 
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-32">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="font-medium text-gray-900">
              {currency && currency + ' '}
              {formatValue ? formatValue(entry.value) : entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface WarrenChartProps {
  data: ChartData[];
  config: ChartConfig;
  title?: string;
  subtitle?: string;
  currency?: string;
  formatValue?: (value: number) => string;
  className?: string;
}

export function WarrenChart({
  data,
  config,
  title,
  subtitle,
  currency,
  formatValue,
  className = ''
}: WarrenChartProps) {
  const {
    xKey,
    yKeys,
    colors = CHART_COLORS,
    type,
    height = 300,
    showGrid = true,
    showLegend = true,
    showTooltip = true,
    curved = true,
    stacked = false,
    gradient = false
  } = config;

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => formatValue ? formatValue(value) : value.toLocaleString()}
            />
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip currency={currency} formatValue={formatValue} />}
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Line
                key={key}
                type={curved ? "monotone" : "linear"}
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => formatValue ? formatValue(value) : value.toLocaleString()}
            />
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip currency={currency} formatValue={formatValue} />}
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Area
                key={key}
                type={curved ? "monotone" : "linear"}
                dataKey={key}
                stackId={stacked ? "1" : undefined}
                stroke={colors[index % colors.length]}
                fill={gradient ? `url(#gradient-${index})` : colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
            {gradient && (
              <defs>
                {yKeys.map((_, index) => (
                  <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xKey} 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              tickFormatter={(value) => formatValue ? formatValue(value) : value.toLocaleString()}
            />
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip currency={currency} formatValue={formatValue} />}
              />
            )}
            {showLegend && <Legend />}
            {yKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                stackId={stacked ? "1" : undefined}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        const pieData = data.map((item, index) => ({
          ...item,
          fill: colors[index % colors.length]
        }));
        
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              fill="#8884d8"
              dataKey={yKeys[0]}
              label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip currency={currency} formatValue={formatValue} />}
              />
            )}
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return <div />;
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

// Predefined chart configurations for common use cases
export const CHART_CONFIGS = {
  revenue: {
    xKey: 'month',
    yKeys: ['revenue'],
    type: 'area' as const,
    gradient: true,
    colors: [WARREN_COLORS.success]
  },
  profitLoss: {
    xKey: 'month',
    yKeys: ['revenue', 'expenses', 'profit'],
    type: 'line' as const,
    colors: [WARREN_COLORS.success, WARREN_COLORS.danger, WARREN_COLORS.primary]
  },
  cashFlow: {
    xKey: 'month',
    yKeys: ['inflow', 'outflow', 'net'],
    type: 'bar' as const,
    stacked: false,
    colors: [WARREN_COLORS.success, WARREN_COLORS.danger, WARREN_COLORS.primary]
  },
  expenses: {
    xKey: 'category',
    yKeys: ['amount'],
    type: 'pie' as const,
    showLegend: true
  }
};

// Utility function to format currency
export const formatCurrency = (value: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Utility function to format percentage
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};