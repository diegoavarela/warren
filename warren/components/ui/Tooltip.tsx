"use client";

import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({
  children,
  content,
  position = 'top',
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + 8;
        break;
    }

    // Ensure tooltip stays within viewport
    if (left < 8) left = 8;
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, position]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={className}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          <div className="bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 px-3 py-2 max-w-xs">
            <div className="text-sm font-medium">
              {content}
            </div>
            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-gray-900 border-gray-700 transform rotate-45 ${
                position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b border-r' :
                position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t border-l' :
                position === 'left' ? 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-t border-r' :
                'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-l'
              }`}
            />
          </div>
        </div>
      )}
    </>
  );
}

interface FinancialTooltipProps {
  accountName: string;
  amount: number;
  currency: string;
  formatValue: (value: number) => string;
  categoryPercentage: number;
  totalPercentage: number;
  categoryName: string;
  totalLabel: string;
}

export function FinancialTooltip({
  accountName,
  amount,
  currency,
  formatValue,
  categoryPercentage,
  totalPercentage,
  categoryName,
  totalLabel
}: FinancialTooltipProps) {
  const content = (
    <div className="space-y-2">
      {/* Account Name */}
      <div className="font-semibold text-white border-b border-gray-600 pb-1">
        {accountName}
      </div>

      {/* Amount */}
      <div className="flex justify-between items-center">
        <span className="text-gray-300">Amount:</span>
        <span className="font-bold text-green-400">
          {currency}{formatValue(amount)}
        </span>
      </div>

      {/* Category Percentage */}
      <div className="flex justify-between items-center">
        <span className="text-gray-300">of {categoryName}:</span>
        <span className="font-semibold text-blue-400">
          {categoryPercentage.toFixed(1)}%
        </span>
      </div>

      {/* Total Percentage */}
      <div className="flex justify-between items-center border-t border-gray-600 pt-1">
        <span className="text-gray-300">of {totalLabel}:</span>
        <span className="font-semibold text-purple-400">
          {totalPercentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );

  return content;
}