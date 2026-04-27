import { useState } from 'react';
import { API_URL, fetchWithRetry } from '@/services/core';

interface PhoneVerificationProps {
  onVerified: () => void;
  onSkip?: () => void;
}

export function PhoneVerification({ onVerified, onSkip }: PhoneVerificationProps) {
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('962')) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '+962' + cleaned.slice(1);
    }
    return '+962' + cleaned;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formatted = formatPhoneNumber(phoneNumber);
      
      const response = await fetchWithRetry(`${API_URL}/sms-verification/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: formatted }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send verification code');
      }

      setSuccess('Verification code sent to your phone');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formatted = formatPhoneNumber(phoneNumber);
      
      const response = await fetchWithRetry(`${API_URL}/sms-verification/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: formatted, code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid verification code');
      }

      setSuccess('Phone verified successfully!');
      setTimeout(() => onVerified(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Verify Your Phone Number
      </h2>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Phone verification is required for booking rides and sending packages in Jordan.
      </p>

      {step === 'input' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                +962
              </span>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="79 000 0000"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
                pattern="[0-9]{9,10}"
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter your Jordanian mobile number
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
            
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Skip
              </button>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center text-2xl tracking-widest"
              required
              pattern="[0-9]{6}"
              maxLength={6}
              disabled={loading}
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the 6-digit code sent to +962{phoneNumber}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setStep('input');
                setCode('');
                setError('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Change Number
            </button>
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading}
            className="w-full text-sm text-primary hover:text-primary-dark disabled:opacity-50"
          >
            Resend Code
          </button>
        </form>
      )}
    </div>
  );
}
