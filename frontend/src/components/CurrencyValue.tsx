import React, { useState, useEffect } from 'react'
import { useCurrency } from '../hooks/useCurrency'
import { Currency } from '../interfaces/currency'

interface CurrencyValueProps {
  amount: number
  fromCurrency?: Currency
  className?: string
  showSign?: boolean
}

export const CurrencyValue: React.FC<CurrencyValueProps> = ({
  amount,
  fromCurrency,
  className = '',
  showSign = false
}) => {
  const { convertAmount, formatAmount, currency, settings } = useCurrency()
  const [displayValue, setDisplayValue] = useState<string>('--')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const updateValue = async () => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        setDisplayValue(formatAmount(0))
        return
      }

      setLoading(true)
      try {
        let valueToDisplay = amount

        // Convert currency if needed
        if (settings.enableCurrencyConversion && fromCurrency && fromCurrency !== currency) {
          valueToDisplay = await convertAmount(amount, fromCurrency)
        }

        const formatted = formatAmount(valueToDisplay)
        
        // Add sign if requested
        if (showSign && amount !== 0) {
          setDisplayValue(amount > 0 ? `+${formatted}` : formatted)
        } else {
          setDisplayValue(formatted)
        }
      } catch (error) {
        console.error('Error formatting currency value:', error)
        setDisplayValue(formatAmount(amount))
      } finally {
        setLoading(false)
      }
    }

    updateValue()
  }, [amount, fromCurrency, currency, settings.enableCurrencyConversion, convertAmount, formatAmount, showSign])

  if (loading) {
    return <span className={`${className} opacity-50`}>...</span>
  }

  return <span className={className}>{displayValue}</span>
}