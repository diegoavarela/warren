'use client';

import { useState, useEffect } from 'react';
import { Plus, Keyboard } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface FloatingAddButtonProps {
  onAdd: () => void;
  sectionName: string;
  isVisible?: boolean;
  disabled?: boolean;
  className?: string;
  showKeyboardHint?: boolean;
}

export function FloatingAddButton({
  onAdd,
  sectionName,
  isVisible = true,
  disabled = false,
  className,
  showKeyboardHint = true
}: FloatingAddButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 transition-all duration-300",
        "md:bottom-4 md:right-4 bottom-3 right-3", // Much closer to edge
        isAnimating && "animate-in slide-in-from-bottom-4 fade-in-0",
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onTouchStart={() => setShowTooltip(true)}
      onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)} // Keep tooltip longer on touch
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap animate-in fade-in-0 slide-in-from-bottom-2">
          <span>Agregar {sectionName}</span>
          {showKeyboardHint && (
            <>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                <span className="text-xs text-gray-300">Ctrl+N</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Main Button */}
      <Button
        onClick={onAdd}
        disabled={disabled}
        size="lg"
        className={cn(
          "h-14 w-14 md:h-14 md:w-14 h-12 w-12 rounded-full shadow-lg hover:shadow-xl", // Smaller on mobile
          "bg-blue-600 hover:bg-blue-700 text-white",
          "transition-all duration-200 hover:scale-105 active:scale-95",
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          "touch-manipulation", // Optimize for touch
          disabled && "opacity-50 cursor-not-allowed hover:scale-100"
        )}
        aria-label={`Agregar nueva categoría en ${sectionName}`}
      >
        <Plus className="h-6 w-6 md:h-6 md:w-6 h-5 w-5" />
      </Button>

      {/* Section Badge */}
      <Badge 
        variant="secondary" 
        className="bg-white/90 text-gray-700 shadow-sm border border-gray-200 text-xs font-medium px-2 py-1"
      >
        {sectionName}
      </Badge>
    </div>
  );
}

// Hook to manage floating button visibility based on scroll position
export function useFloatingButtonVisibility(
  triggerElementRef: React.RefObject<HTMLElement>,
  offset = 100
) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!triggerElementRef.current) return;

      const rect = triggerElementRef.current.getBoundingClientRect();
      const isElementVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      
      // Show floating button when trigger element is out of view (scrolled past)
      setIsVisible(!isElementVisible || rect.bottom < offset);
    };

    // Initial check
    handleScroll();

    // Listen to scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [triggerElementRef, offset]);

  return isVisible;
}