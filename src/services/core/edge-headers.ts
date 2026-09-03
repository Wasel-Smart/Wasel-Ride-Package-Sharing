import { publicAnonKey } from './api-resolver';
import { addCSRFHeader } from '../../utils/csrf';

export function createEdgeHeaders(
  headers?: HeadersInit,
  userToken?: string,
  includeCSRF = true,
): Headers {
  let headersInit = headers ?? {};

  if (includeCSRF) {
    headersInit = addCSRFHeader(headersInit);
  }

  const finalHeaders = new Headers(headersInit);

  if (publicAnonKey && !finalHeaders.has('apikey')) {
    finalHeaders.set('apikey', publicAnonKey);
  }

  if (userToken) {
    finalHeaders.set('Authorization', `Bearer ${userToken}`);
  }

  return finalHeaders;
}
