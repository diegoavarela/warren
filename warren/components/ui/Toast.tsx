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

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
  actions?: ToastAction[];
  persistent?: boolean;
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
  onClose,
  actions = [],
  persistent = false
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[variant || 'info'];

  useEffect(() => {
    if (duration > 0 && !persistent) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, persistent]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const handleActionClick = (action: ToastAction) => {
    action.onClick();
    if (!persistent) {
      handleClose();
    }
  };

  return (
    <div
      className={`${toastVariants({ variant, position })} ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      } ${actions.length > 0 ? 'flex-col items-start' : ''}`}
      role="alert"
    >
      <div className="flex items-center gap-3 w-full">
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

      {actions.length > 0 && (
        <div className="flex gap-2 mt-3 ml-8">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                action.variant === 'danger'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
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
  actions?: ToastAction[];
  persistent?: boolean;
}

export type ToastPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'top-center' 
  | 'bottom-center';

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
        {toasts.map((toast) => (
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

  const clearAll = () => {
    setToasts([]);
  };

  const success = (title: string, description?: string, options?: Partial<Pick<ToastData, 'duration' | 'actions' | 'persistent'>>) => {
    return addToast({ title, description, variant: 'success', ...options });
  };

  const error = (title: string, description?: string, options?: Partial<Pick<ToastData, 'duration' | 'actions' | 'persistent'>>) => {
    return addToast({ title, description, variant: 'error', duration: options?.duration || 8000, ...options });
  };

  const warning = (title: string, description?: string, options?: Partial<Pick<ToastData, 'duration' | 'actions' | 'persistent'>>) => {
    return addToast({ title, description, variant: 'warning', ...options });
  };

  const info = (title: string, description?: string, options?: Partial<Pick<ToastData, 'duration' | 'actions' | 'persistent'>>) => {
    return addToast({ title, description, variant: 'info', ...options });
  };

  // Helper for common scenarios
  const loading = (title: string, description?: string) => {
    return addToast({ 
      title, 
      description, 
      variant: 'info', 
      persistent: true,
      duration: 0 
    });
  };

  const promise = <T,>(
    promise: Promise<T>,
    options: {
      loading: { title: string; description?: string };
      success: { title: string; description?: string } | ((data: T) => { title: string; description?: string });
      error: { title: string; description?: string } | ((error: any) => { title: string; description?: string });
    }
  ) => {
    const loadingId = loading(options.loading.title, options.loading.description);

    return promise
      .then((data) => {
        removeToast(loadingId);
        const successOptions = typeof options.success === 'function' ? options.success(data) : options.success;
        success(successOptions.title, successOptions.description);
        return data;
      })
      .catch((err) => {
        removeToast(loadingId);
        const errorOptions = typeof options.error === 'function' ? options.error(err) : options.error;
        error(errorOptions.title, errorOptions.description);
        throw err;
      });
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
    loading,
    promise
  };
}