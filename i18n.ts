import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { translations } from './src/locales/translations';

i18n
    .use(LanguageDetector) // Detects user language
    .use(initReactI18next) // Passes i18n down to react-i18next
    .init({
        supportedLngs: ['en', 'ar'],
        fallbackLng: 'ar', // Default to Arabic
        defaultNS: 'common',
        resources: translations, // Use in-memory translations
        detection: {
            // Read language from URL path first (e.g., /ar/...)
            order: ['path', 'localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;