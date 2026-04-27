import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  LoaderCircle,
  MapPin,
  Moon,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  safetyService,
  type GenderPreference,
  type SafetyDashboard,
  type SafetyEmergencyContact,
  type SafetySettings,
} from '../../services/safetyService';
import { PageShell, Protected } from '../shared/pageShared';

const CHECKLIST_ITEM_KEYS = [
  'verifyDriver',
  'plateMatch',
  'shareTrip',
  'chargePhone',
  'contactsReady',
  'seatBelt',
] as const;

const INCIDENT_TYPE_KEYS = [
  'driver_behavior',
  'route_deviation',
  'vehicle_condition',
  'package_damage',
  'insurance_claim',
  'payment_dispute',
  'other',
] as const;

const CONTACT_RELATIONSHIP_KEYS = ['family', 'friend', 'colleague', 'partner', 'other'] as const;
type ContactRelationship = (typeof CONTACT_RELATIONSHIP_KEYS)[number];
type IncidentType = (typeof INCIDENT_TYPE_KEYS)[number];

function isContactRelationship(value: string): value is ContactRelationship {
  return CONTACT_RELATIONSHIP_KEYS.includes(value as ContactRelationship);
}

function isIncidentType(value: string): value is IncidentType {
  return INCIDENT_TYPE_KEYS.includes(value as IncidentType);
}

function createContactDraft(): SafetyEmergencyContact {
  return {
    id: '',
    name: '',
    phone: '',
    relationship: 'family',
  };
}

function resolveTrustLabel(score: number, t: (key: string) => string) {
  if (score >= 80) {
    return t('safetyPage.score.excellent');
  }
  if (score >= 50) {
    return t('safetyPage.score.good');
  }
  return t('safetyPage.score.needsAttention');
}

function formatIncidentStatus(status: string, t: (key: string) => string) {
  switch (status) {
    case 'under_review':
      return t('safetyPage.incidents.status.underReview');
    case 'resolved':
      return t('safetyPage.incidents.status.resolved');
    default:
      return t('safetyPage.incidents.status.submitted');
  }
}

async function captureGeolocation(): Promise<{
  latitude: number | null;
  locationLabel: string;
  longitude: number | null;
}> {
  if (!navigator.geolocation) {
    return {
      latitude: null,
      locationLabel: 'unavailable',
      longitude: null,
    };
  }

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          locationLabel: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve({
          latitude: null,
          locationLabel: 'unavailable',
          longitude: null,
        });
      },
      { timeout: 5_000 },
    );
  });
}

