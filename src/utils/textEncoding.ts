const SUSPICIOUS_TOKENS = [
  '\uFFFD',
  'Ã',
  'Â©',
  'Â·',
  'Â±',
  'â€¦',
  'â€¢',
  'âœ“',
  'âœ…',
  'â†’',
  'â€“',
  'â€”',
  'â€',
  'ðŸ',
  'Ø',
  'Ù',
  'â”€',
  'âš',
] as const;

const WELL_FORMED_TOKENS = /[“”‘’–—…•✓©±·]/u;
const ARABIC_PATTERN = /[\u0600-\u06FF]/u;
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}]/u;
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: false });
const WINDOWS_1252_BYTES = new Map<string, number>([
  ['€', 0x80],
  ['‚', 0x82],
  ['ƒ', 0x83],
  ['„', 0x84],
  ['…', 0x85],
  ['†', 0x86],
  ['‡', 0x87],
  ['ˆ', 0x88],
  ['‰', 0x89],
  ['Š', 0x8a],
  ['‹', 0x8b],
  ['Œ', 0x8c],
  ['Ž', 0x8e],
  ['‘', 0x91],
  ['’', 0x92],
  ['“', 0x93],
  ['”', 0x94],
  ['•', 0x95],
  ['–', 0x96],
  ['—', 0x97],
  ['˜', 0x98],
  ['™', 0x99],
  ['š', 0x9a],
  ['›', 0x9b],
  ['œ', 0x9c],
  ['ž', 0x9e],
  ['Ÿ', 0x9f],
]);

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MOJIBAKE_PATTERN = new RegExp(SUSPICIOUS_TOKENS.map(escapeForRegex).join('|'), 'u');

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(
    Array.from(value, char => {
      const mappedByte = WINDOWS_1252_BYTES.get(char);
      if (typeof mappedByte === 'number') {
        return mappedByte;
      }

      const codePoint = char.codePointAt(0) ?? 0;
      return codePoint <= 0xff ? codePoint : 0x3f;
    }),
  );
  return UTF8_DECODER.decode(bytes);
}

function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? -1;
    if ((codePoint >= 0x00 && codePoint <= 0x1f) || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      return true;
    }
  }

  return false;
}

function scoreTextQuality(value: string): number {
  let score = 0;

  if (!MOJIBAKE_PATTERN.test(value)) {
    score += 4;
  }

  if (ARABIC_PATTERN.test(value)) {
    score += 3;
  }

  if (WELL_FORMED_TOKENS.test(value)) {
    score += 2;
  }

  if (EMOJI_PATTERN.test(value)) {
    score += 2;
  }

  if (containsControlCharacters(value)) {
    score -= 4;
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

  const candidates = [value];

  try {
    const decoded = decodeLatin1AsUtf8(value);
    candidates.push(decoded);

    if (containsLikelyMojibake(decoded)) {
      candidates.push(decodeLatin1AsUtf8(decoded));
    }
  } catch {
    return value;
  }

  return candidates.reduce((best, candidate) =>
    scoreTextQuality(candidate) > scoreTextQuality(best) ? candidate : best,
  );
}

export function normalizeTextTree<T>(value: T): T {
  if (typeof value === 'string') {
    return repairLikelyMojibake(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeTextTree(item)) as T;
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
