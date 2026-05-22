import { supabase } from '../lib/supabase';
import { sanitizeLogMessage, sanitizePhoneNumber, sanitizeEmail } from '../utils/sanitization';

/**
 * ✅ Gap 2 fixed: phone_verified and email_verified are now present.
 */
export interface UserProfile {
  id: string;
  email: string;
  phone_number: string | null;
  full_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  national_id: string | null;
  driver_license: string | null;
  is_driver: boolean;
  is_verified: boolean;
  /** Whether the phone number has been OTP-verified */
  phone_verified: boolean;
  /** Whether the email address has been confirmed */
  email_verified: boolean;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  trust_score: number;
  total_rides_as_passenger: number;
  total_rides_as_driver: number;
  rating_as_passenger: number | null;
  rating_as_driver: number | null;
  push_token: string | null;
  push_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  whatsapp_notifications: boolean;
  preferred_language: 'en' | 'ar';
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  avatar_url?: string;
  preferred_language?: 'en' | 'ar';
  email_notifications?: boolean;
  sms_notifications?: boolean;
  whatsapp_notifications?: boolean;
}

export interface DriverVerificationData {
  national_id: string;
  driver_license: string;
  vehicle_registration?: string;
  vehicle_insurance?: string;
}

export async function getUserProfile(): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', sanitizeLogMessage(error.message));
      return { data: null, error: error.message };
    }

    if (data && user.email && data.email !== user.email) {
      await supabase.from('profiles').update({ email: user.email }).eq('id', user.id);
      data.email = user.email;
    }

    return { data, error: null };
  } catch (error) {
    console.error('getUserProfile error:', sanitizeLogMessage(error));
    return { data: null, error: 'Failed to fetch profile' };
  }
}

export async function updateUserProfile(
  updates: UpdateProfileData
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    if (updates.phone_number) {
      const phoneRegex = /^(\+962|962|0)?7[789]\d{7}$/;
      if (!phoneRegex.test(updates.phone_number.replace(/\s/g, '')))
        return { success: false, error: 'Invalid Jordanian phone number format' };

      let normalized = updates.phone_number.replace(/\s/g, '');
      if (normalized.startsWith('0')) normalized = '+962' + normalized.slice(1);
      else if (normalized.startsWith('962')) normalized = '+' + normalized;
      else if (!normalized.startsWith('+')) normalized = '+962' + normalized;
      updates.phone_number = normalized;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update profile:', sanitizeLogMessage(error.message));
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (error) {
    console.error('updateUserProfile error:', sanitizeLogMessage(error));
    return { success: false, error: 'Failed to update profile' };
  }
}

export async function updatePhoneNumber(
  phoneNumber: string
): Promise<{ success: boolean; error: string | null; verificationRequired?: boolean }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const phoneRegex = /^(\+962|962|0)?7[789]\d{7}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, '')))
      return { success: false, error: 'Invalid Jordanian phone number format. Use format: 07XXXXXXXX' };

    let normalized = phoneNumber.replace(/\s/g, '');
    if (normalized.startsWith('0')) normalized = '+962' + normalized.slice(1);
    else if (normalized.startsWith('962')) normalized = '+' + normalized;
    else if (!normalized.startsWith('+')) normalized = '+962' + normalized;

    const { data: existing } = await supabase
      .from('profiles').select('id').eq('phone_number', normalized).neq('id', user.id).single();
    if (existing) return { success: false, error: 'This phone number is already registered' };

    const { error } = await supabase
      .from('profiles')
      .update({ phone_number: normalized, phone_verified: false, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update phone:', sanitizeLogMessage(error.message));
      return { success: false, error: error.message };
    }
    console.log('Phone number updated:', sanitizePhoneNumber(normalized));
    return { success: true, error: null, verificationRequired: true };
  } catch (error) {
    console.error('updatePhoneNumber error:', sanitizeLogMessage(error));
    return { success: false, error: 'Failed to update phone number' };
  }
}

export async function updateEmail(
  newEmail: string
): Promise<{ success: boolean; error: string | null; verificationRequired?: boolean }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) return { success: false, error: 'Invalid email format' };

    const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
    if (updateError) {
      console.error('Failed to update email:', sanitizeLogMessage(updateError.message));
      return { success: false, error: updateError.message };
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email: newEmail, email_verified: false, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError)
      console.error('Failed to update profile email:', sanitizeLogMessage(profileError.message));

    console.log('Email update initiated:', sanitizeEmail(newEmail));
    return { success: true, error: null, verificationRequired: true };
  } catch (error) {
    console.error('updateEmail error:', sanitizeLogMessage(error));
    return { success: false, error: 'Failed to update email' };
  }
}

export async function submitDriverVerification(
  data: DriverVerificationData
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update({
        national_id: data.national_id,
        driver_license: data.driver_license,
        is_driver: true,
        verification_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to submit verification:', sanitizeLogMessage(error.message));
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (error) {
    console.error('submitDriverVerification error:', sanitizeLogMessage(error));
    return { success: false, error: 'Failed to submit verification' };
  }
}

export async function uploadAvatar(
  uri: string,
  fileType: string = 'image/jpeg'
): Promise<{ success: boolean; url: string | null; error: string | null }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, url: null, error: 'Not authenticated' };

    const response = await fetch(uri);
    const blob = await response.blob();
    const fileExt = fileType.split('/')[1] || 'jpg';
    const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles').upload(filePath, blob, { contentType: fileType, upsert: true });

    if (uploadError) {
      console.error('Failed to upload avatar:', sanitizeLogMessage(uploadError.message));
      return { success: false, url: null, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError)
      console.error('Failed to update avatar URL:', sanitizeLogMessage(updateError.message));

    return { success: true, url: publicUrl, error: null };
  } catch (error) {
    console.error('uploadAvatar error:', sanitizeLogMessage(error));
    return { success: false, url: null, error: 'Failed to upload avatar' };
  }
}
