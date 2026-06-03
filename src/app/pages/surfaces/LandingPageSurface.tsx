import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Facebook,
  Globe2,
  Instagram,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import {
  ENTRY_CITY_OPTIONS,
  ENTRY_DEFAULT_ROUTE_DRAFT,
  buildRideSearchPath,
  getAlternateEntryCity,
  type EntryRouteDraft,
} from '../../../contracts/entry';
import { APP_ROUTES } from '../../../router/paths';
import { isSupabaseConfigured, supabase } from '../../../utils/supabase/client';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  WHATSAPP_NUMBER,
  benefits,
  faqs,
  howItWorksSteps,
  navItems,
  popularRoutes,
  routeLabels,
  safetyCards,
  siteCopy,
  socialLinks,
  testimonials,
  type PublicLanguage,
  type PublicPageKey,
} from './landingPageContent';
import '../LandingPage.css';

type IntakeTable = 'mvp_ride_searches' | 'mvp_ride_offers' | 'mvp_contact_messages';
type SubmitState = 'idle' | 'saving' | 'saved' | 'error';
type UserType = 'passenger' | 'driver';

type DbInsertClient = {
  from: (table: IntakeTable) => {
    insert: (payload: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
  };
};

const stepIcons = [MapPin, Search, ShieldCheck, Star] as const;
const socialIcons = { Facebook, Instagram } as const;

function getPageKey(pathname: string): PublicPageKey {
  const match = Object.entries(routeLabels).find(([, path]) => path === pathname);
  return (match?.[0] as PublicPageKey | undefined) ?? 'home';
}

async function insertMvpRecord(table: IntakeTable, payload: Record<string, unknown>) {
  if (!isSupabaseConfigured || !supabase) {
    const key = `wasel:${table}`;
    const current = JSON.parse(window.localStorage.getItem(key) ?? '[]') as Record<string, unknown>[];
    const nextRecord = { ...payload, offlineSavedAt: new Date().toISOString() };

    window.localStorage.setItem(key, JSON.stringify([nextRecord, ...current].slice(0, 25)));
    return { offline: true };
  }

  const client = supabase as unknown as DbInsertClient;
  const { error } = await client.from(table).insert(payload);

  if (error) {
    throw new Error(error.message ?? 'Unable to save request');
  }

  return { offline: false };
}

function BrandMark() {
  return (
    <span className="public-site__brand-mark" aria-hidden="true">
      <img src="/brand/wasel-mark-clean.svg" alt="" loading="eager" />
    </span>
  );
}

function Section({ children, id, kicker, title }: { children: ReactNode; id: string; kicker: string; title: string }) {
  return (
    <section className="public-site__section public-site__reveal" id={id}>
      <div className="public-site__section-head">
        <span className="public-site__eyebrow">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PublicHeader({ language, onLanguageChange }: { language: PublicLanguage; onLanguageChange: () => void }) {
  const location = useLocation();
  const activePage = getPageKey(location.pathname);
  const labels = siteCopy[language];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="public-site__header">
      <Link className="public-site__brand" to="/" onClick={() => setMenuOpen(false)}>
        <BrandMark />
        <span>
          <strong>Wasel14</strong>
          <small>{labels.brandSubtitle}</small>
        </span>
      </Link>

      <button
        aria-expanded={menuOpen}
        aria-label="Open menu"
        className="public-site__menu-button"
        onClick={() => setMenuOpen(open => !open)}
        type="button"
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <nav className={menuOpen ? 'public-site__nav is-open' : 'public-site__nav'} aria-label="Primary navigation">
        {navItems.map(item => (
          <Link
            className={activePage === item.key ? 'is-active' : undefined}
            key={item.key}
            onClick={() => setMenuOpen(false)}
            to={routeLabels[item.key]}
          >
            {item.label[language]}
          </Link>
        ))}
      </nav>

      <div className="public-site__header-actions">
        <button className="public-site__language-toggle" onClick={onLanguageChange} type="button">
          <Globe2 size={16} />
          {labels.languageToggle}
        </button>
        <Link className="public-site__ghost-action" to="/login">
          {labels.login}
        </Link>
        <Link className="public-site__solid-action" to="/register">
          {labels.signup}
        </Link>
      </div>
    </header>
  );
}

function CitySelect({
  disabledCity,
  label,
  onChange,
  value,
  language,
}: {
  disabledCity?: string;
  label: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  value: string;
  language: PublicLanguage;
}) {
  return (
    <label>
      {label}
      <select onChange={onChange} value={value}>
        {ENTRY_CITY_OPTIONS.map(option => (
          <option disabled={option.value === disabledCity} key={option.value} value={option.value}>
            {language === 'ar' ? option.ar : option.en}
          </option>
        ))}
      </select>
    </label>
  );
}

function RouteSearchCard({ language }: { language: PublicLanguage }) {
  const labels = siteCopy[language];
  const [route, setRoute] = useState<EntryRouteDraft>({ ...ENTRY_DEFAULT_ROUTE_DRAFT });
  const [status, setStatus] = useState<SubmitState>('idle');

  const updateRoute = (field: keyof EntryRouteDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.target.value;

    setRoute(current => {
      if (field === 'from') {
        return { ...current, from: value, to: value === current.to ? getAlternateEntryCity(value) : current.to };
      }

      if (field === 'to') {
        return { ...current, from: value === current.from ? getAlternateEntryCity(value) : current.from, to: value };
      }

      return { ...current, [field]: value };
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');

    try {
      await insertMvpRecord('mvp_ride_searches', {
        destination: route.to,
        locale: language,
        origin: route.from,
        ride_date: route.date || null,
        source: 'public_homepage',
      });
      setStatus('saved');
      window.setTimeout(() => {
        window.location.href = buildRideSearchPath(route);
      }, 350);
    } catch {
      setStatus('error');
    }
  };

  return (
    <form className="public-site__search-card" onSubmit={submit}>
      <div className="public-site__card-head">
        <span>
          <Search size={18} />
          {labels.searchTitle}
        </span>
        <small>{labels.saveHint}</small>
      </div>

      <div className="public-site__form-grid">
        <CitySelect disabledCity={route.to} label={labels.from} language={language} onChange={updateRoute('from')} value={route.from} />
        <CitySelect disabledCity={route.from} label={labels.to} language={language} onChange={updateRoute('to')} value={route.to} />
        <label>
          {labels.date}
          <input onChange={updateRoute('date')} type="date" value={route.date} />
        </label>
      </div>

      <div className="public-site__search-actions">
        <button className="public-site__solid-action public-site__solid-action--wide" disabled={status === 'saving'} type="submit">
          {status === 'saving' ? labels.saving : labels.findRide}
          <ArrowRight size={18} />
        </button>
        <Link className="public-site__ghost-action public-site__ghost-action--wide" to="/for-drivers#offer-form">
          {labels.offerRide}
        </Link>
      </div>

      <FormStatus error={labels.error} status={status} success={labels.savedSearch} />
    </form>
  );
}

function FormStatus({ error, status, success }: { error: string; status: SubmitState; success: string }) {
  if (status === 'saved') {
    return <p aria-live="polite" className="public-site__form-success">{success}</p>;
  }

  if (status === 'error') {
    return <p aria-live="assertive" className="public-site__form-error">{error}</p>;
  }

  return null;
}

function HeroSection({ language }: { language: PublicLanguage }) {
  const labels = siteCopy[language];

  return (
    <section className="public-site__hero" id="home">
      <div className="public-site__hero-copy public-site__reveal">
        <span className="public-site__eyebrow">
          <Sparkles size={16} />
          {labels.heroEyebrow}
        </span>
        <h1>{labels.heroTitle}</h1>
        <p>{labels.heroSubtitle}</p>
        <strong className="public-site__arabic-promise">{labels.heroSecondary}</strong>

        <div className="public-site__trust-pills">
          {labels.trustPills.map(pill => (
            <span key={pill}>
              <ShieldCheck size={16} />
              {pill}
            </span>
          ))}
        </div>

        <div className="public-site__hero-actions">
          <Link className="public-site__solid-action" to="/register">
            {labels.signup}
            <ArrowRight size={18} />
          </Link>
          <a className="public-site__ghost-action" href={`https://wa.me/${WHATSAPP_NUMBER}`}>
            {labels.whatsapp}
          </a>
        </div>
      </div>

      <div className="public-site__hero-panel public-site__reveal public-site__reveal--late">
        <div className="public-site__hero-photo" role="img" aria-label="Happy passengers and drivers on Jordan roads">
          <div className="public-site__photo-card public-site__photo-card--top">
            <UserCheck size={18} />
            {labels.routeBadgeOne}
          </div>
          <div className="public-site__photo-card public-site__photo-card--bottom">
            <WalletCards size={18} />
            {labels.routeBadgeTwo}
          </div>
        </div>
        <RouteSearchCard language={language} />
      </div>

      <div className="public-site__stats" aria-label="Wasel launch statistics">
        {labels.stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks({ language }: { language: PublicLanguage }) {
  return (
    <Section
      id="how-it-works"
      kicker={language === 'ar' ? 'كيف يعمل' : 'How it works'}
      title={language === 'ar' ? 'رحلة واضحة من البحث إلى الوصول.' : 'A clear journey from search to arrival.'}
    >
      <div className="public-site__step-grid">
        {howItWorksSteps[language].map(([title, text], index) => {
          const Icon = stepIcons[index];

          return (
            <article className="public-site__feature-card" key={title}>
              <span className="public-site__icon-badge">
                <Icon size={22} />
              </span>
              <strong>{index + 1}. {title}</strong>
              <p>{text}</p>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

function Benefits({ audience, language }: { audience: 'drivers' | 'passengers'; language: PublicLanguage }) {
  const config = benefits[audience][language];

  return (
    <Section id={audience === 'drivers' ? 'for-drivers' : 'for-passengers'} kicker={config.kicker} title={config.title}>
      <div className="public-site__feature-grid">
        {config.items.map(([title, text]) => (
          <article className="public-site__feature-card" key={title}>
            <CheckCircle2 size={24} />
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
      {audience === 'drivers' ? <OfferRideForm language={language} /> : null}
    </Section>
  );
}

function OfferRideForm({ language }: { language: PublicLanguage }) {
  const labels = siteCopy[language];
  const [status, setStatus] = useState<SubmitState>('idle');
  const [form, setForm] = useState({ date: '', from: 'Amman', name: '', phone: '', seats: '2', to: 'Irbid' });

  const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');

    try {
      await insertMvpRecord('mvp_ride_offers', {
        destination: form.to,
        driver_name: form.name,
        locale: language,
        origin: form.from,
        phone: form.phone,
        ride_date: form.date || null,
        seats: Number(form.seats),
        source: 'public_driver_page',
      });
      setStatus('saved');
      setForm(current => ({ ...current, name: '', phone: '' }));
    } catch {
      setStatus('error');
    }
  };

  return (
    <form className="public-site__inline-form" id="offer-form" onSubmit={submit}>
      <h3>{language === 'ar' ? 'نموذج عرض رحلة سريع' : 'Quick Offer a Ride form'}</h3>
      <div className="public-site__form-grid">
        <label>
          {labels.name}
          <input maxLength={120} onChange={update('name')} required value={form.name} />
        </label>
        <label>
          {labels.phone}
          <input maxLength={32} onChange={update('phone')} required value={form.phone} />
        </label>
        <CitySelect label={labels.from} language={language} onChange={update('from')} value={form.from} />
        <CitySelect label={labels.to} language={language} onChange={update('to')} value={form.to} />
        <label>
          {labels.date}
          <input onChange={update('date')} type="date" value={form.date} />
        </label>
        <label>
          {labels.seats}
          <input max="6" min="1" onChange={update('seats')} type="number" value={form.seats} />
        </label>
      </div>
      <button className="public-site__solid-action public-site__solid-action--wide" disabled={status === 'saving'} type="submit">
        {status === 'saving' ? labels.saving : labels.offerRide}
      </button>
      <FormStatus error={labels.error} status={status} success={labels.savedOffer} />
    </form>
  );
}

function RoutesSection({ language }: { language: PublicLanguage }) {
  return (
    <Section
      id="cities"
      kicker={language === 'ar' ? 'المدن والمسارات' : 'Cities and routes'}
      title={language === 'ar' ? 'مسارات شائعة جاهزة للإطلاق.' : 'Popular launch routes across Jordan.'}
    >
      <div className="public-site__routes-layout">
        <div className="public-site__route-grid">
          {popularRoutes.map(route => (
            <article className="public-site__route-card" key={route.en}>
              <MapPin size={20} />
              <strong>{language === 'ar' ? route.ar : route.en}</strong>
              <span>{route.time}</span>
              <p>{route.demand[language]}</p>
            </article>
          ))}
        </div>
        <div className="public-site__map-preview" aria-label="Jordan route map preview" role="img">
          <span>Amman</span>
          <span>Zarqa</span>
          <span>Irbid</span>
          <span>Airport</span>
          <i />
          <b />
        </div>
      </div>
    </Section>
  );
}

function SafetyTrust({ language }: { language: PublicLanguage }) {
  return (
    <Section
      id="safety"
      kicker={language === 'ar' ? 'السلامة والثقة' : 'Safety and trust'}
      title={language === 'ar' ? 'إشارات ثقة واضحة قبل كل رحلة.' : 'Clear trust signals before every ride.'}
    >
      <div className="public-site__feature-grid">
        {safetyCards[language].map(([title, text]) => (
          <article className="public-site__feature-card" key={title}>
            <ShieldCheck size={24} />
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function Testimonials({ language }: { language: PublicLanguage }) {
  return (
    <Section
      id="testimonials"
      kicker={language === 'ar' ? 'آراء مبكرة' : 'Early testimonials'}
      title={language === 'ar' ? 'نماذج آراء لحين استبدالها بعملاء حقيقيين.' : 'Placeholder stories ready to replace with real customer feedback.'}
    >
      <div className="public-site__testimonial-grid">
        {testimonials[language].map(([name, text]) => (
          <article key={name}>
            <div aria-label="Five star rating">
              {Array.from({ length: 5 }).map((_, index) => <Star fill="currentColor" key={index} size={16} />)}
            </div>
            <p>“{text}”</p>
            <strong>{name}</strong>
          </article>
        ))}
      </div>
    </Section>
  );
}

function DownloadApp({ language }: { language: PublicLanguage }) {
  return (
    <section className="public-site__app-cta public-site__reveal">
      <div>
        <span className="public-site__eyebrow">
          <Clock3 size={16} />
          {siteCopy[language].comingSoon}
        </span>
        <h2>{language === 'ar' ? 'تطبيق iOS و Android قريباً.' : 'iOS and Android apps are coming soon.'}</h2>
        <p>
          {language === 'ar'
            ? 'ابدأ الآن عبر الموقع، وسنطلق التطبيق بعد تثبيت تجربة الويب.'
            : 'Start through the website today while we prepare the mobile app experience.'}
        </p>
      </div>
      <div className="public-site__store-buttons">
        <button type="button">App Store<br /><small>Coming soon</small></button>
        <button type="button">Google Play<br /><small>Coming soon</small></button>
      </div>
    </section>
  );
}

function FAQ({ language }: { language: PublicLanguage }) {
  return (
    <Section id="faq" kicker="FAQ" title={language === 'ar' ? 'أسئلة شائعة' : 'Frequently asked questions'}>
      <div className="public-site__faq-list">
        {faqs[language].map(([question, answer]) => (
          <details key={question}>
            <summary>{question}<ChevronDown size={18} /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function AboutContact({ contactOnly = false, language }: { contactOnly?: boolean; language: PublicLanguage }) {
  return (
    <Section
      id={contactOnly ? 'contact' : 'about'}
      kicker={contactOnly ? (language === 'ar' ? 'تواصل' : 'Contact') : (language === 'ar' ? 'من نحن' : 'About Wasel14')}
      title={contactOnly ? (language === 'ar' ? 'نحن قريبون من رحلتك.' : 'We are close to your trip.') : (language === 'ar' ? 'نبني شبكة مشاركة رحلات موثوقة للأردن.' : 'We are building Jordan’s trusted ride-sharing network.')}
    >
      <div className="public-site__contact-layout">
        <div className="public-site__about-card">
          <p>
            {language === 'ar'
              ? 'واصل14 منصة أردنية لتقليل تكلفة التنقل بين المدن عبر مشاركة المقاعد الفارغة بطريقة آمنة وواضحة.'
              : 'Wasel14 is a Jordan-focused platform reducing intercity travel costs by matching empty seats with verified passengers in a clear, safe flow.'}
          </p>
          <ul>
            <li><Phone size={18} /> {SUPPORT_PHONE_DISPLAY}</li>
            <li><Mail size={18} /> {SUPPORT_EMAIL}</li>
            <li><MessageCircle size={18} /> WhatsApp: {SUPPORT_PHONE_DISPLAY}</li>
          </ul>
        </div>
        <ContactForm language={language} />
      </div>
    </Section>
  );
}

function ContactForm({ language }: { language: PublicLanguage }) {
  const labels = siteCopy[language];
  const [status, setStatus] = useState<SubmitState>('idle');
  const [form, setForm] = useState({ email: '', message: '', name: '' });

  const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');

    try {
      await insertMvpRecord('mvp_contact_messages', {
        ...form,
        locale: language,
        source: 'public_contact_page',
      });
      setStatus('saved');
      setForm({ email: '', message: '', name: '' });
    } catch {
      setStatus('error');
    }
  };

  return (
    <form className="public-site__inline-form" onSubmit={submit}>
      <h3>{language === 'ar' ? 'أرسل رسالة' : 'Send a message'}</h3>
      <label>
        {labels.name}
        <input maxLength={120} onChange={update('name')} required value={form.name} />
      </label>
      <label>
        {labels.email}
        <input maxLength={254} onChange={update('email')} required type="email" value={form.email} />
      </label>
      <label>
        {labels.message}
        <textarea maxLength={2000} onChange={update('message')} required rows={4} value={form.message} />
      </label>
      <button className="public-site__solid-action public-site__solid-action--wide" disabled={status === 'saving'} type="submit">
        {status === 'saving' ? labels.saving : labels.send}
      </button>
      <FormStatus error={labels.error} status={status} success={labels.savedMessage} />
    </form>
  );
}

function AuthPanel({ language, mode }: { language: PublicLanguage; mode: 'login' | 'register' }) {
  const labels = siteCopy[language];
  const [userType, setUserType] = useState<UserType>('passenger');
  const [status, setStatus] = useState<SubmitState>('idle');
  const [form, setForm] = useState({ email: '', name: '', password: '' });

  const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm(current => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('saving');

    try {
      if (!supabase) throw new Error('Supabase is not configured');

      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          options: {
            data: { full_name: form.name, user_type: userType },
            emailRedirectTo: `${window.location.origin}${APP_ROUTES.authCallback.full}`,
          },
          password: form.password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
      }

      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Section
      id="auth"
      kicker={mode === 'register' ? labels.signup : labels.login}
      title={mode === 'register' ? (language === 'ar' ? 'أنشئ حسابك كسائق أو راكب.' : 'Create your Driver or Passenger account.') : (language === 'ar' ? 'ادخل إلى حساب واصل.' : 'Login to your Wasel account.')}
    >
      <form className="public-site__auth-card" onSubmit={submit}>
        <div className="public-site__user-type" role="tablist">
          <button aria-selected={userType === 'passenger'} className={userType === 'passenger' ? 'is-active' : ''} onClick={() => setUserType('passenger')} role="tab" type="button">
            <UsersRound size={18} />
            {labels.passenger}
          </button>
          <button aria-selected={userType === 'driver'} className={userType === 'driver' ? 'is-active' : ''} onClick={() => setUserType('driver')} role="tab" type="button">
            <CarFront size={18} />
            {labels.driver}
          </button>
        </div>

        {mode === 'register' ? (
          <label>
            {labels.fullName}
            <input maxLength={120} onChange={update('name')} required value={form.name} />
          </label>
        ) : null}

        <label>
          {labels.email}
          <input maxLength={254} onChange={update('email')} required type="email" value={form.email} />
        </label>
        <label>
          {labels.password}
          <input minLength={6} onChange={update('password')} required type="password" value={form.password} />
        </label>
        <button className="public-site__solid-action public-site__solid-action--wide" disabled={status === 'saving'} type="submit">
          <LockKeyhole size={18} />
          {status === 'saving' ? labels.saving : mode === 'register' ? labels.signup : labels.login}
        </button>
        <FormStatus
          error={labels.authError}
          status={status}
          success={mode === 'register' ? labels.authSuccessRegister : labels.authSuccessLogin}
        />
      </form>
    </Section>
  );
}

function LegalPage({ language, type }: { language: PublicLanguage; type: 'privacy' | 'terms' }) {
  const isPrivacy = type === 'privacy';

  return (
    <Section
      id={type}
      kicker={isPrivacy ? 'Privacy' : 'Terms'}
      title={isPrivacy ? (language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy') : (language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions')}
    >
      <article className="public-site__legal-card">
        <p>
          {language === 'ar'
            ? 'هذه نسخة أولية جاهزة للإطلاق توضح كيفية التعامل مع بيانات الحساب والرحلات والتواصل. يجب مراجعتها قانونياً قبل التوسع التجاري الكامل.'
            : 'This launch-ready draft explains how account, ride, and contact data are handled. It should be reviewed legally before full commercial scale.'}
        </p>
        <h3>{isPrivacy ? (language === 'ar' ? 'البيانات التي نجمعها' : 'Data we collect') : (language === 'ar' ? 'استخدام الخدمة' : 'Service use')}</h3>
        <p>
          {isPrivacy
            ? language === 'ar'
              ? 'نجمع بيانات التسجيل والبحث وعروض الرحلات ورسائل التواصل لتشغيل الخدمة وتحسين الأمان.'
              : 'We collect registration, ride search, ride offer, and contact information to operate the service and improve safety.'
            : language === 'ar'
              ? 'يجب استخدام واصل بطريقة قانونية وآمنة واحترام السائقين والركاب.'
              : 'Use Wasel legally and safely while respecting drivers, passengers, and support teams.'}
        </p>
        <h3>{language === 'ar' ? 'التواصل' : 'Contact'}</h3>
        <p>{SUPPORT_EMAIL} · {SUPPORT_PHONE_DISPLAY}</p>
      </article>
    </Section>
  );
}

function PublicFooter({ language }: { language: PublicLanguage }) {
  const labels = siteCopy[language];

  return (
    <footer className="public-site__footer">
      <div>
        <Link className="public-site__brand" to="/">
          <BrandMark />
          <span>
            <strong>Wasel14</strong>
            <small>wasel14.online</small>
          </span>
        </Link>
        <p>{labels.footerLine}</p>
      </div>
      <div className="public-site__footer-links">
        {navItems.map(item => <Link key={item.key} to={routeLabels[item.key]}>{item.label[language]}</Link>)}
        <Link to="/privacy-policy">Privacy</Link>
        <Link to="/terms-and-conditions">Terms</Link>
      </div>
      <div className="public-site__socials">
        {socialLinks.map(item => {
          const Icon = item.label in socialIcons ? socialIcons[item.label as keyof typeof socialIcons] : null;
          return (
            <a aria-label={item.label} href={item.href} key={item.label} rel="noreferrer" target="_blank">
              {Icon ? <Icon size={18} /> : item.label}
            </a>
          );
        })}
      </div>
      <small>{labels.copyright}</small>
    </footer>
  );
}

export function LandingPage() {
  const location = useLocation();
  const page = getPageKey(location.pathname);
  const [language, setLanguage] = useState<PublicLanguage>('en');
  const visible = useMemo(() => ({
    about: page === 'home' || page === 'about',
    cities: page === 'home' || page === 'cities',
    contact: page === 'contact',
    drivers: page === 'home' || page === 'drivers',
    home: page === 'home',
    how: page === 'home' || page === 'how-it-works',
    passengers: page === 'home' || page === 'passengers',
  }), [page]);

  return (
    <div className="public-site" dir={siteCopy[language].dir} lang={language}>
      <PublicHeader language={language} onLanguageChange={() => setLanguage(current => current === 'en' ? 'ar' : 'en')} />
      <main>
        {visible.home ? <HeroSection language={language} /> : null}
        {visible.how ? <HowItWorks language={language} /> : null}
        {visible.passengers ? <Benefits audience="passengers" language={language} /> : null}
        {visible.drivers ? <Benefits audience="drivers" language={language} /> : null}
        {visible.cities ? <RoutesSection language={language} /> : null}
        {page === 'login' ? <AuthPanel language={language} mode="login" /> : null}
        {page === 'register' ? <AuthPanel language={language} mode="register" /> : null}
        {page === 'privacy' ? <LegalPage language={language} type="privacy" /> : null}
        {page === 'terms' ? <LegalPage language={language} type="terms" /> : null}
        {visible.about ? <AboutContact language={language} /> : null}
        {visible.contact ? <AboutContact contactOnly language={language} /> : null}
        {page === 'home' ? (
          <>
            <SafetyTrust language={language} />
            <Testimonials language={language} />
            <DownloadApp language={language} />
          </>
        ) : null}
        <FAQ language={language} />
      </main>
      <a className="public-site__whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`} rel="noreferrer" target="_blank" aria-label="Chat on WhatsApp">
        <MessageCircle size={24} />
      </a>
      <PublicFooter language={language} />
    </div>
  );
}
