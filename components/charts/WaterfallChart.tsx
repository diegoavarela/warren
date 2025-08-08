"use client";

import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WaterfallDataPoint {
  label: string;
  value: number;
  cumulative: number;
  isTotal?: boolean;
}

interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  currency?: string;
  locale?: string;
  height?: number;
}

export function WaterfallChart({ 
  data, 
  currency = '$', 
  locale = 'es-MX', 
  height = 300 
}: WaterfallChartProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);

  // Validate data to prevent rendering issues
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div style={{ height: `${height}px` }} className="flex items-center justify-center text-gray-500">
        {locale?.startsWith('es') ? 'No hay datos disponibles' : 'No data available'}
      </div>
    );
  }

  const formatCurrency = (amount: number, compact = false) => {
    // Handle invalid amounts
    if (typeof amount !== 'number' || !isFinite(amount)) {
      return currency === 'ARS' ? 'ARS 0' : '$0';
    }

    // Handle ARS currency formatting
    if (currency === 'ARS') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        notation: compact ? 'compact' : 'standard',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency === '$' ? 'USD' : currency || 'USD',
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Process data for waterfall visualization with error handling
  const processedData = data.map((point, index) => {
    try {
      const prevCumulative = index > 0 ? (data[index - 1]?.cumulative || 0) : 0;
      const pointValue = typeof point.value === 'number' ? point.value : 0;
      const pointCumulative = typeof point.cumulative === 'number' ? point.cumulative : 0;
      const isPositive = pointValue >= 0;
      const isTotal = point.isTotal || false;

      return {
        label: point.label || `Item ${index + 1}`,
        value: pointValue,
        cumulative: pointCumulative,
        isTotal,
        base: isTotal ? 0 : (isPositive ? prevCumulative : prevCumulative + pointValue),
        height: Math.abs(pointValue),
        color: isTotal ? 
          (pointCumulative >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)') :
          (isPositive ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)')
      };
    } catch (error) {
      console.warn('Error processing waterfall data point:', error);
      return {
        label: `Item ${index + 1}`,
        value: 0,
        cumulative: 0,
        isTotal: false,
        base: 0,
        height: 0,
        color: 'rgba(156, 163, 175, 0.6)'
      };
    }
  });

  const chartData = {
    labels: processedData.map(d => d.label || ''),
    datasets: [
      // Base bars (invisible, for stacking)
      {
        label: 'Base',
        data: processedData.map(d => d.isTotal ? 0 : (d.base || 0)),
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
      },
      // Value bars (visible)
      {
        label: 'Values',
        data: processedData.map(d => d.isTotal ? (d.cumulative || 0) : (d.height || 0)),
        backgroundColor: processedData.map(d => d.color || 'rgba(156, 163, 175, 0.6)'),
        borderColor: processedData.map(d => (d.color || 'rgba(156, 163, 175, 0.6)').replace('0.6', '1').replace('0.8', '1')),
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          },
          maxRotation: 45
        }
      },
      y: {
        stacked: true,
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value, true);
          },
          font: {
            size: 11
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: function(context: TooltipItem<'bar'>[]) {
            try {
              const index = context[0]?.dataIndex;
              if (typeof index === 'number' && data[index]) {
                return data[index].label || '';
              }
              return '';
            } catch (error) {
              return '';
            }
          },
          label: function(context: TooltipItem<'bar'>) {
            try {
              const index = context.dataIndex;
              const dataPoint = data[index];
              if (!dataPoint || context.datasetIndex === 0) return ''; // Hide base dataset
              
              if (dataPoint.isTotal) {
                return `${locale?.startsWith('es') ? 'Balance' : 'Balance'}: ${formatCurrency(dataPoint.cumulative || 0)}`;
              } else {
                const changeType = (dataPoint.value || 0) >= 0 ? 
                  (locale?.startsWith('es') ? 'Entrada' : 'Inflow') : 
                  (locale?.startsWith('es') ? 'Salida' : 'Outflow');
                return `${changeType}: ${formatCurrency(dataPoint.value || 0)}`;
              }
            } catch (error) {
              return '';
            }
          },
          afterLabel: function(context: TooltipItem<'bar'>) {
            try {
              const index = context.dataIndex;
              const dataPoint = data[index];
              if (!dataPoint || context.datasetIndex === 0 || dataPoint.isTotal) return '';
              return `${locale?.startsWith('es') ? 'Balance acumulado' : 'Running total'}: ${formatCurrency(dataPoint.cumulative || 0)}`;
            } catch (error) {
              return '';
            }
          },
          labelColor: function(context: TooltipItem<'bar'>) {
            try {
              if (context.datasetIndex === 0) return { borderColor: 'transparent', backgroundColor: 'transparent' };
              const color = processedData[context.dataIndex]?.color || 'rgba(156, 163, 175, 0.6)';
              return {
                borderColor: color,
                backgroundColor: color
              };
            } catch (error) {
              return { borderColor: 'rgba(156, 163, 175, 0.6)', backgroundColor: 'rgba(156, 163, 175, 0.6)' };
            }
          }
        },
        filter: function(tooltipItem: TooltipItem<'bar'>) {
          return tooltipItem.datasetIndex !== 0; // Hide base dataset tooltips
        }
      }
    },
    onHover: (event: any, elements: any[]) => {
      if (event.native?.target) {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    }
  };

  // Add connecting lines between bars
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !chart.ctx) return;

    const drawConnectors = () => {
      try {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(1); // Value dataset
        
        if (!meta?.data || meta.data.length < 2) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;

        for (let i = 0; i < meta.data.length - 1; i++) {
          const current = meta.data[i];
          const next = meta.data[i + 1];
          
          if (!current || !next) continue;

          const currentData = processedData[i];
          const nextData = processedData[i + 1];

          // Don't draw connector if next is a total
          if (nextData?.isTotal) continue;

          const currentTop = currentData?.isTotal ? current.y : (current.y - (currentData?.height || 0));
          const nextBase = next.y;

          ctx.beginPath();
          ctx.moveTo((current as any).x + (current as any).width / 2, currentTop);
          ctx.lineTo((next as any).x - (next as any).width / 2, nextBase);
          ctx.stroke();
        }

        ctx.restore();
      } catch (error) {
        console.warn('Error drawing waterfall connectors:', error);
      }
    };

    // Simple timeout instead of mutation observer to avoid React conflicts
    const timeoutId = setTimeout(drawConnectors, 100);
    
    return () => clearTimeout(timeoutId);
  }, [processedData]);

  return (
    <div style={{ height: `${height}px`, position: 'relative' }}>
      <Bar 
        ref={chartRef}
        data={chartData} 
        options={options}
      />
    </div>
  );
}