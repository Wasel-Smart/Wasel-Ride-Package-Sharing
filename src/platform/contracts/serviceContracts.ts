import serviceContracts from './service-contracts.json';

export interface ApiOperationContract {
  authentication: 'public' | 'jwt';
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
  operationId: string;
  path: string;
  summary: string;
}

export interface ServiceContract {
  name: 'analytics' | 'auth' | 'notifications' | 'trips' | 'wallet';
  operations: ApiOperationContract[];
  ownership: string;
  version: string;
}

export const SERVICE_CONTRACTS: ServiceContract[] = serviceContracts as ServiceContract[];
