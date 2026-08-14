import api from '../utils/api';

export interface Rating {
  id: string;
  rater_id: string;
  target_id: string;
  target_type: 'driver' | 'passenger' | 'bus_operator';
  trip_id?: string;
  score: number;
  comment?: string;
  tags?: string[];
  created_at: string;
}

export async function createRating(input: {
  targetId: string;
  targetType: 'driver' | 'passenger' | 'bus_operator';
  tripId?: string;
  score: number;
  comment?: string;
  tags?: string[];
}) {
  const response = await api.post('/v1/ratings', input);
  return response as { data: Rating };
}

export async function getTripRatings(tripId: string) {
  const response = await api.get(`/v1/ratings/trip/${tripId}`);
  return response as { data: Rating[] };
}
