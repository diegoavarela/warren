"use client";

import React from 'react';

interface FeatureTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function FeatureTooltip({ 
  children, 
  title, 
  description, 
  position = 'top',
  className = '' 
}: FeatureTooltipProps) {
  const getTooltipPosition = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 transform -translate-y-1/2';
      default:
        return 'bottom-full mb-2 left-1/2 transform -translate-x-1/2';
    }
  };

  const getArrowPosition = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900';
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {children}
      
      {/* Tooltip */}
      <div className={`absolute ${getTooltipPosition()} bg-gray-900 text-white text-xs rounded-lg py-3 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 max-w-xs shadow-lg`}>
        <div className="font-semibold mb-1">{title}</div>
        <div className="text-gray-200">{description}</div>
        <div className={`absolute ${getArrowPosition()}`}></div>
      </div>
    </div>
  );
}