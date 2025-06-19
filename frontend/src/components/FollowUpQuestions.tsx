import React, { useState, useEffect } from 'react'
import { LightBulbIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { AnalysisResponse } from '../services/analysisService'

interface FollowUpQuestionsProps {
  lastQuery: string
  lastResponse: AnalysisResponse
  onQuestionClick: (question: string) => void
}

interface SuggestedQuestion {
  question: string
  category: 'deep-dive' | 'comparison' | 'trend' | 'explanation' | 'what-if'
  relevance: number
}

export const FollowUpQuestions: React.FC<FollowUpQuestionsProps> = ({
  lastQuery,
  lastResponse,
  onQuestionClick
}) => {
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([])
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    generateFollowUpQuestions()
  }, [lastQuery, lastResponse])

  const generateFollowUpQuestions = () => {
    const questions: SuggestedQuestion[] = []
    const queryLower = lastQuery.toLowerCase()

    // Analyze the last query and response to generate contextual follow-ups
    
    // If the response contains charts, suggest drill-down questions
    if (lastResponse.charts && lastResponse.charts.length > 0) {
      lastResponse.charts.forEach(chart => {
        if (chart.type === 'line' || chart.type === 'bar') {
          questions.push({
            question: `What caused the ${chart.data.datasets[0]?.label || 'values'} to change over time?`,
            category: 'explanation',
            relevance: 0.9
          })
          
          // Find highest and lowest points
          const data = chart.data.datasets[0]?.data || []
          if (data.length > 0) {
            const max = Math.max(...data)
            const min = Math.min(...data)
            const maxIndex = data.indexOf(max)
            const minIndex = data.indexOf(min)
            
            if (maxIndex !== -1) {
              questions.push({
                question: `Why was ${chart.data.datasets[0]?.label || 'the value'} highest in ${chart.data.labels[maxIndex]}?`,
                category: 'deep-dive',
                relevance: 0.85
              })
            }
            
            if (minIndex !== -1 && minIndex !== maxIndex) {
              questions.push({
                question: `What factors contributed to the low in ${chart.data.labels[minIndex]}?`,
                category: 'deep-dive',
                relevance: 0.85
              })
            }
          }
        }
      })
    }

    // If the response contains tables, suggest analysis questions
    if (lastResponse.tables && lastResponse.tables.length > 0) {
      lastResponse.tables.forEach(table => {
        questions.push({
          question: `Can you show the trend analysis for ${table.title}?`,
          category: 'trend',
          relevance: 0.8
        })
        
        if (table.headers.length > 2) {
          questions.push({
            question: `Compare the different ${table.headers[1]} values across ${table.headers[0]}`,
            category: 'comparison',
            relevance: 0.75
          })
        }
      })
    }

    // Context-based questions based on the query content
    if (queryLower.includes('revenue')) {
      questions.push(
        {
          question: 'What are the main revenue drivers?',
          category: 'deep-dive',
          relevance: 0.9
        },
        {
          question: 'How does revenue growth compare to industry benchmarks?',
          category: 'comparison',
          relevance: 0.7
        },
        {
          question: 'What if revenue grows by 20% next quarter?',
          category: 'what-if',
          relevance: 0.6
        }
      )
    }

    if (queryLower.includes('cost') || queryLower.includes('expense')) {
      questions.push(
        {
          question: 'Which cost categories are growing fastest?',
          category: 'trend',
          relevance: 0.9
        },
        {
          question: 'What are the opportunities for cost reduction?',
          category: 'deep-dive',
          relevance: 0.85
        },
        {
          question: 'How do our costs compare to revenue growth?',
          category: 'comparison',
          relevance: 0.8
        }
      )
    }

    if (queryLower.includes('cash') || queryLower.includes('liquidity')) {
      questions.push(
        {
          question: 'What is our cash runway at current burn rate?',
          category: 'trend',
          relevance: 0.95
        },
        {
          question: 'Which activities are consuming the most cash?',
          category: 'deep-dive',
          relevance: 0.9
        },
        {
          question: 'How does cash generation compare to profit?',
          category: 'comparison',
          relevance: 0.8
        }
      )
    }

    if (queryLower.includes('margin')) {
      questions.push(
        {
          question: 'What factors are impacting margin compression/expansion?',
          category: 'explanation',
          relevance: 0.9
        },
        {
          question: 'How do margins compare across different product lines?',
          category: 'comparison',
          relevance: 0.85
        },
        {
          question: 'What would improve margins by 5 percentage points?',
          category: 'what-if',
          relevance: 0.7
        }
      )
    }

    // Add general analytical questions if few specific ones were generated
    if (questions.length < 3) {
      questions.push(
        {
          question: 'Show me the year-over-year comparison',
          category: 'comparison',
          relevance: 0.7
        },
        {
          question: 'What are the key insights from this data?',
          category: 'explanation',
          relevance: 0.65
        },
        {
          question: 'What trends should we monitor closely?',
          category: 'trend',
          relevance: 0.6
        }
      )
    }

    // Sort by relevance and take top 5
    const sortedQuestions = questions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      // Remove duplicates
      .filter((q, index, self) => 
        index === self.findIndex(t => t.question === q.question)
      )

    setSuggestions(sortedQuestions)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'deep-dive':
        return '🔍'
      case 'comparison':
        return '📊'
      case 'trend':
        return '📈'
      case 'explanation':
        return '💡'
      case 'what-if':
        return '🤔'
      default:
        return '❓'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'deep-dive':
        return 'bg-blue-50 hover:bg-blue-100 text-blue-700'
      case 'comparison':
        return 'bg-green-50 hover:bg-green-100 text-green-700'
      case 'trend':
        return 'bg-purple-50 hover:bg-purple-100 text-purple-700'
      case 'explanation':
        return 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
      case 'what-if':
        return 'bg-pink-50 hover:bg-pink-100 text-pink-700'
      default:
        return 'bg-gray-50 hover:bg-gray-100 text-gray-700'
    }
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="mt-4">
      <div 
        className="flex items-center justify-between cursor-pointer p-2 hover:bg-gray-50 rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <LightBulbIcon className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium text-gray-700">
            Suggested follow-up questions
          </span>
        </div>
        <ArrowRightIcon 
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`} 
        />
      </div>
      
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick(suggestion.question)}
              className={`
                w-full text-left p-3 rounded-lg text-sm
                ${getCategoryColor(suggestion.category)}
                transition-colors group flex items-center justify-between
              `}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getCategoryIcon(suggestion.category)}</span>
                <span>{suggestion.question}</span>
              </div>
              <ArrowRightIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}