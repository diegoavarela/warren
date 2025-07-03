import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'bg-white rounded-lg shadow-sm overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border border-gray-200',
        elevated: 'shadow-md hover:shadow-lg transition-shadow',
        flat: 'border-0 shadow-none bg-gray-50'
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md'
    }
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ variant, padding, className })}
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
        className={`px-6 py-4 border-b border-gray-200 ${className || ''}`}
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
        className={`px-6 py-4 border-t border-gray-200 bg-gray-50 ${className || ''}`}
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
        className={`text-lg font-semibold text-gray-900 ${className || ''}`}
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
        className={`text-sm text-gray-600 mt-1 ${className || ''}`}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

export { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription, cardVariants };