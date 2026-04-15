import { beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const { mockCreateDirectSupportTicket, mockGetDirectSupportTickets, mockUpdateDirectSupportTicketStatus } = vi.hoisted(() => ({
  mockCreateDirectSupportTicket: vi.fn(),
  mockGetDirectSupportTickets: vi.fn(),
  mockUpdateDirectSupportTicketStatus: vi.fn(),
}));

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectSupportTicket: (...args: unknown[]) => mockCreateDirectSupportTicket(...args),
  getDirectSupportTickets: (...args: unknown[]) => mockGetDirectSupportTickets(...args),
  updateDirectSupportTicketStatus: (...args: unknown[]) => mockUpdateDirectSupportTicketStatus(...args),
}));

vi.mock('../../../src/utils/automationScheduling', () => ({
  buildSupportSlaDueAt: vi.fn(() => '2026-04-16T12:00:00.000Z'),
}));

import {
  createSupportTicket,
  getSupportTickets,
  getSupportTicketsForRelatedId,
  hydrateSupportTickets,
  updateSupportTicketStatus,
} from '../../../src/services/supportInbox';

describe('supportInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('creates a local support ticket with deterministic defaults and related-id lookup', () => {
    const ticket = createSupportTicket({
      topic: 'payment',
      subject: 'Charge dispute',
      detail: 'The amount is incorrect.',
      relatedId: 'ride-77',
    });

    expect(ticket.priority).toBe('high');
    expect(ticket.status).toBe('open');
    expect(ticket.slaDueAt).toBe('2026-04-16T12:00:00.000Z');
    expect(ticket.history[0]?.note).toBe('Support ticket created and waiting for review.');
    expect(getSupportTicketsForRelatedId('ride-77')).toHaveLength(1);
  });

  it('hydrates remote tickets into the local store with mapped history', async () => {
    mockGetDirectSupportTickets.mockResolvedValue([
      {
        ticket: {
          ticket_id: 'remote-1',
          topic: 'refund',
          subject: 'Refund request',
          detail: 'Please return the funds.',
          related_id: 'booking-9',
          route_label: 'Amman to Irbid',
          status: 'investigating',
          priority: 'urgent',
          channel: 'operations',
          resolution_summary: null,
          created_at: '2026-04-12T09:00:00.000Z',
          updated_at: '2026-04-12T09:30:00.000Z',
          sla_due_at: '2026-04-13T09:00:00.000Z',
        },
        events: [
          {
            event_id: 'event-1',
            status: 'investigating',
            note: 'Finance team reviewing the refund.',
            created_at: '2026-04-12T09:15:00.000Z',
          },
        ],
      },
    ]);

    const tickets = await hydrateSupportTickets('user-123');

    expect(mockGetDirectSupportTickets).toHaveBeenCalledWith('user-123');
    expect(tickets[0]).toMatchObject({
      id: 'remote-1',
      topic: 'refund',
      status: 'investigating',
      priority: 'urgent',
      channel: 'operations',
      relatedId: 'booking-9',
    });
    expect(tickets[0]?.history).toEqual([
      expect.objectContaining({
        id: 'event-1',
        note: 'Finance team reviewing the refund.',
      }),
    ]);
  });

  it('updates ticket status locally and forwards synced updates for backend-backed tickets', async () => {
    mockCreateDirectSupportTicket.mockResolvedValue({
      ticket: {
        ticket_id: 'remote-2',
        topic: 'package_issue',
        subject: 'Package arrived damaged',
        detail: 'Corner of the parcel is damaged.',
        status: 'open',
        priority: 'normal',
        channel: 'in_app',
        created_at: '2026-04-12T08:00:00.000Z',
        updated_at: '2026-04-12T08:00:00.000Z',
      },
      events: [
        {
          event_id: 'event-open',
          status: 'open',
          note: 'Support ticket created and waiting for review.',
          created_at: '2026-04-12T08:00:00.000Z',
        },
      ],
    });

    const created = createSupportTicket({
      userId: 'user-123',
      topic: 'package_issue',
      subject: 'Package arrived damaged',
      detail: 'Corner of the parcel is damaged.',
      relatedId: 'pkg-9',
    });

    await waitFor(() => {
      expect(getSupportTickets().some((ticket) => ticket.backendId === 'remote-2')).toBe(true);
    });

    mockUpdateDirectSupportTicketStatus.mockResolvedValue({
      ticket: {
        ticket_id: 'remote-2',
        topic: 'package_issue',
        subject: 'Package arrived damaged',
        detail: 'Corner of the parcel is damaged.',
        status: 'resolved',
        priority: 'high',
        channel: 'email',
        resolution_summary: 'Refund issued.',
        created_at: '2026-04-12T08:00:00.000Z',
        updated_at: '2026-04-12T10:00:00.000Z',
      },
      events: [
        {
          event_id: 'event-open',
          status: 'open',
          note: 'Support ticket created and waiting for review.',
          created_at: '2026-04-12T08:00:00.000Z',
        },
        {
          event_id: 'event-resolved',
          status: 'resolved',
          note: 'Refund approved.',
          created_at: '2026-04-12T10:00:00.000Z',
        },
      ],
    });

    const updated = updateSupportTicketStatus('remote-2', 'resolved', {
      note: 'Refund approved.',
      resolutionSummary: 'Refund issued.',
      priority: 'high',
      channel: 'email',
    });

    expect(updated).toMatchObject({
      status: 'resolved',
      priority: 'high',
      channel: 'email',
      resolutionSummary: 'Refund issued.',
    });
    expect(updated?.history.at(-1)?.note).toBe('Refund approved.');

    await waitFor(() => {
      expect(mockUpdateDirectSupportTicketStatus).toHaveBeenCalledWith(
        'remote-2',
        expect.objectContaining({
          status: 'resolved',
          note: 'Refund approved.',
          resolutionSummary: 'Refund issued.',
          priority: 'high',
          channel: 'email',
        }),
      );
    });
  });
});
