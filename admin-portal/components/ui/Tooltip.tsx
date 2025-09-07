import React, { ReactNode, useState } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  delay = 300,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const getPositionStyles = () => {
    const baseStyles = 'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none';
    
    switch (position) {
      case 'top':
        return `${baseStyles} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseStyles} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseStyles} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseStyles} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseStyles} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowStyles = () => {
    switch (position) {
      case 'top':
        return 'absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900';
      case 'bottom':
        return 'absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900';
      case 'left':
        return 'absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900';
      case 'right':
        return 'absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900';
      default:
        return 'absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900';
    }
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div className={getPositionStyles()}>
          {content}
          <div className={getArrowStyles()}></div>
        </div>
      )}
    </div>
  );
};

// Utility component for icon buttons with tooltips
interface IconButtonProps {
  icon: ReactNode;
  tooltip: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  tooltip,
  onClick,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
      case 'secondary':
        return 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-transparent';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400';
      default:
        return 'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-1 text-xs';
      case 'md':
        return 'p-1.5 text-sm';
      case 'lg':
        return 'p-2 text-base';
      default:
        return 'p-1.5 text-sm';
    }
  };

  const buttonClasses = `
    inline-flex items-center justify-center rounded-md transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${getVariantStyles()} ${getSizeStyles()} ${className}
  `.trim();

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={buttonClasses}
      >
        {icon}
      </button>
    </Tooltip>
  );
};