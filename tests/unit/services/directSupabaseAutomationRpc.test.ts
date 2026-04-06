import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();

vi.mock('../../../src/services/directSupabase/helpers', () => ({
  getDb: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock('../../../src/services/directSupabase/userContext.ts', () => ({
  buildUserContext: vi.fn(),
}));

import {
  createDirectSupportTicket,
  enqueueDirectAutomationJob,
  updateDirectSupportTicketStatus,
} from '../../../src/services/directSupabase/automation';

describe('direct Supabase automation RPCs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the hardened RPC for automation job enqueue requests', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        job_id: 'job-1',
        job_type: 'retention_nudge',
        payload: { reminderId: 'reminder-1' },
      },
      error: null,
    });

    const result = await enqueueDirectAutomationJob({
      userId: 'auth-user-1',
      jobType: 'retention_nudge',
      corridorId: 'amman-irbid',
      from: 'Amman',
      to: 'Irbid',
      payload: {
        reminderId: 'reminder-1',
      },
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'app_enqueue_automation_job',
      expect.objectContaining({
        p_job_type: 'retention_nudge',
        p_corridor_id: 'amman-irbid',
        p_origin_location: 'Amman',
        p_destination_location: 'Irbid',
      }),
    );
    expect(result).toMatchObject({
      job_id: 'job-1',
      job_type: 'retention_nudge',
    });
  });

  it('skips automation job enqueue work when there is no signed-in user', async () => {
    const result = await enqueueDirectAutomationJob({
      jobType: 'revenue_observe',
      from: 'Amman',
      to: 'Aqaba',
    });

    expect(result).toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('creates support tickets through the atomic RPC and returns the ticket timeline', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ticket: {
          ticket_id: 'ticket-1',
          subject: 'Payment issue',
          status: 'open',
        },
        events: [
          {
            event_id: 'event-1',
            note: 'Support ticket created and waiting for review.',
          },
        ],
      },
      error: null,
    });

    const result = await createDirectSupportTicket('auth-user-1', {
      topic: 'payment',
      subject: 'Payment issue',
      detail: 'Wallet debit looks wrong.',
      status: 'open',
      priority: 'high',
      channel: 'in_app',
      note: 'Support ticket created and waiting for review.',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'app_create_support_ticket',
      expect.objectContaining({
        p_topic: 'payment',
        p_subject: 'Payment issue',
      }),
    );
    expect(result).toEqual({
      ticket: expect.objectContaining({
        ticket_id: 'ticket-1',
        subject: 'Payment issue',
      }),
      events: [
        expect.objectContaining({
          event_id: 'event-1',
          note: 'Support ticket created and waiting for review.',
        }),
      ],
    });
  });

  it('updates support tickets through the atomic status RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        ticket: {
          ticket_id: 'ticket-1',
          status: 'resolved',
          resolution_summary: 'Refund issued.',
        },
        events: [
          {
            event_id: 'event-2',
            note: 'Ticket moved to resolved.',
          },
        ],
      },
      error: null,
    });

    const result = await updateDirectSupportTicketStatus('ticket-1', {
      status: 'resolved',
      note: 'Ticket moved to resolved.',
      resolutionSummary: 'Refund issued.',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'app_update_support_ticket_status',
      expect.objectContaining({
        p_ticket_id: 'ticket-1',
        p_status: 'resolved',
      }),
    );
    expect(result).toEqual({
      ticket: expect.objectContaining({
        ticket_id: 'ticket-1',
        status: 'resolved',
      }),
      events: [
        expect.objectContaining({
          event_id: 'event-2',
          note: 'Ticket moved to resolved.',
        }),
      ],
    });
  });
});
