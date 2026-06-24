import api from '../utils/api';

export interface Package {
  id: string;
  tracking_number: string;
  origin_name: string;
  destination_name: string;
  status: string;
  delivery_fee: number;
  created_at: string;
}

export interface CreatePackageInput {
  originCity: string;
  originCoords: { lat: number; lng: number };
  destinationCity: string;
  destinationCoords: { lat: number; lng: number };
  receiverName: string;
  receiverPhone: string;
  size: 'small' | 'medium' | 'large' | 'extra_large';
  weight?: number;
  description?: string;
  declaredValue?: number;
  fragile?: boolean;
}

export async function createPackage(input: CreatePackageInput) {
  const response = await api.post('/packages', input);
  return response as { data: Package };
}

export async function getPackage(id: string) {
  const response = await api.get(`/packages/${id}`);
  return response as { data: Package };
}

export async function getMyPackages() {
  const response = await api.get('/packages/sender/me');
  return response as { data: Package[] };
}

export async function updatePackageStatus(id: string, status: string, carrierId?: string) {
  const response = await api.post(`/packages/${id}/status`, { status, carrierId });
  return response as { data: Package };
}

export async function assignToTrip(packageId: string, tripId: string) {
  const response = await api.post(`/packages/${packageId}/assign-to-trip`, { tripId });
  return response as { data: Package };
}
