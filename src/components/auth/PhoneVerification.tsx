import { useState } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/utils/supabase/client';

interface PhoneVerificationProps { onVerified: () => void; onSkip?: () => void; }

function normalizeJordanMobile(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00962')) digits = digits.slice(2);
  if (digits.startsWith('962')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^7\d{8}$/.test(digits) ? `+962${digits}` : null;
}

async function submitVerification(route: 'send-code' | 'verify-code', payload: Record<string,string>) {
  if (!supabase || !supabaseUrl || !supabaseAnonKey) throw new Error('Authentication service is unavailable.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sign in again before verifying your phone.');
  const response = await fetch(`${supabaseUrl}/functions/v1/sms-verification/${route}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Phone verification failed.');
}

export function PhoneVerification({ onVerified, onSkip }: PhoneVerificationProps) {
  const [step, setStep] = useState<'input'|'verify'>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sendCode = async (e?: React.FormEvent|React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault(); setError(''); setSuccess('');
    const phone = normalizeJordanMobile(phoneNumber);
    if (!phone) { setError('Enter a valid Jordanian mobile number, for example 79 000 0000.'); return; }
    setLoading(true);
    try { await submitVerification('send-code', { phone_number: phone }); setNormalizedPhone(phone); setStep('verify'); setSuccess('Verification code sent.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not send code.'); }
    finally { setLoading(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit verification code.'); return; }
    setLoading(true);
    try { await submitVerification('verify-code', { phone_number: normalizedPhone, code }); await supabase?.auth.refreshSession(); setCode(''); setSuccess('Phone verified successfully.'); onVerified(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Verification failed.'); }
    finally { setLoading(false); }
  };

  return <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
    <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Verify Your Phone Number</h2>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Phone verification is required for booking rides and sending packages in Jordan.</p>
    {step === 'input' ? <form onSubmit={sendCode} className="space-y-4">
      <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number</label>
      <div className="flex"><span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">+962</span>
        <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} onChange={e=>setPhoneNumber(e.target.value.replace(/[^0-9]/g,'').slice(0,12))} placeholder="79 000 0000" required disabled={loading} className="flex-1 min-w-0 px-3 py-2 rounded-r-md border border-gray-300 dark:bg-gray-700 dark:text-white"/>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{success && <p role="status" className="text-sm text-green-600">{success}</p>}
      <div className="flex gap-3"><button type="submit" disabled={loading||!phoneNumber.trim()} className="flex-1 bg-primary text-white py-2 px-4 rounded-md disabled:opacity-50">{loading?'Sending...':'Send Code'}</button>{onSkip && <button type="button" onClick={onSkip} disabled={loading}>Skip</button>}</div>
    </form> : <form onSubmit={verifyCode} className="space-y-4">
      <label htmlFor="code" className="block text-sm font-medium mb-2">Verification Code</label>
      <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" required pattern="[0-9]{6}" maxLength={6} disabled={loading} className="w-full px-3 py-2 border rounded-md text-center text-2xl tracking-widest dark:bg-gray-700 dark:text-white"/>
      <p className="text-xs text-gray-500">Code sent to {normalizedPhone}.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{success && <p role="status" className="text-sm text-green-600">{success}</p>}
      <div className="flex gap-3"><button type="submit" disabled={loading||code.length!==6} className="flex-1 bg-primary text-white py-2 px-4 rounded-md disabled:opacity-50">{loading?'Verifying...':'Verify'}</button><button type="button" disabled={loading} onClick={()=>{setStep('input');setCode('');setError('');setSuccess('');}}>Change Number</button></div>
      <button type="button" onClick={sendCode} disabled={loading} className="w-full text-sm text-primary">Resend Code</button>
    </form>}
  </div>;
}
