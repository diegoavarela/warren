import React, { useMemo } from 'react'
import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

interface Insight {
  type: 'positive' | 'negative' | 'warning' | 'info'
  icon: React.ReactNode
  title: string
  description: string
}

interface KeyInsightsProps {
  data: any
  type: 'cashflow' | 'pnl'
}

export const KeyInsights: React.FC<KeyInsightsProps> = ({ data, type }) => {
  const { t } = useTranslation()
  const insights = useMemo(() => {
    const results: Insight[] = []
    
    if (!data || !data.chartData) return results
    
    if (type === 'cashflow') {
      // Cashflow specific insights
      const currentMonth = data.currentMonth
      const previousMonth = data.previousMonth
      const chartData = data.chartData
      
      // Cash generation trend
      if (currentMonth?.monthlyGeneration > 0) {
        results.push({
          type: 'positive',
          icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
          title: t('insights.cashflow.positiveCashGeneration.title'),
          description: t('insights.cashflow.positiveCashGeneration.description', { amount: formatCurrency(currentMonth.monthlyGeneration), month: currentMonth.month })
        })
      } else if (currentMonth?.monthlyGeneration < 0) {
        results.push({
          type: 'negative',
          icon: <ArrowTrendingDownIcon className="h-5 w-5" />,
          title: t('insights.cashflow.negativeCashFlow.title'),
          description: t('insights.cashflow.negativeCashFlow.description', { amount: formatCurrency(Math.abs(currentMonth.monthlyGeneration)), month: currentMonth.month })
        })
      }
      
      // Month-over-month comparison
      if (previousMonth && currentMonth) {
        const inflowChange = ((currentMonth.totalIncome - previousMonth.totalIncome) / previousMonth.totalIncome) * 100
        const expenseChange = ((Math.abs(currentMonth.totalExpense) - Math.abs(previousMonth.totalExpense)) / Math.abs(previousMonth.totalExpense)) * 100
        
        if (Math.abs(inflowChange) > 20) {
          results.push({
            type: inflowChange > 0 ? 'positive' : 'warning',
            icon: <ChartBarIcon className="h-5 w-5" />,
            title: inflowChange > 0 ? t('insights.cashflow.revenueSurge.title') : t('insights.cashflow.revenueDrop.title'),
            description: t(inflowChange > 0 ? 'insights.cashflow.revenueSurge.description' : 'insights.cashflow.revenueDrop.description', { percentage: Math.abs(inflowChange).toFixed(1), month: previousMonth.month })
          })
        }
        
        if (expenseChange > 15) {
          results.push({
            type: 'warning',
            icon: <ExclamationTriangleIcon className="h-5 w-5" />,
            title: t('insights.cashflow.risingExpenses.title'),
            description: t('insights.cashflow.risingExpenses.description', { percentage: expenseChange.toFixed(1), previousMonth: previousMonth.month, currentMonth: currentMonth.month })
          })
        }
      }
      
      // Cash runway warning
      if (currentMonth?.finalBalance < currentMonth?.totalExpense * 3) {
        results.push({
          type: 'warning',
          icon: <CalendarIcon className="h-5 w-5" />,
          title: t('insights.cashflow.lowCashRunway.title'),
          description: t('insights.cashflow.lowCashRunway.description')
        })
      }
      
      // Seasonal pattern detection
      const monthlyAverages = new Map<string, number[]>()
      chartData.forEach((item: any) => {
        const month = item.month
        if (!monthlyAverages.has(month)) {
          monthlyAverages.set(month, [])
        }
        monthlyAverages.get(month)!.push(item.income)
      })
      
      const currentMonthAvg = monthlyAverages.get(currentMonth?.month)
      if (currentMonthAvg && currentMonthAvg.length > 1) {
        const avg = currentMonthAvg.reduce((a, b) => a + b, 0) / currentMonthAvg.length
        if (currentMonth.totalIncome > avg * 1.2) {
          results.push({
            type: 'info',
            icon: <CalendarIcon className="h-5 w-5" />,
            title: t('insights.cashflow.aboveSeasonalAverage.title'),
            description: t('insights.cashflow.aboveSeasonalAverage.description', { month: currentMonth.month })
          })
        }
      }
      
    } else {
      // P&L specific insights
      const currentMonth = data.currentMonth
      const previousMonth = data.previousMonth
      const chartData = data.chartData
      
      // Profit margin analysis
      if (currentMonth?.netMargin !== undefined) {
        if (currentMonth.netMargin < 0) {
          results.push({
            type: 'negative',
            icon: <ExclamationTriangleIcon className="h-5 w-5" />,
            title: t('insights.pnl.operatingAtLoss.title'),
            description: t('insights.pnl.operatingAtLoss.description', { margin: currentMonth.netMargin.toFixed(1) })
          })
        } else if (currentMonth.netMargin > 20) {
          results.push({
            type: 'positive',
            icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
            title: t('insights.pnl.strongProfitability.title'),
            description: t('insights.pnl.strongProfitability.description', { margin: currentMonth.netMargin.toFixed(1) })
          })
        }
      }
      
      // Gross margin trend
      if (currentMonth?.grossMargin !== undefined) {
        if (currentMonth.grossMargin < 30) {
          results.push({
            type: 'warning',
            icon: <ChartBarIcon className="h-5 w-5" />,
            title: t('insights.pnl.lowGrossMargin.title'),
            description: t('insights.pnl.lowGrossMargin.description', { margin: currentMonth.grossMargin.toFixed(1) })
          })
        }
      }
      
      // Operating expense ratio
      if (currentMonth?.operatingExpenses && currentMonth?.revenue) {
        const opexRatio = (currentMonth.operatingExpenses / currentMonth.revenue) * 100
        if (opexRatio > 50) {
          results.push({
            type: 'warning',
            icon: <CurrencyDollarIcon className="h-5 w-5" />,
            title: t('insights.pnl.highOperatingExpenses.title'),
            description: t('insights.pnl.highOperatingExpenses.description', { ratio: opexRatio.toFixed(1) })
          })
        }
      }
      
      // Revenue growth
      if (previousMonth && currentMonth) {
        const revenueGrowth = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
        if (Math.abs(revenueGrowth) > 10) {
          results.push({
            type: revenueGrowth > 0 ? 'positive' : 'negative',
            icon: revenueGrowth > 0 ? <ArrowTrendingUpIcon className="h-5 w-5" /> : <ArrowTrendingDownIcon className="h-5 w-5" />,
            title: revenueGrowth > 0 ? t('insights.pnl.revenueGrowth.title') : t('insights.pnl.revenueDecline.title'),
            description: t(revenueGrowth > 0 ? 'insights.pnl.revenueGrowth.description' : 'insights.pnl.revenueDecline.description', { percentage: Math.abs(revenueGrowth).toFixed(1), month: previousMonth.month })
          })
        }
      }
      
      // EBITDA performance
      if (currentMonth?.ebitda !== undefined) {
        if (currentMonth.ebitda < 0) {
          results.push({
            type: 'negative',
            icon: <ExclamationTriangleIcon className="h-5 w-5" />,
            title: t('insights.pnl.negativeEBITDA.title'),
            description: t('insights.pnl.negativeEBITDA.description')
          })
        } else if (currentMonth.ebitdaMargin > 15) {
          results.push({
            type: 'positive',
            icon: <SparklesIcon className="h-5 w-5" />,
            title: t('insights.pnl.strongEBITDA.title'),
            description: t('insights.pnl.strongEBITDA.description', { margin: currentMonth.ebitdaMargin.toFixed(1) })
          })
        }
      }
    }
    
    // Limit to top 3 insights for single line display
    return results.slice(0, 3)
  }, [data, type])
  
  if (insights.length === 0) return null
  
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-900 bg-clip-text text-transparent mb-6">
        {t('dashboard.keyInsights')}
      </h2>
      
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 border ${
                insight.type === 'positive' 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : insight.type === 'negative'
                  ? 'bg-red-50 border-red-200'
                  : insight.type === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  insight.type === 'positive' 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : insight.type === 'negative'
                    ? 'bg-red-100 text-red-600'
                    : insight.type === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {insight.icon}
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold text-sm mb-1 ${
                    insight.type === 'positive' 
                      ? 'text-emerald-900' 
                      : insight.type === 'negative'
                      ? 'text-red-900'
                      : insight.type === 'warning'
                      ? 'text-amber-900'
                      : 'text-blue-900'
                  }`}>
                    {insight.title}
                  </h3>
                  <p className={`text-xs ${
                    insight.type === 'positive' 
                      ? 'text-emerald-700' 
                      : insight.type === 'negative'
                      ? 'text-red-700'
                      : insight.type === 'warning'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}>
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LightBulbIcon className="h-4 w-4 text-gray-400" />
              <p className="text-xs text-gray-500">
                {t('insights.generatedFrom')}
              </p>
            </div>
            <p className="text-xs text-gray-400">
              {t('common.updated')}: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  } else {
    return `$${amount.toFixed(0)}`
  }
}