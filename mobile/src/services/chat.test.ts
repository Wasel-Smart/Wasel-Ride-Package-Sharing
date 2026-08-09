jest.mock('../lib/config', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('./auth', () => ({
  mobileAuth: {
    getUser: jest.fn(),
  },
}));

import { supabase } from '../lib/config';
import { mobileAuth } from './auth';
import { MobileChatService } from './chat';

const mockSupabase = supabase as unknown as {
  auth: { getUser: jest.Mock };
  from: jest.Mock;
  channel: jest.Mock;
  removeChannel: jest.Mock;
};

const mockMobileAuth = mobileAuth as unknown as {
  getUser: jest.Mock;
};

function createMessagesQuery(result: { data: unknown; error: unknown }) {
  const limit = jest.fn().mockResolvedValue(result);
  const order = jest.fn().mockReturnValue({ limit });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq });

  return { select, eq, order, limit };
}

function createMaybeSingleQuery(result: { data: unknown; error?: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ maybeSingle });
  const select = jest.fn().mockReturnValue({ eq });

  return { select, eq, maybeSingle };
}

function createParticipantQuery(result: { data: unknown; error?: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const limit = jest.fn().mockReturnValue({ single });
  const or = jest.fn().mockReturnValue({ limit });
  const eq = jest.fn().mockReturnValue({ or });
  const select = jest.fn().mockReturnValue({ eq });

  return { select, eq, or, limit, single };
}

function createInsertQuery(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ single });
  const insert = jest.fn().mockReturnValue({ select });

  return { insert, select, single };
}

describe('MobileChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    mockMobileAuth.getUser.mockReturnValue({ id: 'user-1' });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSupabase.removeChannel.mockResolvedValue('ok');
  });

  it('loads trip messages newest-first from Supabase and returns them chronologically', async () => {
    const query = createMessagesQuery({
      data: [
        {
          id: 'm2',
          trip_id: 'trip-1',
          sender_id: 'driver-1',
          content: 'Second',
          type: 'text',
          read_by: [],
          created_at: '2026-07-20T10:02:00.000Z',
          sender: { full_name: 'Ahmad' },
        },
        {
          id: 'm1',
          trip_id: 'trip-1',
          sender_id: 'user-1',
          content: 'First',
          type: 'text',
          read_by: ['user-1'],
          created_at: '2026-07-20T10:01:00.000Z',
          sender: { full_name: 'Passenger' },
        },
      ],
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(query);

    const messages = await new MobileChatService().getMessages('trip-1');

    expect(mockSupabase.from).toHaveBeenCalledWith('messages');
    expect(query.eq).toHaveBeenCalledWith('trip_id', 'trip-1');
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(messages.map(message => message.id)).toEqual(['m1', 'm2']);
    expect(messages[1]).toMatchObject({
      senderName: 'Ahmad',
      content: 'Second',
      readBy: [],
    });
  });

  it('sends an authenticated passenger message through the messages table', async () => {
    const tripQuery = createParticipantQuery({
      data: {
        driver_id: 'driver-1',
        bookings: [{ passenger_id: 'user-1' }],
      },
      error: null,
    });
    const insertQuery = createInsertQuery({
      data: {
        id: 'm3',
        trip_id: 'trip-1',
        sender_id: 'user-1',
        content: 'I am ready',
        type: 'text',
        metadata: {},
        read_by: ['user-1'],
        created_at: '2026-07-20T10:03:00.000Z',
      },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(tripQuery).mockReturnValueOnce(insertQuery);

    const message = await new MobileChatService().sendMessage({
      tripId: 'trip-1',
      content: '  I am ready  ',
    });

    expect(tripQuery.eq).toHaveBeenCalledWith('id', 'trip-1');
    expect(tripQuery.or).toHaveBeenCalledWith(
      expect.stringContaining('driver_id.eq.user-1'),
    );
    expect(tripQuery.limit).toHaveBeenCalledWith(1);
    expect(insertQuery.insert).toHaveBeenCalledWith({
      trip_id: 'trip-1',
      sender_id: 'user-1',
      content: 'I am ready',
      type: 'text',
      metadata: {},
      read_by: ['user-1'],
    });
    expect(message).toMatchObject({
      id: 'm3',
      tripId: 'trip-1',
      senderId: 'user-1',
      content: 'I am ready',
    });
  });

  it('rejects sending when no authenticated user is available', async () => {
    mockMobileAuth.getUser.mockReturnValue(null);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      new MobileChatService().sendMessage({ tripId: 'trip-1', content: 'Hello' }),
    ).rejects.toThrow('User not authenticated');
  });

  it('marks unread messages as read for the current user', async () => {
    const inQuery = jest.fn().mockResolvedValue({
      data: [
        { id: 'm1', read_by: [] },
        { id: 'm2', read_by: ['user-1'] },
      ],
      error: null,
    });
    const select = jest.fn().mockReturnValue({ in: inQuery });
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq: updateEq });
    mockSupabase.from.mockReturnValueOnce({ select }).mockReturnValueOnce({ update });

    await new MobileChatService().markAsRead(['m1', 'm2', 'm1']);

    expect(inQuery).toHaveBeenCalledWith('id', ['m1', 'm2']);
    expect(update).toHaveBeenCalledWith({
      read_by: ['user-1'],
      read_at: expect.any(String),
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'm1');
  });

  it('subscribes to realtime trip changes, fetches the changed row, and removes the channel', async () => {
    let changeHandler: ((payload: { new?: { id?: string } }) => Promise<void>) | undefined;
    const channel: { on: jest.Mock; subscribe: jest.Mock } = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    const subscribe = jest.fn().mockReturnValue(channel);
    const on: jest.Mock = jest.fn((_event, _filter, handler) => {
      changeHandler = handler;
      return { on, subscribe };
    });
    channel.on = on;
    channel.subscribe = subscribe;
    mockSupabase.channel.mockReturnValue(channel);

    const single = jest.fn().mockResolvedValue({
      data: {
        id: 'm4',
        trip_id: 'trip-1',
        sender_id: 'driver-1',
        content: 'I arrived',
        type: 'text',
        read_by: [],
        created_at: '2026-07-20T10:04:00.000Z',
        sender: { full_name: 'Ahmad' },
      },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ single });
    const select = jest.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const onMessage = jest.fn();
    const unsubscribe = new MobileChatService().subscribeToTrip('trip-1', onMessage);
    await changeHandler?.({ new: { id: 'm4' } });
    unsubscribe();

    expect(mockSupabase.channel).toHaveBeenCalledWith(
      'mobile-trip-messages-trip-1',
      { config: { broadcast: { self: false } } },
    );
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: 'trip_id=eq.trip-1',
      },
      expect.any(Function),
    );
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'm4' }));
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
