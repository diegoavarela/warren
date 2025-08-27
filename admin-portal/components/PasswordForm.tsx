import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { validatePassword, type PasswordStrengthResult } from '@/lib/password-utils';

interface PasswordFormProps {
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function PasswordForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  title = "Set New Password",
  description = "Enter a secure password that meets the requirements below:"
}: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<PasswordStrengthResult | null>(null);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (newPassword) {
      setValidation(validatePassword(newPassword));
    } else {
      setValidation(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation?.isValid) {
      return;
    }
    
    if (password !== confirmPassword) {
      return;
    }

    await onSubmit(password);
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'text-red-600 bg-red-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'strong': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isFormValid = validation?.isValid && password === confirmPassword && password.length > 0;
  const passwordsMatch = confirmPassword === '' || password === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          New Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            {showPassword ? '👁️‍🗨️' : '👁️'}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {validation && (
          <div className="mt-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    validation.strength === 'weak' ? 'bg-red-500 w-1/4' :
                    validation.strength === 'fair' ? 'bg-yellow-500 w-2/4' :
                    validation.strength === 'good' ? 'bg-blue-500 w-3/4' :
                    'bg-green-500 w-full'
                  }`}
                />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${getStrengthColor(validation.strength)}`}>
                {validation.strength.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Password Requirements */}
        {validation && (
          <div className="mt-2 space-y-1">
            {validation.errors.map((error, index) => (
              <p key={index} className="text-xs text-red-600">
                ❌ {error}
              </p>
            ))}
            {validation.suggestions.map((suggestion, index) => (
              <p key={index} className="text-xs text-yellow-600">
                💡 {suggestion}
              </p>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          type={showPassword ? "text" : "password"}
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
            passwordsMatch 
              ? 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              : 'border-red-300 focus:ring-red-500 focus:border-red-500'
          }`}
          placeholder="Confirm new password"
        />
        {!passwordsMatch && (
          <p className="mt-1 text-xs text-red-600">
            ❌ Passwords do not match
          </p>
        )}
      </div>

      {/* Password Policy Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Password Requirements:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• At least 8 characters long</li>
          <li>• Contains uppercase and lowercase letters</li>
          <li>• Contains at least one number</li>
          <li>• Contains at least one special character (!@#$%^&*...)</li>
          <li>• Avoids common words and patterns</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Setting Password...</span>
            </>
          ) : (
            <span>Set Password</span>
          )}
        </Button>
      </div>
    </form>
  );
}