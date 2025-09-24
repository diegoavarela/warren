"use client";

import React, { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  LinkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export interface Company {
  id: string;
  name: string;
  quickbooksRealmId?: string;
}

interface QuickBooksConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onConnectionSuccess?: (realmId: string) => void;
  onDisconnectionSuccess?: () => void;
}

export function QuickBooksConnectionModal({
  isOpen,
  onClose,
  company,
  onConnectionSuccess,
  onDisconnectionSuccess
}: QuickBooksConnectionModalProps) {
  const localeContext = useLocale();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = !!company.quickbooksRealmId;

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Redirect to QuickBooks OAuth with company context
      const connectUrl = `/api/quickbooks/connect?companyId=${company.id}`;
      window.location.href = connectUrl;
    } catch (error) {
      console.error('Error initiating QuickBooks connection:', error);
      toast.error('Failed to initiate connection');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch(`/api/companies/${company.id}/quickbooks`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Successfully disconnected from QuickBooks');
        onDisconnectionSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting from QuickBooks:', error);
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const renderConnectedContent = () => (
    <div className="space-y-6">
      {/* Connected Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <LinkIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Connected to QuickBooks
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Realm ID: {company.quickbooksRealmId}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={() => window.open(`/dashboard/quickbooks/pnl/${company.id}`, '_blank')}
          className="w-full flex items-center justify-center"
        >
          <InformationCircleIcon className="w-4 h-4 mr-2" />
          View P&L Data
        </Button>

        <Button
          variant="danger"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="w-full flex items-center justify-center"
        >
          {disconnecting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Disconnecting...
            </>
          ) : (
            <>
              <XMarkIcon className="w-4 h-4 mr-2" />
              Disconnect
            </>
          )}
        </Button>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Disconnecting will stop automatic data synchronization. You can reconnect at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotConnectedContent = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center space-y-4">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <LinkIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connect to QuickBooks
          </h3>
          <p className="text-sm text-gray-500">
            Click the button below to connect your company to QuickBooks. You'll be redirected to QuickBooks to authorize access.
          </p>
        </div>
      </div>

      {/* Connection Button */}
      <Button
        onClick={handleConnect}
        disabled={loading}
        className="w-full flex items-center justify-center"
        size="lg"
      >
        <div className="flex items-center justify-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Connecting...
            </>
          ) : (
            <>
              <LinkIcon className="w-4 h-4 mr-2" />
              Connect to QuickBooks
            </>
          )}
        </div>
      </Button>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800 mb-1">
              What happens next?
            </h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• You'll be redirected to QuickBooks Online</li>
              <li>• Authorize Warren to access your financial data</li>
              <li>• Return to Warren with your company connected</li>
              <li>• Start viewing real-time P&L reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {company.name} - QuickBooks Integration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {isConnected ? renderConnectedContent() : renderNotConnectedContent()}
      </div>
    </div>
  );
}