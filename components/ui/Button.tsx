import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'relative inline-flex items-center justify-center font-medium transition-all duration-300 ease-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none overflow-hidden group',
  {
    variants: {
      variant: {
        // Primary variants with beautiful gradients and shadows
        primary: 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 hover:-translate-y-0.5 focus:ring-blue-500 rounded-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        
        secondary: 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-800 shadow-md shadow-gray-400/20 hover:shadow-lg hover:shadow-gray-400/30 hover:-translate-y-0.5 focus:ring-gray-400 rounded-xl border border-gray-200/50',
        
        success: 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-lg shadow-green-900/20 hover:shadow-xl hover:shadow-green-900/30 hover:-translate-y-0.5 focus:ring-green-500 rounded-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        
        danger: 'bg-gradient-to-r from-red-500 via-red-600 to-rose-700 text-white shadow-lg shadow-red-900/20 hover:shadow-xl hover:shadow-red-900/30 hover:-translate-y-0.5 focus:ring-red-500 rounded-xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700',
        
        // Ghost with subtle hover effect
        ghost: 'text-gray-700 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 focus:ring-gray-400 rounded-lg hover:shadow-md transition-all duration-200',
        
        // Outline with gradient border
        outline: 'relative bg-white text-gray-700 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:ring-gray-400 before:absolute before:inset-0 before:rounded-xl before:p-[2px] before:bg-gradient-to-r before:from-gray-200 before:via-gray-300 before:to-gray-200 before:-z-10 hover:before:from-gray-300 hover:before:via-gray-400 hover:before:to-gray-300 transition-all duration-300',
        
        // New fancy variants
        gradient: 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-xl shadow-purple-900/30 hover:shadow-2xl hover:shadow-purple-900/40 hover:-translate-y-1 hover:scale-[1.02] focus:ring-purple-500 rounded-xl font-semibold tracking-wide before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/30 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000',
        
        glow: 'relative bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-2xl hover:-translate-y-1 hover:scale-[1.02] focus:ring-blue-500 before:absolute before:inset-0 before:bg-gradient-to-r before:from-cyan-500 before:via-blue-600 before:to-purple-600 before:rounded-xl before:blur-xl before:opacity-70 hover:before:opacity-100 before:transition-opacity before:duration-500 before:-z-10',
        
        soft: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-indigo-700 shadow-sm shadow-indigo-200/50 hover:shadow-md hover:shadow-indigo-300/50 hover:-translate-y-0.5 focus:ring-indigo-400 rounded-xl border border-indigo-100/50 font-medium',
        
        neon: 'bg-black text-white rounded-xl font-bold tracking-wider shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] border-2 border-blue-500 hover:border-blue-400 hover:-translate-y-0.5 focus:ring-blue-500 transition-all duration-300',
        
        glass: 'backdrop-blur-md bg-white/10 text-white border border-white/20 rounded-xl shadow-lg hover:bg-white/20 hover:shadow-xl hover:-translate-y-0.5 focus:ring-white/50 transition-all duration-300',
      },
      size: {
        xs: 'text-xs px-3 py-1.5',
        sm: 'text-sm px-4 py-2',
        md: 'text-sm px-5 py-2.5',
        lg: 'text-base px-6 py-3',
        xl: 'text-lg px-8 py-4'
      },
      rounded: {
        sm: 'rounded-md',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        full: 'rounded-full',
      }
    },
    compoundVariants: [
      // Add extra glow for certain variants when focused
      {
        variant: ['primary', 'success', 'danger', 'gradient', 'glow'],
        className: 'focus:ring-offset-2 focus:ring-2'
      }
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      rounded: 'lg'
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  pulse?: boolean;
  shimmer?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, rounded, loading, leftIcon, rightIcon, children, disabled, pulse, shimmer, ...props }, ref) => {
    return (
      <button
        className={`${buttonVariants({ variant, size, rounded, className })} ${
          pulse && !disabled && !loading ? 'animate-pulse' : ''
        } ${
          shimmer && !disabled && !loading ? 'animate-shimmer bg-[length:200%_100%]' : ''
        }`}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="relative flex items-center justify-center z-10">
          {loading ? (
            <>
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="animate-pulse">Loading...</span>
            </>
          ) : (
            <>
              {leftIcon && (
                <span className="mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-5deg]">
                  {leftIcon}
                </span>
              )}
              <span className="relative">
                {children}
              </span>
              {rightIcon && (
                <span className="ml-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[5deg]">
                  {rightIcon}
                </span>
              )}
            </>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };