"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ComponentType<{ className?: string }>;
  isDangerous?: boolean;
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: TrashIcon,
    iconColor: 'text-red-600',
    confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    iconBg: 'bg-red-100'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-600',
    confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    iconBg: 'bg-yellow-100'
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-blue-600',
    confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    iconBg: 'bg-blue-100'
  }
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  icon: CustomIcon,
  isDangerous = false,
  isLoading = false
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const config = variantConfig[variant];
  const IconComponent = CustomIcon || config.icon;

  const handleClose = () => {
    if (confirming) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 150);
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await onConfirm();
      handleClose();
    } catch (error) {
      console.error('Confirmation failed:', error);
    } finally {
      setConfirming(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-150 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-150 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={confirming}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 disabled:opacity-50"
        >
          <span className="sr-only">Close</span>
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg} mb-4`}>
            <IconComponent className={`w-6 h-6 ${config.iconColor}`} aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="text-center">
            <h3
              id="dialog-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              {title}
            </h3>
            {description && (
              <p id="dialog-description" className="text-sm text-gray-600 mb-6">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={confirming}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${config.confirmButton}`}
            >
              {confirming ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Hook for managing confirm dialogs
export function useConfirmDialog() {
  const [dialog, setDialog] = useState<Omit<ConfirmDialogProps, 'isOpen' | 'onClose'> | null>(null);

  const confirm = (props: Omit<ConfirmDialogProps, 'isOpen' | 'onClose' | 'onConfirm'> & {
    onConfirm: () => Promise<void> | void;
  }) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        ...props,
        onConfirm: async () => {
          try {
            await props.onConfirm();
            resolve(true);
          } catch (error) {
            resolve(false);
            throw error;
          }
        }
      });
    });
  };

  const close = () => {
    setDialog(null);
  };

  return {
    confirm,
    close,
    ConfirmDialog: dialog ? (
      <ConfirmDialog
        {...dialog}
        isOpen={!!dialog}
        onClose={close}
      />
    ) : null
  };
}