import { renderHook, waitFor } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useLiveRide } from './useLiveRide';

jest.mock('../../lib/api');

describe('useLiveRide', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches live ride data successfully', async () => {
    const mockRide = {
      id: 'ride-123',
      driverId: 'driver-1',
      driverName: 'Ahmad Khalil',
      driverRating: 4.9,
      vehicleModel: 'Toyota Camry 2021',
      licensePlate: 'AMN 1234',
      status: 'driver_en_route' as const,
      eta: '12 min',
      distance: '4.2 km',
      fare: '5.50 JOD',
    };

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: mockRide,
      error: null,
      status: 200,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLiveRide('ride-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.ride).toEqual(mockRide);
    expect(apiClient.get).toHaveBeenCalledWith('rides/ride-123/live');
  });

  it('handles API errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLiveRide('ride-123'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() => useLiveRide('ride-123', false), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    expect(result.current.isLoading).toBe(true);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('refetches on demand', async () => {
    const mockRide = {
      id: 'ride-123',
      driverId: 'driver-1',
      driverName: 'Ahmad Khalil',
      driverRating: 4.9,
      vehicleModel: 'Toyota Camry 2021',
      licensePlate: 'AMN 1234',
      status: 'driver_en_route' as const,
      eta: '12 min',
      distance: '4.2 km',
      fare: '5.50 JOD',
    };

    (apiClient.get as jest.Mock).mockResolvedValue({
      data: mockRide,
      error: null,
      status: 200,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useLiveRide('ride-123'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledTimes(1);

    result.current.refresh();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  });
});