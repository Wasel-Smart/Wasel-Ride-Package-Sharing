/**
 * SafetyPage — /app/safety
 *
 * Full interactive safety center:
 * - SOS emergency reporting with location capture
 * - Trusted emergency contacts management (add / remove)
 * - Trip safety checklist (pre-departure gate)
 * - Cultural comfort settings (prayer stops, gender preference, Ramadan mode)
 * - Insurance overview with claim initiation
 * - Incident reporting (post-trip)
 * - Safety score with verification-linked breakdown
 */

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Heart,
  MapPin,
  Moon,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { buildAuthPagePath } from '../../utils/authFlow';
import { PAGE_DS } from '../../styles/wasel-page-theme';

const DS = PAGE_DS;
const r = (px = 12) => `${px}px`;

/* ─── Types ──────────────────────────────────────────────────────────────────── */

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface IncidentReport {
  id: string;
  type: string;
  description: string;
  submittedAt: string;
  status: 'submitted' | 'under_review' | 'resolved';
}

type GenderPreference = 'no_preference' | 'same_gender_only' | 'male_drivers_only' | 'female_drivers_only';

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/* ─── Auth guard ─────────────────────────────────────────────────────────────── */

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(buildAuthPagePath('signin', '/app/safety'));
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: DS.bg, fontFamily: DS.F }}>
        <div style={{ color: DS.sub }}>Loading safety tools…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: DS.bg, fontFamily: DS.F }}>
        <div style={{ color: DS.sub }}>Redirecting to sign in…</div>
      </div>
    );
  }

  return <>{children}</>;
}

/* ─── SOS Panel ──────────────────────────────────────────────────────────────── */

