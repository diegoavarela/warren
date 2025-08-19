"use client";

import React, { useState } from 'react';
import { 
  QuestionMarkCircleIcon, 
  SparklesIcon,
  BookOpenIcon 
} from '@heroicons/react/24/outline';
import { SuperCoolHelpModal } from './SuperCoolHelpModal';
import { superCoolHelp } from '@/lib/super-cool-help';
import { useLocale } from '@/contexts/LocaleContext';

interface SuperCoolHelpIconProps {
  topic?: string;
  context?: {
    page?: string;
    widget?: string;
    category?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'minimal' | 'enhanced' | 'glow';
  className?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  showQuickTip?: boolean;
}

export function SuperCoolHelpIcon({ 
  topic,
  context,
  size = 'sm', 
  variant = 'enhanced',
  className = '', 
  tooltipPosition = 'top',
  showQuickTip = true
}: SuperCoolHelpIconProps) {
  const [showModal, setShowModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { locale } = useLocale();
  const isSpanish = locale?.startsWith('es');

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const tooltipPositionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const handleClick = () => {
    if (topic) {
      superCoolHelp.trackInteraction(topic);
    }
    setShowModal(true);
  };

  const getTooltipContent = () => {
    if (topic && showQuickTip) {
      // Try to get a quick answer or tip
      const quickAnswer = superCoolHelp.getQuickAnswer(topic, locale || 'en');
      if (quickAnswer) {
        return quickAnswer.substring(0, 80) + '...';
      }
    }
    
    return isSpanish ? '✨ Ayuda inteligente - Clic para más info' : '✨ Smart help - Click for more info';
  };

  const getButtonClasses = () => {
    const baseClasses = "transition-all duration-200 rounded-full flex items-center justify-center";
    
    switch (variant) {
      case 'minimal':
        return `${baseClasses} text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100`;
      
      case 'glow':
        return `${baseClasses} text-blue-500 hover:text-blue-600 p-2 bg-blue-50 hover:bg-blue-100 shadow-lg hover:shadow-xl hover:scale-110 border border-blue-200`;
      
      case 'enhanced':
      default:
        return `${baseClasses} text-blue-500 hover:text-blue-600 p-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 hover:scale-105 shadow-sm hover:shadow-md`;
    }
  };

  const getIcon = () => {
    if (variant === 'glow') {
      return <SparklesIcon className={sizeClasses[size]} />;
    }
    return <QuestionMarkCircleIcon className={sizeClasses[size]} />;
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          onClick={handleClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`${getButtonClasses()} ${className}`}
          aria-label={isSpanish ? 'Abrir ayuda inteligente' : 'Open smart help'}
        >
          {getIcon()}
          
          {/* Pulse animation for enhanced variants */}
          {variant !== 'minimal' && (
            <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20"></div>
          )}
        </button>

        {/* Enhanced Tooltip */}
        {showTooltip && (
          <div className={`absolute z-50 ${tooltipPositionClasses[tooltipPosition]} pointer-events-none`}>
            <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-xs">
              <div className="font-medium mb-1">
                {isSpanish ? '💡 Ayuda Inteligente' : '💡 Smart Help'}
              </div>
              <div className="opacity-90">
                {getTooltipContent()}
              </div>
              
              {/* Tooltip arrow */}
              <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -z-10"
                style={{
                  ...(tooltipPosition === 'top' && { bottom: '-4px', left: '50%', marginLeft: '-4px' }),
                  ...(tooltipPosition === 'bottom' && { top: '-4px', left: '50%', marginLeft: '-4px' }),
                  ...(tooltipPosition === 'left' && { right: '-4px', top: '50%', marginTop: '-4px' }),
                  ...(tooltipPosition === 'right' && { left: '-4px', top: '50%', marginTop: '-4px' })
                }}
              />
            </div>
          </div>
        )}
        
        {/* Quick access indicator */}
        {variant === 'enhanced' && showQuickTip && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse"></div>
        )}
      </div>

      {/* Super Cool Help Modal */}
      <SuperCoolHelpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        initialTopic={topic}
        initialSearch=""
      />
    </>
  );
}

// Global help button component for main navigation
export function GlobalHelpButton() {
  const [showModal, setShowModal] = useState(false);
  const { locale } = useLocale();
  const isSpanish = locale?.startsWith('es');

  // Listen for global help shortcut
  React.useEffect(() => {
    const handleGlobalHelp = () => setShowModal(true);
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.key === '?' && !e.ctrlKey && !e.metaKey) || e.key === 'F1') {
        e.preventDefault();
        setShowModal(true);
      }
    };

    window.addEventListener('openGlobalHelp', handleGlobalHelp);
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('openGlobalHelp', handleGlobalHelp);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative p-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group"
        aria-label={isSpanish ? 'Abrir centro de ayuda' : 'Open help center'}
      >
        <SparklesIcon className="w-6 h-6" />
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 opacity-50 blur-lg group-hover:opacity-75 transition-opacity duration-200"></div>
        
        {/* Keyboard shortcut hint */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {isSpanish ? 'Presiona ⌘K o ?' : 'Press ⌘K or ?'}
          </div>
        </div>
      </button>

      <SuperCoolHelpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

// Widget-specific help button
export function WidgetHelpButton({ 
  topic, 
  widget, 
  className = "" 
}: { 
  topic?: string; 
  widget?: string; 
  className?: string; 
}) {
  return (
    <SuperCoolHelpIcon
      topic={topic}
      context={{ widget }}
      size="sm"
      variant="enhanced"
      className={className}
      tooltipPosition="top"
      showQuickTip={true}
    />
  );
}