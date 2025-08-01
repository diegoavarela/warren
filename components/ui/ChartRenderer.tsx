'use client';

import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js'
import { Chart } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface ChartRendererProps {
  type: 'line' | 'bar' | 'pie' | 'area' | 'column';
  title: string;
  data: Array<{
    label: string;
    value: number;
  }>;
  height?: number;
  currency?: string;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  type, 
  title, 
  data, 
  height = 400,
  currency = 'ARS'
}) => {
  const chartRef = useRef<ChartJS>(null)
  
  // Debug logging
  console.log('🎨 ChartRenderer received:', { type, title, dataLength: data.length, isArea: type === 'area' })
  
  if (type === 'area') {
    console.log('🎨 AREA CHART CONFIG: fill=start, backgroundColor with 50% opacity')
  }

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [])

  // Format data based on chart type
  const formatChartData = (): ChartData<any> => {
    // Apply professional colors
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Violet
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#6366F1', // Indigo
      '#84CC16', // Lime
    ]

    // Determine background fill based on chart type
    let backgroundFill: any;
    if (type === 'area') {
      backgroundFill = 'rgba(59, 130, 246, 0.5)'; // Strong fill for area charts
    } else if (type === 'line') {
      backgroundFill = 'rgba(59, 130, 246, 0.1)'; // Light fill for line charts
    } else {
      backgroundFill = colors.slice(0, data.length); // Multiple colors for bar/pie charts
    }

    if (type === 'pie') {
      return {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: colors.slice(0, data.length),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 10
        }]
      }
    }

    // For line, bar, area charts
    const chartType = type === 'area' ? 'line' : (type === 'column' ? 'bar' : type);
    
    return {
      labels: data.map(d => d.label),
      datasets: [{
        label: title,
        data: data.map(d => d.value),
        borderColor: colors[0],
        backgroundColor: backgroundFill,
        borderWidth: type === 'line' || type === 'area' ? 3 : 1,
        tension: type === 'line' || type === 'area' ? 0.4 : 0,
        fill: type === 'area' ? 'start' : false, // 'start' works better than 'origin' for area charts
        pointRadius: type === 'line' || type === 'area' ? 5 : 0,
        pointHoverRadius: type === 'line' || type === 'area' ? 8 : 0,
        pointBackgroundColor: colors[0],
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      }]
    }
  }

  // Build chart options
  const buildOptions = (): ChartOptions<any> => {
    const baseOptions: ChartOptions<any> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: {
            size: 18,
            weight: 'bold' as any
          },
          padding: {
            bottom: 20
          },
          color: '#1F2937'
        },
        legend: {
          display: type === 'pie',
          position: 'bottom' as const,
          labels: {
            padding: 20,
            usePointStyle: true,
            font: {
              size: 12
            },
            color: '#374151'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: 'white',
          bodyColor: 'white',
          padding: 15,
          borderColor: 'rgba(229, 231, 235, 0.3)',
          borderWidth: 1,
          displayColors: true,
          cornerRadius: 8,
          titleFont: {
            size: 14,
            weight: 'bold' as any
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || ''
              if (label && type !== 'pie') {
                label += ': '
              }
              if (context.parsed.y !== null || context.parsed !== null) {
                const value = type === 'pie' ? context.parsed : context.parsed.y
                
                // Format as currency
                if (Math.abs(value) >= 1000000) {
                  label += `${(value / 1000000).toFixed(1)}M ${currency}`
                } else if (Math.abs(value) >= 1000) {
                  label += `${(value / 1000).toFixed(0)}K ${currency}`
                } else {
                  label += `${value.toLocaleString()} ${currency}`
                }

                // Add percentage for pie charts
                if (type === 'pie') {
                  const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  label += ` (${percentage}%)`;
                }
              }
              return label
            }
          }
        }
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as any
      }
    }

    // Add scales for non-pie charts
    if (type !== 'pie') {
      baseOptions.scales = {
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            font: {
              size: 12
            },
            color: '#6B7280',
            maxRotation: 45
          }
        },
        y: {
          grid: {
            color: 'rgba(229, 231, 235, 0.6)',
            drawBorder: false
          },
          ticks: {
            font: {
              size: 12
            },
            color: '#6B7280',
            callback: function(value: any) {
              // Format large numbers
              if (Math.abs(value) >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`
              } else if (Math.abs(value) >= 1000) {
                return `${(value / 1000).toFixed(0)}K`
              }
              return value.toLocaleString()
            }
          }
        }
      }
    }

    return baseOptions
  }

  // Determine the chart component type
  const getChartType = () => {
    switch (type) {
      case 'line':
      case 'area':
        return 'line'
      case 'bar':
      case 'column':
        return 'bar'
      case 'pie':
        return 'pie'
      default:
        return 'bar'
    }
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div style={{ height: `${height}px` }}>
        <Chart
          ref={chartRef}
          type={getChartType()}
          data={formatChartData()}
          options={buildOptions()}
        />
      </div>
    </div>
  )
}