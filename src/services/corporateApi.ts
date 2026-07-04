import api from '../utils/api';

export interface Organization {
  id: string;
  name: string;
  contact_email: string;
  contact_phone?: string;
  billing_address?: string;
  tax_id?: string;
  owner_id: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  currency: string;
  status: string;
  line_items: Array<{ description: string; amount: number }>;
  created_at: string;
}

export async function createOrganization(input: {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  billingAddress?: string;
  taxId?: string;
}) {
  const response = await api.post('/corporate/organizations', input);
  return response as { data: Organization };
}

export async function addOrganizationMember(orgId: string, input: {
  userId: string;
  employeeId?: string;
  costCenter?: string;
}) {
  const response = await api.post(`/corporate/organizations/${orgId}/members`, input);
  return response as { data: unknown };
}

export async function addOrganizationCredits(orgId: string, input: {
  amount: number;
  currency?: string;
  expiresAt?: string;
}) {
  const response = await api.post(`/corporate/organizations/${orgId}/credits`, input);
  return response as { data: unknown };
}

export async function generateInvoice(input: {
  organizationId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}) {
  const response = await api.post('/corporate/invoices/generate', input);
  return response as { data: Invoice };
}

export async function getOrganizationInvoices(orgId: string) {
  const response = await api.get(`/corporate/organizations/${orgId}/invoices`);
  return response as { data: Invoice[] };
}
