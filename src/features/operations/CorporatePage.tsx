import React, { useState } from 'react';
import { PageShell } from '../../components/wasel-ui/WaselPagePrimitives';
import { useLanguage } from '../../contexts/LanguageContext';
import { Briefcase, Building, Users, MapPin, CheckCircle } from 'lucide-react';
import { C } from '../../utils/wasel-ds';

export function CorporatePage() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageShell maxWidth={1000} dir={dir}>
      <div style={{ padding: 24, minHeight: '80vh', color: '#fff' }}>
        {/* Hero Section */}
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'linear-gradient(135deg, ' + 'var(--background)' + ' 0%, ' + 'var(--muted)' + ' 100%)',
            borderRadius: 16,
            border: '1px solid ' + 'var(--border)',
            marginBottom: 32,
          }}
        >
          <Briefcase size={48} color={'var(--primary)'} style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
            {ar ? 'حلول النقل للشركات والمؤسسات' : 'Corporate Mobility & Fleet Solutions'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: 600, margin: '0 auto', fontSize: 16 }}>
            {ar
              ? 'خدمات نقل مخصصة للموظفين، فوترة مركزية، إدارة مسارات ذكية، وحجز أساطيل كاملة للشركات في الأردن.'
              : 'Dedicated fleet dispatch, recurring routes, centralized billing, and custom logistics portals for companies in Jordan.'}
          </p>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 40,
          }}
        >
          <FeatureCard
            title={ar ? 'إدارة الموظفين والمسارات' : 'Employee Route Planning'}
            description={
              ar
                ? 'تجميع الموظفين المقيمين في نفس المناطق وتوفير مسار رحلة يومي موحد لتقليل التكاليف.'
                : 'Group workers by geographic corridor to build automated, cost-efficient shared shuttles.'
            }
            icon={<Users color={'var(--primary)'} />}
          />
          <FeatureCard
            title={ar ? 'فوترة مركزية وتقارير' : 'Unified Monthly Billing'}
            description={
              ar
                ? 'حساب ائتماني موحد للشركة مع فواتير شهرية مفصلة وتقارير استخدام كاملة للمشرفين.'
                : 'Corporate postpaid accounts with detailed usage logs, SLA tracking, and single monthly invoices.'
            }
            icon={<Building color={'var(--primary)'} />}
          />
          <FeatureCard
            title={ar ? 'تتبع حي لوحة التحكم' : 'Live Dashboard Telemetry'}
            description={
              ar
                ? 'لوحة تحكم خاصة بالشركة لمشاهدة حركة المركبات وأوقات الوصول وتقييمات السائقين.'
                : 'Company admin portals to monitor vehicles in real-time, override routes, and audit arrival schedules.'
            }
            icon={<MapPin color={'var(--primary)'} />}
          />
        </div>

        {/* Inquiry Form */}
        <div
          style={{
            backgroundColor: 'var(--card)',
            padding: 32,
            borderRadius: 12,
            border: '1px solid ' + 'var(--border)',
          }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle size={48} color="#72C70D" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: 20, fontWeight: 600 }}>
                {ar ? 'تم إرسال الطلب بنجاح' : 'Inquiry Submitted'}
              </h3>
              <p style={{ color: 'var(--muted-foreground)', marginTop: 8 }}>
                {ar
                  ? 'سيتواصل معك فريق مبيعات واصل خلال 24 ساعة عمل.'
                  : 'Our corporate logistics team will contact you within 24 business hours.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: '#fff' }}>
                {ar ? 'اطلب استشارة أو عرض أسعار' : 'Request Corporate Quote & Demo'}
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                  marginBottom: 20,
                }}
              >
                <div>
                  <label
                    htmlFor="corporate-company-name"
                    style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted-foreground)' }}
                  >
                    {ar ? 'اسم الشركة' : 'Company Name'}
                  </label>
                  <input
                    id="corporate-company-name"
                    required
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: 'var(--background)',
                      border: '1px solid ' + 'var(--border)',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="corporate-work-email"
                    style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted-foreground)' }}
                  >
                    {ar ? 'البريد الإلكتروني للعمل' : 'Work Email'}
                  </label>
                  <input
                    id="corporate-work-email"
                    required
                    type="email"
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: 'var(--background)',
                      border: '1px solid ' + 'var(--border)',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                  marginBottom: 20,
                }}
              >
                <div>
                  <label
                    htmlFor="corporate-passenger-count"
                    style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted-foreground)' }}
                  >
                    {ar ? 'عدد الموظفين المتوقع نقلهم' : 'Estimated Passengers'}
                  </label>
                  <select
                    id="corporate-passenger-count"
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: 'var(--background)',
                      border: '1px solid ' + 'var(--border)',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  >
                    <option>10 - 50</option>
                    <option>50 - 200</option>
                    <option>200 - 500</option>
                    <option>500+</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="corporate-schedule-mode"
                    style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--muted-foreground)' }}
                  >
                    {ar ? 'الجدول الزمني المطلوب' : 'Schedule Mode'}
                  </label>
                  <select
                    id="corporate-schedule-mode"
                    style={{
                      width: '100%',
                      padding: 12,
                      backgroundColor: 'var(--background)',
                      border: '1px solid ' + 'var(--border)',
                      borderRadius: 8,
                      color: '#fff',
                    }}
                  >
                    <option>{ar ? 'يومي (ذهاب وإياب)' : 'Daily Round-trip'}</option>
                    <option>{ar ? 'مسارات مرنة' : 'On-demand / Shuttle loops'}</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: 14,
                  backgroundColor: 'var(--primary)',
                  color: 'var(--background)',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                {ar ? 'إرسال طلب الاستشارة' : 'Submit Fleet Inquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid ' + 'var(--border)',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--secondary)',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#fff' }}>{title}</h3>
      <p style={{ color: 'var(--muted-foreground)', fontSize: 14, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
