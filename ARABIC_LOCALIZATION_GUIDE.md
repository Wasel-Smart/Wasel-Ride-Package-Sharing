# Jordanian Arabic Localization - Developer Guide

## Quick Reference

### Common Jordanian Expressions

#### Greetings & Basics
| English | Jordanian Arabic | Pronunciation |
|---------|-----------------|---------------|
| Hello | مرحبا / أهلا | Marhaba / Ahla |
| Welcome | أهلا وسهلا | Ahla wa sahla |
| Thank you | مشكور / يسلمو | Mashkoor / Yeslamo |
| Please | لو سمحت | Law samaht |
| Yes | آه / أيوة | Ah / Aywa |
| No | لأ | La' |
| Okay | ماشي / تمام | Mashi / Tamam |
| Let's go | يلّا | Yalla |
| Now | هسّا | Hassa |

#### Questions
| English | Jordanian Arabic |
|---------|-----------------|
| Where? | وين؟ |
| Where from? | من وين؟ |
| Where to? | لوين؟ |
| When? | إيمتى؟ |
| Why? | ليش؟ |
| How? | كيف؟ |
| How much? | قديش؟ |
| What? | شو؟ |

#### Actions (Verbs)
| English | Jordanian Arabic | Usage |
|---------|-----------------|-------|
| Search | دوّر | دوّر على رحلة |
| Look | شوف | شوف الخريطة |
| Book | احجز | احجز هسّا |
| Send | ابعث | ابعث طرد |
| Go | روح | روح على |
| Come | تعال | تعال هون |
| Want | بدك | بدك تسافر؟ |
| Have | عندك | عندك حساب؟ |

#### Common Nouns
| English | Jordanian Arabic |
|---------|-----------------|
| Thing | إشي |
| Seat | كرسي |
| Seats | كراسي |
| Bags/Luggage | شنط |
| Package | طرد |
| Car | سيارة |
| Driver | سواق |
| Passenger | راكب |
| Trip | رحلة |
| Road | طريق |

#### Time Expressions
| English | Jordanian Arabic |
|---------|-----------------|
| Now | هسّا |
| Today | اليوم |
| Tomorrow | بكرا |
| Yesterday | مبارح |
| Later | بعدين |
| Soon | قريب |
| Always | دايمًا |

## Translation Guidelines

### 1. Use Conversational Forms
❌ **Don't**: تريد أن تسافر؟ (Formal)
✅ **Do**: بدك تسافر؟ (Conversational)

❌ **Don't**: ابحث عن رحلة (Formal)
✅ **Do**: دوّر على رحلة (Conversational)

### 2. Keep It Natural
❌ **Don't**: موقع الاستلام (Technical)
✅ **Do**: من وين بدك تطلع؟ (Natural)

❌ **Don't**: موقع التوصيل (Technical)
✅ **Do**: لوين رايح؟ (Natural)

### 3. Use Familiar Pronouns
- بدك (you want) instead of تريد
- عندك (you have) instead of لديك
- معك (with you) instead of معك (same but different usage)

### 4. Prefer Short Forms
❌ **Don't**: في الوقت الحالي
✅ **Do**: هسّا

❌ **Don't**: في يوم غد
✅ **Do**: بكرا

### 5. Question Formation
Always use natural question words:
- وين؟ (where)
- ليش؟ (why)
- كيف؟ (how)
- إيمتى؟ (when)
- قديش؟ (how much)

## Code Examples

### Using Translations in Components

```typescript
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t, language } = useLanguage();
  
  return (
    <div>
      <h1>{t('landing.hero.title')}</h1>
      {/* Displays: "تطبيقك الشامل للتنقل" in Arabic */}
      
      <button>{t('common.bookNow')}</button>
      {/* Displays: "احجز هسّا" in Arabic */}
    </div>
  );
}
```

### Adding New Translations

