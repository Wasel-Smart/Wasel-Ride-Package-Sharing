import { apiGateway } from './apiGateway';

export type GenderPreference =
  | 'no_preference'
  | 'same_gender_only'
  | 'male_drivers_only'
  | 'female_drivers_only';

export interface SafetyEmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface SafetySettings {
  checklist: Record<string, boolean>;
  cultural: {
    genderPreference: GenderPreference;
    prayerStops: boolean;
    ramadanMode: boolean;
  };
  emergencyContacts: SafetyEmergencyContact[];
}

export interface SafetyIncident {
  description: string;
  id: string;
  status: 'submitted' | 'under_review' | 'resolved';
  submittedAt: string;
  type: string;
}

export interface SafetyDashboard {
  incidents: SafetyIncident[];
  settings: SafetySettings;
}

export interface SafetySosPayload {
  activeTripId?: string | null;
  latitude?: number | null;
  locationLabel?: string | null;
  longitude?: number | null;
  metadata?: Record<string, unknown>;
}

export interface SafetySosResult {
  alertId: string;
  createdAt: string;
  notified: boolean;
  status: string;
}

export interface SafetyIncidentPayload {
  metadata?: Record<string, unknown>;
  type: string;
  description: string;
}

const defaultSafetySettings: SafetySettings = {
  checklist: {},
  cultural: {
    genderPreference: 'no_preference',
    prayerStops: true,
    ramadanMode: false,
  },
  emergencyContacts: [],
};

function normalizeContact(value: unknown): SafetyEmergencyContact | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const phone = typeof record.phone === 'string' ? record.phone.trim() : '';
  if (!name || !phone) {
    return null;
  }

  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id : crypto.randomUUID(),
    name,
    phone,
    relationship:
      typeof record.relationship === 'string' && record.relationship.trim()
        ? record.relationship
        : 'Other',
  };
}

function normalizeSafetySettings(value: Partial<SafetySettings> | null | undefined): SafetySettings {
  const contacts = Array.isArray(value?.emergencyContacts)
    ? value.emergencyContacts.map(normalizeContact).filter(Boolean) as SafetyEmergencyContact[]
    : [];
  const checklistSource =
    value?.checklist && typeof value.checklist === 'object' && !Array.isArray(value.checklist)
      ? value.checklist
      : {};

  return {
    checklist: Object.fromEntries(
      Object.entries(checklistSource).map(([key, checked]) => [key, Boolean(checked)]),
    ),
    cultural: {
      genderPreference:
        value?.cultural?.genderPreference === 'same_gender_only' ||
        value?.cultural?.genderPreference === 'male_drivers_only' ||
        value?.cultural?.genderPreference === 'female_drivers_only'
          ? value.cultural.genderPreference
          : 'no_preference',
      prayerStops: value?.cultural?.prayerStops ?? defaultSafetySettings.cultural.prayerStops,
      ramadanMode: value?.cultural?.ramadanMode ?? defaultSafetySettings.cultural.ramadanMode,
    },
    emergencyContacts: contacts,
  };
}

function normalizeIncident(value: unknown): SafetyIncident | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  const type = typeof record.type === 'string' ? record.type.trim() : '';
  if (!description || !type) {
    return null;
  }

  const status =
    record.status === 'under_review' || record.status === 'resolved' ? record.status : 'submitted';

  return {
    description,
    id: typeof record.id === 'string' ? record.id : crypto.randomUUID(),
    status,
    submittedAt:
      typeof record.submittedAt === 'string'
        ? record.submittedAt
        : new Date().toISOString(),
    type,
  };
}

function normalizeDashboard(value: Partial<SafetyDashboard> | null | undefined): SafetyDashboard {
  return {
    incidents: Array.isArray(value?.incidents)
      ? value.incidents.map(normalizeIncident).filter(Boolean) as SafetyIncident[]
      : [],
    settings: normalizeSafetySettings(value?.settings),
  };
}

export const safetyService = {
  async getDashboard(): Promise<SafetyDashboard> {
    const response = await apiGateway.get<{ dashboard?: Partial<SafetyDashboard> | null }>('/safety/settings');
    return normalizeDashboard(response.dashboard);
  },

  async updateSettings(settings: Partial<SafetySettings>): Promise<SafetySettings> {
    const response = await apiGateway.put<{ settings?: Partial<SafetySettings> | null }>(
      '/safety/settings',
      settings,
    );
    return normalizeSafetySettings(response.settings);
  },

  async createIncident(payload: SafetyIncidentPayload): Promise<SafetyIncident> {
    const response = await apiGateway.post<{ incident?: SafetyIncident | null }>('/safety/incident', payload);
    const incident = normalizeIncident(response.incident);
    if (!incident) {
      throw new Error('Safety incident response was invalid.');
    }
    return incident;
  },

  async triggerSos(payload: SafetySosPayload): Promise<SafetySosResult> {
    const response = await apiGateway.post<SafetySosResult>('/safety/sos', payload);
    return {
      alertId: String(response.alertId),
      createdAt: String(response.createdAt),
      notified: Boolean(response.notified),
      status: String(response.status ?? 'notified'),
    };
  },
};
