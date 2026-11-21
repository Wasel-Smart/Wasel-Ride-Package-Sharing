import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

const ROOT = resolve(__dirname, '../..');
const CONTRACTS_DIR = resolve(ROOT, 'api-contracts');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

type OpenApiDocument = {
  openapi?: string;
  info?: { title?: string; version?: string };
  servers?: Array<{ url?: string }>;
  paths?: Record<string, Record<string, unknown>>;
  components?: Record<string, unknown>;
};

function contractFiles(): string[] {
  return readdirSync(CONTRACTS_DIR)
    .filter((name) => name.endsWith('.openapi.yaml'))
    .sort();
}

function loadContract(file: string): OpenApiDocument {
  return load(readFileSync(resolve(CONTRACTS_DIR, file), 'utf8')) as OpenApiDocument;
}

function resolveRef(doc: OpenApiDocument, ref: string): unknown {
  if (!ref.startsWith('#/')) {
    return null;
  }
  const segments = ref
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = doc;
  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return current;
}

function collectRefs(node: unknown, refs: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectRefs(item, refs);
    }
    return refs;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === '$ref' && typeof value === 'string') {
        refs.push(value);
      } else {
        collectRefs(value, refs);
      }
    }
  }
  return refs;
}

const files = contractFiles();

describe('api-contracts/*.openapi.yaml are present', () => {
  it('declares at least the four core service contracts', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const service of ['booking-service', 'trip-service', 'package-service', 'wallet-service']) {
      expect(files).toContain(`${service}.openapi.yaml`);
    }
  });
});

describe.each(files)('%s', (file) => {
  const doc = loadContract(file);

  it('declares OpenAPI 3.x', () => {
    expect(doc.openapi).toMatch(/^3\./);
  });

  it('has info.title and info.version', () => {
    expect(doc.info?.title).toBeTruthy();
    expect(doc.info?.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('declares at least one server', () => {
    expect(Array.isArray(doc.servers)).toBe(true);
    expect((doc.servers?.length ?? 0)).toBeGreaterThan(0);
    for (const server of doc.servers ?? []) {
      expect(server.url).toBeTruthy();
    }
  });

  it('declares a BearerAuth security scheme', () => {
    const schemes = doc.components?.securitySchemes as Record<string, { type?: string; scheme?: string }> | undefined;
    const bearer = Object.values(schemes ?? {}).find((scheme) => scheme.scheme === 'bearer');
    expect(bearer).toBeDefined();
  });

  it('server URL base path matches the contract file name', () => {
    const expectedService = file.replace('.openapi.yaml', '');
    const primary = doc.servers?.[0]?.url ?? '';
    expect(primary).toContain(`/functions/v1/${expectedService}`);
  });

  describe('paths', () => {
    const paths = doc.paths ?? {};

    it('declares at least one path that starts with "/"', () => {
      const keys = Object.keys(paths);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(key.startsWith('/')).toBe(true);
      }
    });

    it('every operation documents responses and a unique operationId', () => {
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const [path, operations] of Object.entries(paths)) {
        for (const method of HTTP_METHODS) {
          const operation = operations[method] as Record<string, unknown> | undefined;
          if (!operation) {
            continue;
          }
          expect(operation.responses, `${method.toUpperCase()} ${path} missing responses`).toBeTruthy();
          expect(Object.keys(operation.responses as Record<string, unknown>).length).toBeGreaterThan(0);

          const operationId = operation.operationId;
          expect(typeof operationId, `${method.toUpperCase()} ${path} missing operationId`).toBe('string');
          if (typeof operationId === 'string') {
            if (seen.has(operationId)) {
              duplicates.push(operationId);
            } else {
              seen.add(operationId);
            }
          }
        }
      }
      expect(duplicates).toEqual([]);
    });

    it('every $ref resolves within the document', () => {
      const refs = collectRefs(doc);
      expect(refs.length).toBeGreaterThan(0);
      const unresolved = refs.filter((ref) => resolveRef(doc, ref) === null);
      expect(unresolved).toEqual([]);
    });
  });
});