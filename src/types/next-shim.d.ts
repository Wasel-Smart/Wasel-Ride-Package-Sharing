declare module 'next/server' {
  export type NextRequest = {
    cookies: {
      getAll(): Array<{ name: string; value: string }>;
      set(name: string, value: string): void;
    };
    nextUrl: {
      pathname: string;
      clone(): { pathname: string };
    };
  };

  export const NextResponse: {
    next(init?: unknown): {
      cookies: {
        set(name: string, value: string, options?: unknown): void;
        getAll(): Array<{ name: string; value: string; options?: unknown }>;
      };
    };
    redirect(url: unknown): unknown;
  };
}

declare module 'next/headers' {
  export function cookies(): Promise<{
    getAll(): Array<{ name: string; value: string }>;
    set(name: string, value: string, options?: unknown): void;
  }>;
}