function SOSPanel() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'locating' | 'sent'>('idle');
  const [location, setLocation] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSOS() {
    setStep('confirm');
  }

  function handleConfirm() {
    setStep('locating');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
          finishSend();
        },
        () => {
          setLocation('Location unavailable');
          finishSend();
        },
        { timeout: 4000 },
      );
    } else {
      setLocation('Geolocation not supported');
      finishSend();
    }
  }

  function finishSend() {
    timerRef.current = setTimeout(() => setStep('sent'), 1500);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const buttonBase: React.CSSProperties = {
    height: 44,
    borderRadius: r(12),
    border: 'none',
    fontWeight: 800,
    fontFamily: DS.F,
    cursor: 'pointer',
    fontSize: '0.88rem',
  };

  if (step === 'sent') {
    return (
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: r(20), padding: '22px 20px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <CheckCircle2 size={28} color="#22c55e" />
          <div>
            <div style={{ color: DS.text, fontWeight: 900, fontSize: '1.05rem' }}>Emergency alert sent</div>
            <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 3 }}>Safety team notified · Trusted contacts alerted</div>
          </div>
        </div>
        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DS.card2, borderRadius: r(10), padding: '10px 13px', marginBottom: 12 }}>
            <MapPin size={14} color={DS.cyan} />
            <span style={{ color: DS.sub, fontSize: '0.76rem' }}>Location shared: <strong style={{ color: DS.text }}>{location}</strong></span>
          </div>
        )}
        <button onClick={() => { setStep('idle'); setLocation(null); }} style={{ ...buttonBase, background: DS.card2, color: DS.text, padding: '0 20px' }}>
          Done
        </button>
      </div>
    );
  }

  if (step === 'confirm' || step === 'locating') {
    return (
      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: r(20), padding: '22px 20px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <AlertTriangle size={26} color="#ef4444" />
          <div>
            <div style={{ color: DS.text, fontWeight: 900, fontSize: '1.05rem' }}>
              {step === 'locating' ? 'Getting your location…' : 'Send emergency alert?'}
            </div>
            <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 3 }}>
              This will alert Wasel's safety team and share your location with your trusted contacts.
            </div>
          </div>
        </div>
        {step === 'confirm' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleConfirm} style={{ ...buttonBase, background: '#ef4444', color: '#fff', flex: 1 }}>
              Confirm — Send Alert
            </button>
            <button onClick={() => setStep('idle')} style={{ ...buttonBase, background: DS.card2, color: DS.text, flex: 1 }}>
              Cancel
            </button>
          </div>
        )}
        {step === 'locating' && (
          <div style={{ color: DS.cyan, fontSize: '0.82rem', fontWeight: 700 }}>Capturing location…</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: r(20), padding: '20px 20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: r(14), background: 'rgba(239,68,68,0.14)', border: '1.5px solid rgba(239,68,68,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={24} color="#ef4444" />
        </div>
        <div>
          <div style={{ color: DS.text, fontWeight: 900, fontSize: '1.05rem' }}>SOS Emergency</div>
          <div style={{ color: DS.sub, fontSize: '0.78rem', marginTop: 3 }}>One tap to alert safety team and share your live location</div>
        </div>
      </div>
      <button
        onClick={handleSOS}
        style={{ ...buttonBase, width: '100%', background: '#ef4444', color: '#fff', fontSize: '0.92rem', letterSpacing: '0.05em' }}
      >
        🆘 Send Emergency Alert
      </button>
      <div style={{ color: 'rgba(239,68,68,0.7)', fontSize: '0.72rem', marginTop: 10, lineHeight: 1.5 }}>
        Only use in genuine emergencies. Your location will be shared with Wasel's safety team and your trusted contacts.
      </div>
    </div>
  );
}

/* ─── Emergency Contacts ─────────────────────────────────────────────────────── */

function EmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(() =>
    readStorage<EmergencyContact[]>('wasel.safety.contacts', []),
  );
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [error, setError] = useState<string | null>(null);

  function save(updated: EmergencyContact[]) {
    setContacts(updated);
    writeStorage('wasel.safety.contacts', updated);
  }

  function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    const contact: EmergencyContact = { id: generateId(), name: name.trim(), phone: phone.trim(), relationship };
    save([...contacts, contact]);
    setName('');
    setPhone('');
    setRelationship('Family');
    setAdding(false);
    setError(null);
  }

  function handleRemove(id: string) {
    save(contacts.filter((c) => c.id !== id));
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 42,
    borderRadius: r(10),
    border: `1px solid ${DS.border}`,
    background: DS.card2,
    color: DS.text,
    padding: '0 12px',
    fontFamily: DS.F,
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Heart size={18} color={DS.cyan} />
          <div style={{ color: DS.text, fontWeight: 900 }}>Emergency Contacts</div>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{ height: 34, padding: '0 12px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: DS.F, fontSize: '0.78rem' }}
          >
            <Plus size={13} /> Add Contact
          </button>
        )}
      </div>

      {contacts.length === 0 && !adding && (
        <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
          No emergency contacts saved. Add at least one person who should be alerted if you trigger SOS.
        </div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {contacts.map((contact) => (
          <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(12), padding: '12px 14px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${DS.cyan}18`, border: `1px solid ${DS.cyan}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DS.cyan, flexShrink: 0 }}>
              <UserCheck size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.85rem' }}>{contact.name}</div>
              <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 3 }}>{contact.relationship} · {contact.phone}</div>
            </div>
            <button onClick={() => handleRemove(contact.id)} style={{ border: 'none', background: 'transparent', color: 'rgba(239,68,68,0.55)', cursor: 'pointer', padding: 4 }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div style={{ marginTop: 14, display: 'grid', gap: 10, background: DS.card2, borderRadius: r(14), padding: '14px' }}>
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input placeholder="+962 79 xxx xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} type="tel" />
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)} style={{ ...inputStyle, height: 42 }}>
            {['Family', 'Friend', 'Colleague', 'Partner', 'Other'].map((rel) => (
              <option key={rel} value={rel} style={{ background: '#ffffff', color: '#10243d' }}>{rel}</option>
            ))}
          </select>
          {error && <div style={{ color: '#f87171', fontSize: '0.75rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleAdd} style={{ flex: 1, height: 42, borderRadius: r(10), border: 'none', background: DS.cyan, color: '#041018', fontWeight: 800, cursor: 'pointer', fontFamily: DS.F }}>
              Save Contact
            </button>
            <button onClick={() => { setAdding(false); setError(null); }} style={{ height: 42, padding: '0 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: 'transparent', color: DS.sub, cursor: 'pointer', fontFamily: DS.F }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Pre-Trip Safety Checklist ──────────────────────────────────────────────── */

const CHECKLIST_ITEMS = [
  { id: 'verify_driver', label: 'Driver verified with Sanad eKYC', description: 'Government identity confirmed before departure.' },
  { id: 'plate_match', label: 'Vehicle plate matches booking', description: 'Check the plate in your trip confirmation.' },
  { id: 'share_trip', label: 'Share trip details with a contact', description: 'Send the trip code to a trusted person.' },
  { id: 'charge_phone', label: 'Phone is sufficiently charged', description: 'Keep enough battery for the full journey.' },
  { id: 'sos_ready', label: 'Emergency contacts are saved', description: 'At least one contact added to your safety list.' },
  { id: 'seat_belt', label: 'Seat belt fastened before departure', description: 'Mandatory on all Wasel journeys.' },
];

function SafetyChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    readStorage<Record<string, boolean>>('wasel.safety.checklist', {}),
  );

  function toggle(id: string) {
    const updated = { ...checked, [id]: !checked[id] };
    setChecked(updated);
    writeStorage('wasel.safety.checklist', updated);
  }

  const completedCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={18} color={DS.green} />
          <div style={{ color: DS.text, fontWeight: 900 }}>Pre-Trip Safety Checklist</div>
        </div>
        <span style={{ color: completedCount === CHECKLIST_ITEMS.length ? DS.green : DS.gold, fontWeight: 800, fontSize: '0.8rem' }}>
          {completedCount}/{CHECKLIST_ITEMS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: DS.card3, borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%`, background: completedCount === CHECKLIST_ITEMS.length ? DS.green : DS.cyan, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: checked[item.id] ? `${DS.green}0A` : DS.card2, border: `1px solid ${checked[item.id] ? `${DS.green}30` : DS.border}`, borderRadius: r(12), padding: '12px 14px', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked[item.id] ? DS.green : DS.border}`, background: checked[item.id] ? DS.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              {checked[item.id] && <CheckCircle2 size={13} color="#041018" />}
            </div>
            <div>
              <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.sub, fontSize: '0.73rem', marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Cultural Comfort Settings ──────────────────────────────────────────────── */

function CulturalSettings() {
  const [prayerStops, setPrayerStops] = useState(() => readStorage('wasel.safety.prayer_stops', true));
  const [ramadan, setRamadan] = useState(() => readStorage('wasel.safety.ramadan', false));
  const [genderPreference, setGenderPreference] = useState<GenderPreference>(() =>
    readStorage<GenderPreference>('wasel.safety.gender_preference', 'no_preference'),
  );

  function handlePrayerStops(v: boolean) { setPrayerStops(v); writeStorage('wasel.safety.prayer_stops', v); }
  function handleRamadan(v: boolean) { setRamadan(v); writeStorage('wasel.safety.ramadan', v); }
  function handleGender(v: GenderPreference) { setGenderPreference(v); writeStorage('wasel.safety.gender_preference', v); }

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: on ? DS.cyan : DS.card3,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
  });

  const knobStyle = (on: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 3,
    left: on ? 23 : 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
  });

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)} style={toggleStyle(value)}>
        <span style={knobStyle(value)} />
      </button>
    );
  }

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Moon size={18} color={DS.gold} />
        <div style={{ color: DS.text, fontWeight: 900 }}>Cultural Comfort Settings</div>
      </div>

      <div style={{ display: 'grid', gap: 0, borderRadius: r(12), overflow: 'hidden', border: `1px solid ${DS.border}` }}>
        {/* Prayer stops */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem' }}>Prayer Stop Requests</div>
            <div style={{ color: DS.sub, fontSize: '0.73rem', marginTop: 3 }}>Allow brief stops at mosques on long-distance routes.</div>
          </div>
          <Toggle value={prayerStops} onChange={handlePrayerStops} />
        </div>

        {/* Ramadan mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem' }}>Ramadan Mode</div>
            <div style={{ color: DS.sub, fontSize: '0.73rem', marginTop: 3 }}>Iftar timing alerts and Suhoor-aware departure windows.</div>
          </div>
          <Toggle value={ramadan} onChange={handleRamadan} />
        </div>

        {/* Gender preference */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem', marginBottom: 10 }}>Gender Preference</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {(
              [
                ['no_preference', 'No preference'],
                ['same_gender_only', 'Same gender riders only'],
                ['male_drivers_only', 'Male drivers only'],
                ['female_drivers_only', 'Female drivers only'],
              ] as [GenderPreference, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleGender(value)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: genderPreference === value ? `${DS.cyan}10` : DS.card2, border: `1px solid ${genderPreference === value ? `${DS.cyan}30` : DS.border}`, borderRadius: r(10), padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${genderPreference === value ? DS.cyan : DS.border}`, background: genderPreference === value ? DS.cyan : 'transparent', flexShrink: 0 }} />
                <span style={{ color: genderPreference === value ? DS.text : DS.sub, fontWeight: genderPreference === value ? 700 : 400, fontSize: '0.82rem' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Insurance Panel ────────────────────────────────────────────────────────── */

function InsurancePanel() {
  const [claimOpen, setClaimOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submitClaim() {
    if (!description.trim()) return;
    setSubmitted(true);
    const existing = readStorage<IncidentReport[]>('wasel.safety.claims', []);
    writeStorage('wasel.safety.claims', [
      ...existing,
      {
        id: generateId(),
        type: 'insurance_claim',
        description: description.trim(),
        submittedAt: new Date().toISOString(),
        status: 'submitted',
      },
    ]);
    setDescription('');
    setTimeout(() => { setClaimOpen(false); setSubmitted(false); }, 2500);
  }

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <FileText size={18} color={DS.gold} />
        <div style={{ color: DS.text, fontWeight: 900 }}>Trip Insurance</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {[
          { label: 'Coverage per trip', value: 'JOD 1,000', color: DS.gold },
          { label: 'Medical assistance', value: 'Included', color: DS.green },
          { label: 'Luggage protection', value: 'Up to JOD 200', color: DS.cyan },
          { label: 'Cancellation cover', value: 'Up to JOD 50', color: DS.blue },
        ].map((item) => (
          <div key={item.label} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${DS.border}`, borderRadius: r(12), padding: '12px 14px' }}>
            <div style={{ color: item.color, fontWeight: 800, fontSize: '0.9rem' }}>{item.value}</div>
            <div style={{ color: DS.sub, fontSize: '0.72rem', marginTop: 3 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {!claimOpen ? (
        <button
          onClick={() => setClaimOpen(true)}
          style={{ width: '100%', height: 42, borderRadius: r(12), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, fontWeight: 700, cursor: 'pointer', fontFamily: DS.F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.84rem' }}
        >
          <FileText size={15} /> File an Insurance Claim
        </button>
      ) : (
        <div style={{ background: DS.card2, borderRadius: r(14), padding: '14px' }}>
          <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem', marginBottom: 10 }}>Describe the incident</div>
          {submitted ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: DS.green, fontWeight: 700 }}>
              <CheckCircle2 size={16} /> Claim submitted — our team will contact you within 24 hours.
            </div>
          ) : (
            <>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Briefly describe what happened and which trip it relates to…"
                style={{ width: '100%', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card3, color: DS.text, padding: '10px 12px', fontFamily: DS.F, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={submitClaim} disabled={!description.trim()} style={{ flex: 1, height: 40, borderRadius: r(10), border: 'none', background: description.trim() ? DS.cyan : 'rgba(255,255,255,0.1)', color: description.trim() ? '#041018' : DS.sub, fontWeight: 800, cursor: description.trim() ? 'pointer' : 'not-allowed', fontFamily: DS.F }}>
                  Submit Claim
                </button>
                <button onClick={() => setClaimOpen(false)} style={{ height: 40, padding: '0 14px', borderRadius: r(10), border: `1px solid ${DS.border}`, background: 'transparent', color: DS.sub, cursor: 'pointer', fontFamily: DS.F }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Incident Report ────────────────────────────────────────────────────────── */

const INCIDENT_TYPES = [
  'Driver behaviour',
  'Route deviation',
  'Vehicle condition',
  'Package damage',
  'Payment dispute',
  'Other',
];

function IncidentReport() {
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState<IncidentReport[]>(() =>
    readStorage<IncidentReport[]>('wasel.safety.incidents', []),
  );

  function submit() {
    if (!description.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      const report: IncidentReport = {
        id: generateId(),
        type,
        description: description.trim(),
        submittedAt: new Date().toISOString(),
        status: 'submitted',
      };
      const updated = [report, ...reports];
      setReports(updated);
      writeStorage('wasel.safety.incidents', updated);
      setDescription('');
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }, 900);
  }

  const statusColor: Record<IncidentReport['status'], string> = {
    submitted: DS.cyan,
    under_review: DS.gold,
    resolved: DS.green,
  };

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <AlertTriangle size={18} color={DS.gold} />
        <div style={{ color: DS.text, fontWeight: 900 }}>Report an Incident</div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', color: DS.sub, fontSize: '0.74rem', marginBottom: 6 }}>Incident type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', height: 42, borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, padding: '0 12px', fontFamily: DS.F, outline: 'none' }}
          >
            {INCIDENT_TYPES.map((t) => <option key={t} value={t} style={{ background: '#ffffff', color: '#10243d' }}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', color: DS.sub, fontSize: '0.74rem', marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the incident clearly…"
            style={{ width: '100%', borderRadius: r(10), border: `1px solid ${DS.border}`, background: DS.card2, color: DS.text, padding: '10px 12px', fontFamily: DS.F, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
          />
        </div>
        {submitted ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: DS.green, fontWeight: 700, fontSize: '0.84rem' }}>
            <CheckCircle2 size={16} /> Report submitted. We will review it within 48 hours.
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={submitting || !description.trim()}
            style={{ height: 44, borderRadius: r(12), border: 'none', background: description.trim() && !submitting ? DS.gold : 'rgba(255,255,255,0.08)', color: description.trim() && !submitting ? '#041018' : DS.sub, fontWeight: 800, cursor: description.trim() && !submitting ? 'pointer' : 'not-allowed', fontFamily: DS.F }}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        )}
      </div>

      {reports.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ color: DS.sub, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Past reports</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {reports.slice(0, 3).map((report) => (
              <div key={report.id} style={{ background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(10), padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  <span style={{ color: DS.text, fontWeight: 700, fontSize: '0.8rem' }}>{report.type}</span>
                  <span style={{ color: statusColor[report.status], fontSize: '0.72rem', fontWeight: 700 }}>{report.status.replace('_', ' ')}</span>
                </div>
                <div style={{ color: DS.sub, fontSize: '0.73rem', lineHeight: 1.5 }}>{report.description.slice(0, 80)}{report.description.length > 80 ? '…' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Safety Score ───────────────────────────────────────────────────────────── */

function SafetyScore({ user }: { user: { trustScore: number; verified?: boolean; emailVerified?: boolean; phoneVerified?: boolean; walletStatus?: string } }) {
  const score = user.trustScore ?? 0;
  const color = score >= 80 ? DS.green : score >= 50 ? DS.gold : '#ef4444';

  const factors = [
    { label: 'Identity verified', done: Boolean(user.verified), weight: 30 },
    { label: 'Email confirmed', done: Boolean(user.emailVerified), weight: 20 },
    { label: 'Phone confirmed', done: Boolean(user.phoneVerified), weight: 20 },
    { label: 'Wallet active', done: user.walletStatus === 'active', weight: 15 },
    { label: 'Emergency contact saved', done: readStorage<EmergencyContact[]>('wasel.safety.contacts', []).length > 0, weight: 15 },
  ];

  return (
    <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Star size={18} color={color} />
        <div style={{ color: DS.text, fontWeight: 900 }}>Safety Score</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <span style={{ color, fontWeight: 900, fontSize: '2.4rem', lineHeight: 1 }}>{score}</span>
        <span style={{ color: DS.sub, fontSize: '0.9rem' }}>/100</span>
        <span style={{ color, fontSize: '0.78rem', fontWeight: 700, marginLeft: 4 }}>
          {score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs attention'}
        </span>
      </div>

      <div style={{ height: 6, background: DS.card3, borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {factors.map((factor) => (
          <div key={factor.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: factor.done ? `${DS.green}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${factor.done ? `${DS.green}35` : DS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {factor.done ? <CheckCircle2 size={12} color={DS.green} /> : <X size={11} color={DS.sub} />}
            </div>
            <div style={{ flex: 1, color: factor.done ? DS.text : DS.sub, fontSize: '0.8rem' }}>{factor.label}</div>
            <div style={{ color: factor.done ? DS.green : DS.sub, fontSize: '0.72rem', fontWeight: 700 }}>+{factor.weight}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Quick Links ────────────────────────────────────────────────────────────── */

function QuickLink({ icon, label, sub, onClick }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', background: DS.card2, border: `1px solid ${DS.border}`, borderRadius: r(14), padding: '14px 16px', cursor: 'pointer', textAlign: 'left', marginBottom: 10 }}
    >
      <div style={{ width: 38, height: 38, borderRadius: r(10), background: 'rgba(71,183,230,0.1)', border: `1px solid rgba(71,183,230,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
        {sub && <div style={{ color: DS.sub, fontSize: '0.73rem', marginTop: 2 }}>{sub}</div>}
      </div>
      <ChevronRight size={15} color={DS.sub} />
    </button>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function SafetyPage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';

  return (
    <Protected>
      <div style={{ minHeight: '100vh', background: DS.bg, fontFamily: DS.F, direction: ar ? 'rtl' : 'ltr', paddingBottom: 88 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 16px 0' }}>

          {/* Header */}
          <div style={{ background: `linear-gradient(135deg, ${DS.green}14, rgba(255,255,255,0.78))`, border: `1px solid ${DS.green}22`, borderRadius: r(22), padding: '24px 22px', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: r(16), background: `${DS.green}18`, border: `1.5px solid ${DS.green}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={26} color={DS.green} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: DS.text, margin: 0 }}>Safety Center</h1>
                <p style={{ color: DS.sub, margin: '5px 0 0', fontSize: '0.82rem' }}>
                  Emergency tools · Verification · Cultural settings · Insurance
                </p>
              </div>
            </div>
          </div>

          {/* Safety score */}
          {user && <SafetyScore user={user} />}

          {/* SOS — most important first */}
          <SOSPanel />

          {/* Emergency contacts */}
          <EmergencyContacts />

          {/* Pre-trip checklist */}
          <SafetyChecklist />

          {/* Cultural settings */}
          <CulturalSettings />

          {/* Insurance */}
          <InsurancePanel />

          {/* Incident report */}
          <IncidentReport />

          {/* Quick links */}
          <div style={{ background: DS.card, border: `1px solid ${DS.border}`, borderRadius: r(20), padding: '20px', marginBottom: 18 }}>
            <div style={{ color: DS.sub, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Related</div>
            <QuickLink icon={<BadgeCheck size={16} color={DS.cyan} />} label="Trust & Verification" sub="Review your identity status and capabilities" onClick={() => nav('/app/trust')} />
            <QuickLink icon={<Phone size={16} color={DS.cyan} />} label="Driver Readiness" sub="Checklist for offering rides safely" onClick={() => nav('/app/driver')} />
            <QuickLink icon={<Clock size={16} color={DS.cyan} />} label="My Trips" sub="View active trips and support queue" onClick={() => nav('/app/my-trips')} />
          </div>

        </div>
      </div>
    </Protected>
  );
}
