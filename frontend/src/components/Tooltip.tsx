import React, { ReactNode } from 'react'

interface TooltipProps {
  content: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top' 
}) => {
  return (
    <div className="relative inline-block group">
      {children}
      <div className={`
        absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100
        bg-gray-900 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap
        transition-opacity duration-200
        ${position === 'top' ? 'bottom-full left-1/2 transform -translate-x-1/2 mb-2' : ''}
        ${position === 'bottom' ? 'top-full left-1/2 transform -translate-x-1/2 mt-2' : ''}
        ${position === 'left' ? 'right-full top-1/2 transform -translate-y-1/2 mr-2' : ''}
        ${position === 'right' ? 'left-full top-1/2 transform -translate-y-1/2 ml-2' : ''}
      `}>
        {content}
        <div className={`
          absolute border-4 border-transparent
          ${position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 -mt-1 border-t-gray-900' : ''}
          ${position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-b-gray-900' : ''}
          ${position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2 -ml-1 border-l-gray-900' : ''}
          ${position === 'right' ? 'right-full top-1/2 transform -translate-y-1/2 -mr-1 border-r-gray-900' : ''}
        `}></div>
      </div>
    </div>
  )
}