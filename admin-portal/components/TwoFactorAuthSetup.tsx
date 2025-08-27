import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { 
  QrCodeIcon, 
  KeyIcon, 
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface TwoFactorAuthSetupProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SetupData {
  secret: string;
  qrCodeURL: string;
  backupCodes: string[];
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export function TwoFactorAuthSetup({ user, isOpen, onClose, onSuccess }: TwoFactorAuthSetupProps) {
  const [currentStep, setCurrentStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleClose = () => {
    setCurrentStep('setup');
    setSetupData(null);
    setVerificationCode('');
    setError('');
    onClose();
  };

  const startSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await apiRequest(`/api/users/${user.id}/2fa/setup`, {
        method: 'POST'
      });

      const result = await response.json();
      
      if (result.success) {
        setSetupData(result.data);
        setCurrentStep('verify');
      } else {
        setError(result.error || 'Failed to setup 2FA');
      }
    } catch (error) {
      setError('Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || !setupData) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest(`/api/users/${user.id}/2fa/toggle`, {
        method: 'POST',
        body: JSON.stringify({
          token: verificationCode,
          action: 'enable'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentStep('backup');
        toast.success('2FA Enabled', '2FA has been enabled successfully');
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied', 'Copied to clipboard');
    } catch (error) {
      toast.error('Copy Failed', 'Failed to copy to clipboard');
    }
  };

  const completeSetup = () => {
    setCurrentStep('complete');
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Setup Two-Factor Authentication"
      size="lg"
    >
      <div className="space-y-6">
        {/* Step Progress */}
        <div className="flex items-center justify-center space-x-4">
          {['setup', 'verify', 'backup', 'complete'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step
                  ? 'bg-blue-600 text-white'
                  : ['setup', 'verify', 'backup', 'complete'].indexOf(currentStep) > index
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {['setup', 'verify', 'backup', 'complete'].indexOf(currentStep) > index ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className={`w-12 h-0.5 ${
                  ['setup', 'verify', 'backup', 'complete'].indexOf(currentStep) > index
                    ? 'bg-green-600'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Setup */}
        {currentStep === 'setup' && (
          <div className="text-center space-y-4">
            <ShieldCheckIcon className="w-16 h-16 text-blue-600 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Enable Two-Factor Authentication</h3>
              <p className="text-gray-600 mt-2">
                Add an extra layer of security to <strong>{user.firstName} {user.lastName}</strong>'s account with 2FA.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">What you'll need:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                <li>• The user's mobile device or computer</li>
                <li>• A secure place to store backup codes</li>
              </ul>
            </div>
            <Button
              onClick={startSetup}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  <QrCodeIcon className="w-5 h-5" />
                  <span>Start Setup</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Verify */}
        {currentStep === 'verify' && setupData && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Scan QR Code</h3>
              <p className="text-gray-600 mt-1">
                Scan this QR code with your authenticator app, then enter the 6-digit code below.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrCodeURL)}`}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>

            {/* Manual Entry */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Can't scan? Enter this code manually:
              </h4>
              <div className="flex items-center space-x-2">
                <code className="flex-1 text-xs bg-white border rounded px-2 py-1 font-mono">
                  {setupData.secret}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.secret)}
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Verification Input */}
            <div className="space-y-2">
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
                Enter 6-digit code from your authenticator app:
              </label>
              <input
                type="text"
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-3 py-2 text-center text-lg font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
              />
            </div>

            <div className="flex justify-between space-x-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('setup')}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={verifyAndEnable}
                disabled={!verificationCode || verificationCode.length !== 6 || loading}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Verify & Enable</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {currentStep === 'backup' && setupData && (
          <div className="space-y-6">
            <div className="text-center">
              <KeyIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Save Backup Codes</h3>
              <p className="text-gray-600 mt-1">
                Store these backup codes in a safe place. Each code can only be used once.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Important:</strong> Save these codes now. You won't be able to see them again.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {setupData.backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
                  >
                    <code className="text-sm font-mono">{code}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(code)}
                      className="ml-2"
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  <span>Copy All Codes</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={completeSetup}
              className="w-full flex items-center justify-center space-x-2"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>I've Saved My Backup Codes</span>
            </Button>
          </div>
        )}

        {/* Step 4: Complete */}
        {currentStep === 'complete' && (
          <div className="text-center space-y-4">
            <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">2FA Setup Complete!</h3>
              <p className="text-gray-600 mt-2">
                Two-factor authentication has been successfully enabled for <strong>{user.firstName} {user.lastName}</strong>.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                The user will now be required to enter a 6-digit code from their authenticator app when logging in.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}