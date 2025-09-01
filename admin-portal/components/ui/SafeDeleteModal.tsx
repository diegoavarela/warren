"use client";

import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SafeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: string;
  warningMessage?: string;
  affectedItems?: { name: string; type: string }[];
  loading?: boolean;
}

export function SafeDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
  warningMessage,
  affectedItems = [],
  loading = false,
}: SafeDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmValid = confirmText === itemName;

  const handleConfirm = () => {
    if (isConfirmValid) {
      onConfirm();
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={handleClose} size="medium">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Are you absolutely sure?
          </h3>
          <p className="text-sm text-gray-600">
            This action cannot be undone. This will permanently delete the{' '}
            <span className="font-semibold">{itemType}</span>{' '}
            <span className="font-semibold text-red-600">"{itemName}"</span>.
          </p>
          
          {warningMessage && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">{warningMessage}</p>
            </div>
          )}
        </div>

        {/* Affected Items */}
        {affectedItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <h4 className="text-sm font-semibold text-red-800 mb-2">
              This will also affect:
            </h4>
            <ul className="space-y-1">
              {affectedItems.map((item, index) => (
                <li key={index} className="text-sm text-red-700 flex items-center">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-red-600 ml-1">({item.type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Please type <span className="font-bold text-red-600">"{itemName}"</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder={`Type "${itemName}" here...`}
            autoComplete="off"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmValid || loading}
            loading={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            Delete {itemType}
          </Button>
        </div>
      </div>
    </Modal>
  );
}