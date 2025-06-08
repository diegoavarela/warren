import { useTranslation } from 'react-i18next'
import { LightBulbIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface HighlightsSectionProps {
  highlights: {
    pastThreeMonths: string[]
    nextSixMonths: string[]
  }
}

export function HighlightsSection({ highlights }: HighlightsSectionProps) {
  const { t } = useTranslation()

  const getHighlightIcon = (text: string) => {
    if (text.toLowerCase().includes('increase') || text.toLowerCase().includes('exceeded') || text.toLowerCase().includes('secured')) {
      return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
    }
    if (text.toLowerCase().includes('shortage') || text.toLowerCase().includes('decrease') || text.toLowerCase().includes('loss')) {
      return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
    }
    return <LightBulbIcon className="h-5 w-5 text-blue-600" />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Past 3 Months */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />
          </div>
          {t('dashboard.highlights.pastThreeMonths')}
        </h3>
        <ul className="space-y-3">
          {highlights.pastThreeMonths.map((highlight, index) => (
            <li key={index} className="flex items-start">
              <div className="mr-3 mt-0.5">
                {getHighlightIcon(highlight)}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{highlight}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Next 6 Months */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <div className="w-8 h-8 bg-vortex-green bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
            <LightBulbIcon className="h-5 w-5 text-vortex-green" />
          </div>
          {t('dashboard.highlights.nextSixMonths')}
        </h3>
        <ul className="space-y-3">
          {highlights.nextSixMonths.map((highlight, index) => (
            <li key={index} className="flex items-start">
              <div className="mr-3 mt-0.5">
                {getHighlightIcon(highlight)}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{highlight}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}