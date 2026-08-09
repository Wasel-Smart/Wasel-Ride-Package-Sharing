declare module 'https://esm.sh/@supabase/supabase-js@2' {
  const value: any;
  export default value;
  export const createClient: any;
}

declare module 'https://deno.land/x/postgres@v0.19.3/mod.ts' {
  const value: any;
  export default value;
  export const Client: any;
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  const value: any;
  export default value;
  export const serve: any;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.39.0' {
  const value: any;
  export default value;
  export const createClient: any;
}

declare module 'https://deno.land/x/zod@v3.23.8/mod.ts' {
  const z: any;
  namespace z {
    export interface ZodSchema<T> {}
    export function infer<T>(schema: unknown): T;
    export function object<T>(shape: T): unknown;
    export function string(): unknown;
    export function number(): unknown;
    export function enum_<T>(values: readonly T[]): unknown;
    export function refine<T>(check: (value: T) => boolean, message: string): unknown;
    export function datetime(options?: { offset?: boolean }): unknown;
    export function int(): unknown;
    export function finite(): unknown;
    export function min(limit: number, message?: string): unknown;
    export function max(limit: number, message?: string): unknown;
    export function uuid(message?: string): unknown;
    export function optional<T>(schema: unknown): unknown;
    export function nullable<T>(schema: unknown): unknown;
    export function default_<T>(value: T): unknown;
    export function regex(regex: RegExp, message?: string): unknown;
    export function trim(): unknown;
    export function maxLength(limit: number, message?: string): unknown;
  }
  export default z;
  export { z };
}

declare module 'npm:@supabase/supabase-js@2' {
  const value: any;
  export default value;
  export const createClient: any;
}

declare module 'npm:@supabase/supabase-js@2.36.0' {
  const value: any;
  export default value;
  export const createClient: any;
}

declare module 'npm:stripe@12.12.0' {
  const value: any;
  export default value;
  export const Stripe: any;
}
