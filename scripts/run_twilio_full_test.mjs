import { createClient } from '@supabase/supabase-js';

// Load env vars (already set in process.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

async function requestOtp(phone) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw new Error('OTP request failed: ' + error.message);
  console.log('✅ OTP request accepted for', phone);
}

async function verifyOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw new Error('OTP verify failed: ' + error.message);
  console.log('✅ OTP verified, session token length:', data.session.access_token.length);
}

(async () => {
  try {
    // Use Twilio test number (always works) and known token 123456
    const testPhone = '+15551234567';   // replace with a real phone number you control
    await requestOtp(testPhone);
    await verifyOtp(testPhone, '123456');
    console.log('🎉 Full Twilio OTP flow succeeded');
  } catch (e) {
    console.error('⚠️ Flow error:', e.message);
    process.exit(1);
  }
})();
