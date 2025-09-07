import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export type ToastPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'top-center' 
  | 'bottom-center';

const toastVariants = cva(
  'pointer-events-auto flex items-center gap-3 w-full max-w-md rounded-lg p-4 shadow-2xl transition-all duration-300 ease-in-out transform',
  {
    variants: {
      variant: {
        success: 'bg-white border border-green-200 text-green-900',
        error: 'bg-white border border-red-200 text-red-900',
        warning: 'bg-white border border-yellow-200 text-yellow-900',
        info: 'bg-white border border-blue-200 text-blue-900'
      },
      position: {
        'top-right': 'animate-slide-in-right',
        'top-left': 'animate-slide-in-left',
        'bottom-right': 'animate-slide-in-right',
        'bottom-left': 'animate-slide-in-left',
        'top-center': 'animate-slide-down',
        'bottom-center': 'animate-slide-up'
      }
    },
    defaultVariants: {
      variant: 'info',
      position: 'top-right'
    }
  }
);

export interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  position?: ToastPosition;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon
};

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500'
};

export function Toast({ 
  id, 
  title, 
  description, 
  variant = 'info', 
  position = 'top-right',
  duration = 5000, 
  onClose 
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[variant || 'info'];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={`${toastVariants({ variant, position })} ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[variant || 'info']}`} />
      
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm opacity-90 mt-0.5">{description}</p>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-4 inline-flex rounded-md p-1.5 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        <span className="sr-only">Close</span>
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  position?: ToastPosition;
  onClose: (id: string) => void;
}

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-center': 'top-0 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2'
};

export function ToastContainer({ 
  toasts, 
  position = 'top-right', 
  onClose 
}: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed z-[100] p-4 ${positionClasses[position]} pointer-events-none`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-3">
        {(toasts || []).map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            position={position}
            onClose={onClose}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (title: string, description?: string, duration?: number) => {
    return addToast({ title, description, variant: 'success', duration });
  };

  const error = (title: string, description?: string, duration?: number) => {
    return addToast({ title, description, variant: 'error', duration });
  };

  const warning = (title: string, description?: string, duration?: number) => {
    return addToast({ title, description, variant: 'warning', duration });
  };

  const info = (title: string, description?: string, duration?: number) => {
    return addToast({ title, description, variant: 'info', duration });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
}