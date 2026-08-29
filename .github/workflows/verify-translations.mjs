import { translations } from '../src/locales/translations.js';

const en = translations.en;
const ar = translations.ar;

let missingKeys = 0;

function compareKeys(obj1, obj2, path = '', lang1 = 'en', lang2 = 'ar') {
    for (const key in obj1) {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof obj1[key] === 'object' && obj1[key] !== null && !Array.isArray(obj1[key])) {
            if (typeof obj2[key] !== 'object' || obj2[key] === null) {
                console.error(`❌ Mismatch: Key '${currentPath}' is an object in ${lang1} but not in ${lang2}.`);
                missingKeys++;
            } else {
                compareKeys(obj1[key], obj2[key], currentPath, lang1, lang2);
            }
        } else if (obj2[key] === undefined) {
            console.error(`❌ Missing ${lang2} key for: '${currentPath}'`);
            missingKeys++;
        }
    }
}

console.log('🔎 Comparing English and Arabic translation keys...');
compareKeys(en, ar, 'en', 'ar');
console.log('\n🔎 Comparing Arabic and English translation keys (for extra keys)...');
compareKeys(ar, en, 'ar', 'en');

if (missingKeys > 0) {
    console.error(`\n🔥 Found ${missingKeys} translation key mismatches. Please fix them.`);
    process.exit(1);
} else {
    console.log('\n✅ All translation keys match. Great work!');
    process.exit(0);
}