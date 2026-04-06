/**
 * API Versioning Strategy
 * Defines how API versions are managed and validated
 */

/**
 * API version type
 */
export type APIVersion = 'v1' | 'v2' | string;

/**
 * API Versioning configuration
 */
export const API_VERSIONING = {
  current: 'v1' as APIVersion,
  supported: ['v1'] as APIVersion[],
  deprecated: [] as APIVersion[],
  changelog: {
    v1: {
      releaseDate: '2024-01-01',
      status: 'stable',
      breaking_changes: [],
      new_features: [
        'Trip search and booking',
        'Payment processing',
        'Driver ratings',
        'Push notifications',
      ],
      removals: [],
    },
  } as Record<APIVersion, {
    releaseDate: string;
    status: 'alpha' | 'beta' | 'stable' | 'deprecated';
    breaking_changes: string[];
    new_features: string[];
    removals: string[];
  }>,
} as const;

/**
 * Get API endpoint with version
 */
export function getApiEndpoint(path: string, version?: APIVersion): string {
  const v = version || API_VERSIONING.current;
  const baseUrl = import.meta.env.VITE_API_URL || '/api';

  // If path already includes version, don't add it again
  if (path.startsWith('/v1') || path.startsWith('/v2')) {
    return `${baseUrl}${path}`;
  }

  return `${baseUrl}/${v}${path}`;
}

/**
 * Check if version is supported
 */
export function isSupportedVersion(version: APIVersion): boolean {
  return API_VERSIONING.supported.includes(version);
}

/**
 * Get migration guide for deprecated version
 */
export function getMigrationGuide(fromVersion: APIVersion, toVersion?: APIVersion): string {
  const target = toVersion || API_VERSIONING.current;

  if (!API_VERSIONING.deprecated.includes(fromVersion)) {
    return `Version ${fromVersion} is still supported. No migration needed.`;
  }

  const guide = `
Migration Guide: ${fromVersion} → ${target}

Deprecated Version: ${fromVersion}
Target Version: ${target}

⚠️ Breaking Changes:
${API_VERSIONING.changelog[target]?.breaking_changes?.map((c) => `  - ${c}`).join('\n') || 'None'}

✨ New Features:
${API_VERSIONING.changelog[target]?.new_features?.map((f) => `  - ${f}`).join('\n') || 'None'}

Updated Endpoints:
- Search: POST /api/${target}/trips/search
- Book: POST /api/${target}/bookings/create
- Payment: POST /api/${target}/payments/create

For detailed migration guide, see: https://docs.wasel.jo/api/migration/${fromVersion}-to-${target}
  `;

  return guide.trim();
}

/**
 * API request helper with version handling
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { version?: APIVersion },
): Promise<T> {
  const { version, ...requestOptions } = options || {};
  const url = getApiEndpoint(path, version);

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Version': version || API_VERSIONING.current,
      ...requestOptions?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get version compatibility matrix
 */
export function getCompatibilityMatrix(): Record<string, {
  minVersion: APIVersion;
  maxVersion: APIVersion;
  notes?: string;
}> {
  return {
    'mobile-app': {
      minVersion: 'v1',
      maxVersion: API_VERSIONING.current,
      notes: 'Supports latest version',
    },
    'web-app': {
      minVersion: 'v1',
      maxVersion: API_VERSIONING.current,
      notes: 'Frontend auto-updates',
    },
    'third-party-integrations': {
      minVersion: 'v1',
      maxVersion: 'v1',
      notes: 'Partners must migrate before deprecation',
    },
  };
}

/**
 * Document version header requirements
 */
export const API_VERSION_HEADERS = {
  request: {
    'X-API-Version': 'API version being used (format: v1, v2, etc.)',
    'X-Client-Version': 'Client application version',
    'X-Client-Type': 'Client type (web, mobile-ios, mobile-android)',
  },
  response: {
    'X-API-Version': 'API version that served the request',
    'X-API-Deprecation': 'Deprecation notice if applicable',
    'X-API-Sunset': 'Date when version will be removed (RFC 8594)',
  },
} as const;