export default function SafetyPage() {
  const { formatDate, t } = useLanguage();
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const [dashboard, setDashboard] = useState<SafetyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState<SafetyEmergencyContact>(createContactDraft());
  const [incidentType, setIncidentType] = useState<IncidentType>(INCIDENT_TYPE_KEYS[0]);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentFeedback, setIncidentFeedback] = useState<string | null>(null);
  const [sosStage, setSosStage] = useState<'idle' | 'confirm' | 'sending' | 'sent' | 'error'>(
    'idle',
  );
  const [sosFeedback, setSosFeedback] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const settings = dashboard?.settings;
  const incidents = dashboard?.incidents ?? [];
  const contacts = settings?.emergencyContacts ?? [];
  const checklist = settings?.checklist ?? {};
  const completedChecklistCount = CHECKLIST_ITEM_KEYS.filter(key => checklist[key]).length;
  const trustScore = user?.trustScore ?? 0;
  const isSosConfirmStage = sosStage === 'confirm' || sosStage === 'sending';

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setSettingsError(null);
      try {
        const next = await safetyService.getDashboard();
        if (!cancelled) {
          setDashboard(next);
        }
      } catch (error) {
        if (!cancelled) {
          setSettingsError(error instanceof Error ? error.message : t('safetyPage.errors.load'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const scoreFactors = useMemo(
    () => [
      { done: Boolean(user?.verified), label: t('safetyPage.score.identityVerified'), weight: 30 },
      {
        done: Boolean(user?.emailVerified),
        label: t('safetyPage.score.emailConfirmed'),
        weight: 20,
      },
      {
        done: Boolean(user?.phoneVerified),
        label: t('safetyPage.score.phoneConfirmed'),
        weight: 20,
      },
      {
        done: user?.walletStatus === 'active',
        label: t('safetyPage.score.walletActive'),
        weight: 15,
      },
      { done: contacts.length > 0, label: t('safetyPage.score.contactsSaved'), weight: 15 },
    ],
    [
      contacts.length,
      t,
      user?.emailVerified,
      user?.phoneVerified,
      user?.verified,
      user?.walletStatus,
    ],
  );

  async function persistSettings(nextSettings: SafetySettings) {
    setSavingSettings(true);
    setSettingsError(null);

    try {
      const saved = await safetyService.updateSettings(nextSettings);
      setDashboard(current =>
        current ? { ...current, settings: saved } : { incidents: [], settings: saved },
      );
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : t('safetyPage.errors.save'));
      throw error;
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddContact() {
    const name = contactDraft.name.trim();
    const phone = contactDraft.phone.trim();

    if (!name || !phone || !settings) {
      setSettingsError(t('safetyPage.contacts.validation'));
      return;
    }

    const nextSettings = {
      ...settings,
      emergencyContacts: [
        ...contacts,
        {
          ...contactDraft,
          id: crypto.randomUUID(),
          name,
          phone,
        },
      ],
    };

    await persistSettings(nextSettings);
    setContactDraft(createContactDraft());
    setAddingContact(false);
  }

  async function handleRemoveContact(contactId: string) {
    if (!settings) {
      return;
    }

    await persistSettings({
      ...settings,
      emergencyContacts: contacts.filter(contact => contact.id !== contactId),
    });
  }

  async function handleChecklistToggle(itemKey: string) {
    if (!settings) {
      return;
    }

    await persistSettings({
      ...settings,
      checklist: {
        ...checklist,
        [itemKey]: !checklist[itemKey],
      },
    });
  }

  async function handleCulturalUpdate(patch: Partial<SafetySettings['cultural']>) {
    if (!settings) {
      return;
    }

    await persistSettings({
      ...settings,
      cultural: {
        ...settings.cultural,
        ...patch,
      },
    });
  }

  async function handleSubmitIncident() {
    const description = incidentDescription.trim();
    if (!description) {
      setIncidentFeedback(t('safetyPage.incidents.validation'));
      return;
    }

    setIncidentSubmitting(true);
    setIncidentFeedback(null);

    try {
      const incident = await safetyService.createIncident({
        description,
        type: incidentType,
      });
      setDashboard(current =>
        current
          ? { ...current, incidents: [incident, ...current.incidents] }
          : {
              incidents: [incident],
              settings: settings ?? {
                checklist: {},
                cultural: {
                  genderPreference: 'no_preference',
                  prayerStops: true,
                  ramadanMode: false,
                },
                emergencyContacts: [],
              },
            },
      );
      setIncidentDescription('');
      setIncidentFeedback(t('safetyPage.incidents.submitted'));
    } catch (error) {
      setIncidentFeedback(error instanceof Error ? error.message : t('safetyPage.errors.incident'));
    } finally {
      setIncidentSubmitting(false);
    }
  }

  async function sendSos() {
    setSosStage('sending');
    setSosFeedback(null);

    try {
      const geolocation = await captureGeolocation();
      setLocationLabel(geolocation.locationLabel);
      const result = await safetyService.triggerSos({
        latitude: geolocation.latitude,
        locationLabel:
          geolocation.locationLabel === 'unavailable' ? null : geolocation.locationLabel,
        longitude: geolocation.longitude,
        metadata: {
          trustScore: user?.trustScore ?? null,
        },
      });

      if (!result.notified) {
        throw new Error(t('safetyPage.errors.sos'));
      }

      setSosStage('sent');
      setSosFeedback(t('safetyPage.sos.sentBody'));
    } catch (error) {
      setSosStage('error');
      setSosFeedback(error instanceof Error ? error.message : t('safetyPage.errors.sos'));
    }
  }

  return (
    <PageShell>
      <Protected>
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-8 pt-4 md:px-6">
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-primary/15 bg-[linear-gradient(140deg,rgba(3,13,28,0.96),rgba(7,40,36,0.92))]">
              <CardHeader className="gap-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Shield className="h-3.5 w-3.5" />
                  {t('safetyPage.header.badge')}
                </div>
                <CardTitle className="flex items-center gap-3 text-2xl text-foreground">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                  {t('safetyPage.header.title')}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {t('safetyPage.header.subtitle')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 pb-6 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Star className="h-4 w-4 text-primary" />
                    {t('safetyPage.score.title')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{trustScore}</p>
                  <p className="text-xs text-muted-foreground">
                    {resolveTrustLabel(trustScore, t)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserCheck className="h-4 w-4 text-primary" />
                    {t('safetyPage.contacts.title')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{contacts.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('safetyPage.header.contactsSummary')}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {t('safetyPage.checklist.title')}
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {completedChecklistCount}/{CHECKLIST_ITEM_KEYS.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('safetyPage.header.checklistSummary')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('safetyPage.score.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.score.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {scoreFactors.map(factor => (
                  <div
                    key={factor.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-xl ${factor.done ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted-foreground'}`}
                    >
                      {factor.done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{factor.label}</p>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      +{factor.weight}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-rose-500/25 bg-rose-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg text-foreground">
                  <AlertTriangle className="h-5 w-5 text-rose-300" />
                  {t('safetyPage.sos.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.sos.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sosStage === 'sent' ? (
                  <div
                    aria-live="polite"
                    className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary"
                    role="status"
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('safetyPage.sos.sentTitle')}
                    </div>
                    <p className="mt-2 text-primary/90">{sosFeedback}</p>
                    {locationLabel ? (
                      <p className="mt-2 flex items-center gap-2 text-primary/90">
                        <MapPin className="h-4 w-4" />
                        {locationLabel === 'unavailable'
                          ? t('safetyPage.sos.locationUnavailable')
                          : `${t('safetyPage.sos.locationShared')} ${locationLabel}`}
                      </p>
                    ) : null}
                  </div>
                ) : sosStage === 'error' ? (
                  <div
                    className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive"
                    role="alert"
                  >
                    <div className="font-semibold">{t('safetyPage.sos.errorTitle')}</div>
                    <p className="mt-2">{sosFeedback}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                    {t('safetyPage.sos.body')}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {isSosConfirmStage ? (
                    <>
                      <Button
                        className="bg-rose-500 text-white hover:bg-rose-400"
                        disabled={sosStage === 'sending'}
                        onClick={() => {
                          void sendSos();
                        }}
                      >
                        {sosStage === 'sending' ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <AlertTriangle className="mr-2 h-4 w-4" />
                        )}
                        {t('safetyPage.sos.confirm')}
                      </Button>
                      <Button variant="secondary" onClick={() => setSosStage('idle')}>
                        {t('common.cancel')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="bg-rose-500 text-white hover:bg-rose-400"
                        disabled={false}
                        onClick={() => setSosStage('confirm')}
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t('safetyPage.sos.trigger')}
                      </Button>
                      {sosStage === 'error' || sosStage === 'sent' ? (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSosStage('idle');
                            setSosFeedback(null);
                          }}
                        >
                          {sosStage === 'error' ? t('common.retry') : t('common.done')}
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('safetyPage.quickLinks.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.quickLinks.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <button
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
                  onClick={() => navigate('/app/trust')}
                  type="button"
                >
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t('safetyPage.quickLinks.trust')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('safetyPage.quickLinks.trustSub')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
                  onClick={() => navigate('/app/driver')}
                  type="button"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t('safetyPage.quickLinks.driver')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('safetyPage.quickLinks.driverSub')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
                  onClick={() => navigate('/app/my-trips')}
                  type="button"
                >
                  <Clock className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {t('safetyPage.quickLinks.trips')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('safetyPage.quickLinks.tripsSub')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </section>

          {settingsError ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              {settingsError}
            </div>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('safetyPage.contacts.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.contacts.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {t('safetyPage.loading')}
                  </div>
                ) : null}

                {!loading && contacts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-muted-foreground">
                    {t('safetyPage.contacts.empty')}
                  </div>
                ) : null}

                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {CONTACT_RELATIONSHIP_KEYS.includes(
                          contact.relationship as (typeof CONTACT_RELATIONSHIP_KEYS)[number],
                        )
                          ? t(`safetyPage.contacts.relationships.${contact.relationship}`)
                          : contact.relationship}
                        {' · '}
                        {contact.phone}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        void handleRemoveContact(contact.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {addingContact ? (
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Input
                      placeholder={t('safetyPage.contacts.namePlaceholder')}
                      value={contactDraft.name}
                      onChange={event =>
                        setContactDraft(current => ({ ...current, name: event.target.value }))
                      }
                    />
                    <Input
                      placeholder={t('safetyPage.contacts.phonePlaceholder')}
                      type="tel"
                      value={contactDraft.phone}
                      onChange={event =>
                        setContactDraft(current => ({ ...current, phone: event.target.value }))
                      }
                    />
                    <select
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                      value={contactDraft.relationship}
                      onChange={event => {
                        const nextRelationship = event.target.value;
                        setContactDraft(current => ({
                          ...current,
                          relationship: isContactRelationship(nextRelationship)
                            ? nextRelationship
                            : current.relationship,
                        }));
                      }}
                    >
                      {CONTACT_RELATIONSHIP_KEYS.map(key => (
                        <option key={key} value={key}>
                          {t(`safetyPage.contacts.relationships.${key}`)}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-3">
                      <Button disabled={savingSettings} onClick={() => void handleAddContact()}>
                        {savingSettings ? (
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t('safetyPage.contacts.save')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setAddingContact(false);
                          setContactDraft(createContactDraft());
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => setAddingContact(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('safetyPage.contacts.add')}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('safetyPage.checklist.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.checklist.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CHECKLIST_ITEM_KEYS.map(key => (
                  <button
                    key={key}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${checklist[key] ? 'border-primary/25 bg-primary/10' : 'border-white/10 bg-white/5'}`}
                    onClick={() => {
                      void handleChecklistToggle(key);
                    }}
                    type="button"
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg ${checklist[key] ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'}`}
                    >
                      {checklist[key] ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {t(`safetyPage.checklist.items.${key}.label`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`safetyPage.checklist.items.${key}.description`)}
                      </p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg text-foreground">
                  <Moon className="h-5 w-5 text-primary" />
                  {t('safetyPage.cultural.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.cultural.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('safetyPage.cultural.prayerStops')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('safetyPage.cultural.prayerStopsSub')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={settings?.cultural.prayerStops ? 'default' : 'secondary'}
                    onClick={() => {
                      void handleCulturalUpdate({ prayerStops: !settings?.cultural.prayerStops });
                    }}
                  >
                    {settings?.cultural.prayerStops ? t('common.active') : t('common.inactive')}
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t('safetyPage.cultural.ramadanMode')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('safetyPage.cultural.ramadanModeSub')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={settings?.cultural.ramadanMode ? 'default' : 'secondary'}
                    onClick={() => {
                      void handleCulturalUpdate({ ramadanMode: !settings?.cultural.ramadanMode });
                    }}
                  >
                    {settings?.cultural.ramadanMode ? t('common.active') : t('common.inactive')}
                  </Button>
                </div>
                <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {t('safetyPage.cultural.genderPreference')}
                  </p>
                  <select
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                    value={settings?.cultural.genderPreference ?? 'no_preference'}
                    onChange={event => {
                      void handleCulturalUpdate({
                        genderPreference: event.target.value as GenderPreference,
                      });
                    }}
                  >
                    <option value="no_preference">
                      {t('safetyPage.cultural.options.noPreference')}
                    </option>
                    <option value="same_gender_only">
                      {t('safetyPage.cultural.options.sameGenderOnly')}
                    </option>
                    <option value="male_drivers_only">
                      {t('safetyPage.cultural.options.maleDriversOnly')}
                    </option>
                    <option value="female_drivers_only">
                      {t('safetyPage.cultural.options.femaleDriversOnly')}
                    </option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-foreground">
                  {t('safetyPage.incidents.title')}
                </CardTitle>
                <CardDescription>{t('safetyPage.incidents.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground"
                  value={incidentType}
                  onChange={event => {
                    const nextIncidentType = event.target.value;
                    if (isIncidentType(nextIncidentType)) {
                      setIncidentType(nextIncidentType);
                    }
                  }}
                >
                  {INCIDENT_TYPE_KEYS.map(key => (
                    <option key={key} value={key}>
                      {t(`safetyPage.incidents.types.${key}`)}
                    </option>
                  ))}
                </select>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm text-foreground"
                  placeholder={t('safetyPage.incidents.placeholder')}
                  value={incidentDescription}
                  onChange={event => setIncidentDescription(event.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  <Button disabled={incidentSubmitting} onClick={() => void handleSubmitIncident()}>
                    {incidentSubmitting ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t('safetyPage.incidents.submit')}
                  </Button>
                  {incidentFeedback ? (
                    <div
                      aria-live="polite"
                      className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary"
                      role="status"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {incidentFeedback}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {t('safetyPage.incidents.history')}
                    </h3>
                    <span className="text-xs text-muted-foreground">{incidents.length}</span>
                  </div>
                  {incidents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-muted-foreground">
                      {t('safetyPage.incidents.empty')}
                    </div>
                  ) : (
                    incidents.map(incident => (
                      <div
                        key={incident.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">
                            {t(`safetyPage.incidents.types.${incident.type}`)}
                          </p>
                          <span className="text-xs font-semibold text-primary">
                            {formatIncidentStatus(incident.status, t)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{incident.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(incident.submittedAt, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </Protected>
    </PageShell>
  );
}
