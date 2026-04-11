export function omitUndefined<T extends Record<string, unknown>>(value: T) {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return Object.fromEntries(entries) as {
    [K in keyof T as undefined extends T[K] ? never : K]: Exclude<T[K], undefined>;
  } & Partial<{
    [K in keyof T as undefined extends T[K] ? K : never]: Exclude<T[K], undefined>;
  }>;
}
