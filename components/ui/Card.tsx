import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'bg-white rounded-xl overflow-hidden transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1',
        elevated: 'shadow-lg hover:shadow-2xl hover:-translate-y-2 ring-1 ring-gray-100',
        flat: 'border-0 shadow-none bg-gray-50',
        gradient: 'bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl hover:-translate-y-1 border border-gray-100',
        glass: 'backdrop-blur-md bg-white/90 shadow-xl hover:shadow-2xl hover:-translate-y-1 border border-white/20'
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      },
      interactive: {
        true: 'cursor-pointer transform transition-all duration-300',
        false: ''
      },
      glow: {
        true: '',
        false: ''
      }
    },
    compoundVariants: [
      {
        variant: 'default',
        glow: true,
        className: 'shadow-blue-500/10 hover:shadow-blue-500/20'
      },
      {
        variant: 'elevated',
        glow: true,
        className: 'shadow-indigo-500/10 hover:shadow-indigo-500/20'
      }
    ],
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false,
      glow: false
    }
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hoverEffect?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, glow, hoverEffect = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${cardVariants({ variant, padding, interactive, glow, className })} ${
          hoverEffect ? 'group' : ''
        }`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white ${className || ''}`}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-6 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardBody.displayName = 'CardBody';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white ${className || ''}`}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-lg font-semibold text-gray-900 transition-colors duration-200 group-hover:text-blue-600 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-sm text-gray-600 mt-1 transition-colors duration-200 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

export { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription, cardVariants };