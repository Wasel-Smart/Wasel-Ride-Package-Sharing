const MOJIBAKE_PATTERN =
  /(?:\uFFFD|Ã.|Â©|Â·|Â±|â€¦|â€¢|âœ“|âœ…|â†’|â€“|â€”|â€|ðŸ|Ø|Ù|â”€|âš|â€')/u;

const UTF8_DECODER = new TextDecoder('utf-8', { fatal: false });

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(
    Array.from(value, (char) => char.charCodeAt(0) & 0xff),
  );
  return UTF8_DECODER.decode(bytes);
}

function scoreTextQuality(value: string): number {
  let score = 0;

  if (!MOJIBAKE_PATTERN.test(value)) {
    score += 4;
  }

  if (/[\u0600-\u06FF]/u.test(value)) {
    score += 3;
  }

  if (/[“”‘’–—…•✓©±]/u.test(value)) {
    score += 2;
  }

  if (/[\u{1F300}-\u{1FAFF}]/u.test(value)) {
    score += 2;
  }

  const mojibakeHits = value.match(MOJIBAKE_PATTERN)?.length ?? 0;
  score -= mojibakeHits * 3;

  return score;
}

export function containsLikelyMojibake(value: string): boolean {
  return MOJIBAKE_PATTERN.test(value);
}

export function repairLikelyMojibake(value: string): string {
  if (!containsLikelyMojibake(value)) {
    return value;
  }

  try {
    const repaired = decodeLatin1AsUtf8(value);
    return scoreTextQuality(repaired) > scoreTextQuality(value)
      ? repaired
      : value;
  } catch {
    return value;
  }
}

export function normalizeTextTree<T>(value: T): T {
  if (typeof value === 'string') {
    return repairLikelyMojibake(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTextTree(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeTextTree(item),
      ]),
    ) as T;
  }

  return value;
}