```typescript
// In src/locales/translations.ts

export const translations = {
  en: {
    myFeature: {
      title: 'My Feature',
      action: 'Click here',
    }
  },
  ar: {
    myFeature: {
      title: 'ميزتي',
      action: 'اضغط هون',  // Natural: "Click here"
    }
  }
};
```

### Dynamic Content

```typescript
// For dynamic content with variables
const { t } = useLanguage();

// English: "5 seats available"
// Arabic: "5 كراسي فاضية"
const message = language === 'ar' 
  ? `${count} كراسي فاضية`
  : `${count} seats available`;
```

## Common Patterns

### Buttons & Actions
```typescript
{
  bookNow: 'احجز هسّا',        // Book now
  search: 'دوّر',              // Search
  send: 'ابعث',                // Send
  save: 'احفظ',                // Save
  cancel: 'إلغي',              // Cancel
  confirm: 'أكّد',             // Confirm
  continue: 'كمّل',            // Continue
  back: 'رجّع',                // Back
}
```

### Status Messages
```typescript
{
  loading: 'عم يحمّل...',       // Loading...
  success: 'تمام!',            // Success!
  error: 'في غلط',             // Error
  pending: 'بالانتظار',        // Pending
  completed: 'خلص',            // Completed
  cancelled: 'ملغي',           // Cancelled
}
```

### Forms
```typescript
{
  from: 'من وين؟',             // From where?
  to: 'لوين؟',                 // To where?
  when: 'إيمتى؟',              // When?
  howMany: 'كم واحد؟',         // How many?
  name: 'الاسم',               // Name
  phone: 'التلفون',            // Phone
  email: 'الإيميل',            // Email
}
```

## Testing Checklist

### Visual Testing
- [ ] Text displays correctly in RTL
- [ ] No text overflow
- [ ] Proper alignment
- [ ] Icons mirror correctly
- [ ] Numbers display properly

### Content Testing
- [ ] Translations sound natural
- [ ] Consistent terminology
- [ ] Appropriate formality level
- [ ] No grammatical errors
- [ ] Context-appropriate

### Functional Testing
- [ ] Language switch works
- [ ] Translations load correctly
- [ ] Dynamic content translates
- [ ] Forms validate properly
- [ ] Error messages display

## Common Mistakes to Avoid

### ❌ Don't Mix Dialects
```typescript
// Wrong: Mixing formal and colloquial
title: 'ابحث عن رحلة',  // Formal
button: 'احجز هسّا',     // Colloquial

// Right: Consistent colloquial
title: 'دوّر على رحلة',  // Colloquial
button: 'احجز هسّا',     // Colloquial
```

### ❌ Don't Use Overly Formal Language
```typescript
// Wrong: Too formal
message: 'يرجى الانتظار قليلاً'

// Right: Natural
message: 'استنى شوي'
```

### ❌ Don't Translate Word-by-Word
```typescript
// Wrong: Literal translation
'Available seats' → 'المقاعد المتاحة'

// Right: Natural expression
'Available seats' → 'كراسي فاضية'
```

## Resources

### Translation Keys Structure
```
translations
├── common (buttons, actions, status)
├── auth (login, signup, verification)
├── landing (hero, features, services)
├── dashboard (overview, stats, actions)
├── services (all 13 services)
├── trips (bookings, history, details)
├── messages (chat, notifications)
├── payments (wallet, transactions)
├── settings (preferences, security)
├── profile (user info, achievements)
└── support (help, legal, contact)
```

### Key Files
- `src/locales/translations.ts` - Main translation dictionary
- `src/contexts/LanguageContext.tsx` - Language context provider
- `src/features/*/content.ts` - Feature-specific content

## Support

For questions about Arabic localization:
1. Check this guide first
2. Review existing translations in `translations.ts`
3. Test with native Jordanian speakers
4. Maintain consistency with existing patterns

---

**Remember**: The goal is to make the app feel like it was built by Jordanians, for Jordanians. Use natural, everyday language that people actually speak! 🇯🇴
