// Apply this fix to auth.ts signUp function around line 150-163

// BEFORE (lines ~150-163):
/*
    const redirectTo = getAuthCallbackUrl(
      typeof window !== 'undefined' ? window.location.origin : undefined,
      returnTo ? { returnTo } : undefined,
    );

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        captchaToken,
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
        },
      },
    });
*/

// AFTER (replacement):
/*
    const redirectTo = getAuthCallbackUrl(
      typeof window !== 'undefined' ? window.location.origin : undefined,
      returnTo ? { returnTo } : undefined,
    );

    const normalizedPhone = phone?.trim();

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        captchaToken,
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        },
      },
    });
*/
