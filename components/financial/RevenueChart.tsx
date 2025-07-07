"use client";

import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RevenueChartProps {
  data: Array<{
    period: string;
    revenue: number;
    profit?: number;
    costs?: number;
  }>;
  currency?: string;
  height?: number;
  showProfit?: boolean;
  showCosts?: boolean;
  type?: 'line' | 'area';
}

export function RevenueChart({
  data,
  currency = 'MXN',
  height = 300,
  showProfit = true,
  showCosts = false,
  type = 'area'
}: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: Math.abs(value) >= 1000000 ? 'compact' : 'standard',
      compactDisplay: 'short'
    }).format(value);
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const ChartComponent = type === 'line' ? LineChart : AreaChart;
  const DataComponent: any = type === 'line' ? Line : Area;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="period" 
            tick={{ fontSize: 12 }}
            stroke="#6B7280"
          />
          
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#6B7280"
            tickFormatter={formatCurrency}
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '0.375rem',
              fontSize: '14px'
            }}
            formatter={(value: number) => formatTooltipValue(value)}
            labelStyle={{ color: '#111827', fontWeight: 500 }}
          />
          
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            iconType="line"
          />
          
          <DataComponent
            type="monotone"
            dataKey="revenue"
            stroke="#3B82F6"
            strokeWidth={2}
            fill={type === 'area' ? "url(#colorRevenue)" : undefined}
            name="Ingresos"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          
          {showProfit && (
            <DataComponent
              type="monotone"
              dataKey="profit"
              stroke="#10B981"
              strokeWidth={2}
              fill={type === 'area' ? "url(#colorProfit)" : undefined}
              name="Utilidad"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          
          {showCosts && (
            <DataComponent
              type="monotone"
              dataKey="costs"
              stroke="#EF4444"
              strokeWidth={2}
              fill={type === 'area' ? "url(#colorCosts)" : undefined}
              name="Costos"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}