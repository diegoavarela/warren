"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';

interface ProfitabilityChartProps {
  data: Array<{
    name: string;
    value: number;
    percentage?: number;
  }>;
  currency?: string;
  height?: number;
  showPercentage?: boolean;
}

export function ProfitabilityChart({
  data,
  currency = 'MXN',
  height = 300,
  showPercentage = true
}: ProfitabilityChartProps) {
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{data.payload.name}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.value)}
          </p>
          {data.payload.percentage !== undefined && (
            <p className="text-sm font-semibold text-gray-900">
              Margen: {data.payload.percentage.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value, percentage } = props;
    if (showPercentage && percentage !== undefined) {
      return (
        <text 
          x={x + width / 2} 
          y={y - 5} 
          fill="#374151" 
          textAnchor="middle"
          className="text-xs font-medium"
        >
          {percentage.toFixed(1)}%
        </text>
      );
    }
    return null;
  };

  const getBarColor = (value: number) => {
    if (value > 0) return '#10B981'; // Green for positive
    return '#EF4444'; // Red for negative
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            stroke="#6B7280"
          />
          
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#6B7280"
            tickFormatter={formatCurrency}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="value" 
            radius={[8, 8, 0, 0]}
          >
            <LabelList 
              dataKey="percentage" 
              position="top" 
              content={renderCustomLabel}
            />
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}