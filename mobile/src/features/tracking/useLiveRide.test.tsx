import React from 'react';
import { Button, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useLiveRide } from './useLiveRide';

jest.mock('../../lib/api');

function TestHarness({ onResult }: { onResult: (result: ReturnType<typeof useLiveRide>) => void }) {
  const result = useLiveRide('ride-123');

  React.useEffect(() => {
    onResult(result);
  }, [onResult, result]);

  return (
    <View testID="live-ride-harness">
      <Button title="refresh" onPress={result.refresh} testID="refresh-live-ride" />
    </View>
  );
}

describe('useLiveRide', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
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

    const onResult = jest.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <TestHarness onResult={onResult} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ isSuccess: true, ride: mockRide }));
    });

    expect(apiClient.get).toHaveBeenCalledWith('rides/ride-123/live');
  });

  it('handles API errors gracefully', async () => {
    (apiClient.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const onResult = jest.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <TestHarness onResult={onResult} />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ isError: true }));
    });

    expect(onResult.mock.calls.at(-1)?.[0].error).toBeInstanceOf(Error);
  });

  it('does not fetch when disabled', async () => {
    const DisabledHarness = () => {
      const result = useLiveRide('ride-123', false);
      React.useEffect(() => {
        onResult(result);
      }, [result]);
      return <View testID="disabled-live-ride-harness" />;
    };

    const onResult = jest.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <DisabledHarness />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ isLoading: true }));
    });
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

    const onResult = jest.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <TestHarness onResult={onResult} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    fireEvent.press(screen.getByTestId('refresh-live-ride'));

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  });
});
