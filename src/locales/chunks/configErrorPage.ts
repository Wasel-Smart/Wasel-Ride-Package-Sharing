export const configErrorPage = {
  en: {
      configuration_error: 'Configuration Error',
      environment_configuration_errors: 'Environment configuration errors',
      variable: 'Variable:',
      warnings: 'Warnings:',
      please_contact_support_or_check_your_environment_variables:
        'Please contact support or check your environment variables.',
      for_vercel_deployments: 'For Vercel deployments:',
      go_to_your_vercel_project_dashboard: 'Go to your Vercel project dashboard',
      navigate_to_settings_environment_variables: 'Navigate to Settings → Environment Variables',
      add_the_missing_variables_listed_above: 'Add the missing variables listed above',
      redeploy_your_application: 'Redeploy your application',
    },
  },
  ar: {
      configuration_error: 'خطأ في الإعداد',
      environment_configuration_errors: 'أخطاء إعداد البيئة',
      variable: 'المتغيّر:',
      warnings: 'تحذيرات:',
      please_contact_support_or_check_your_environment_variables:
        'يرجى التواصل مع الدعم أو التحقّق من متغيّرات البيئة.',
      for_vercel_deployments: 'لنشر على Vercel:',
      go_to_your_vercel_project_dashboard: 'اذهب إلى لوحة مشروعك على Vercel',
      navigate_to_settings_environment_variables: 'انتقل إلى الإعدادات ← متغيّرات البيئة',
      add_the_missing_variables_listed_above: 'أضف المتغيّرات الناقصة المذكورة أعلاه',
      redeploy_your_application: 'أعد نشر تطبيقك',
    },
  }
} as const;

