var mojibakePattern: RegExp | undefined;
var utf8Decoder: TextDecoder | undefined;
var windows1252Bytes: Map<string, number> | undefined;

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSuspiciousTokens() {
  return [
    '\uFFFD',
    'Ãƒ',
    'Ã‚Â©',
    'Ã‚Â·',
    'Ã‚Â±',
    'Ã¢â‚¬Â¦',
    'Ã¢â‚¬Â¢',
    'Ã¢Å“â€œ',
    'Ã¢Å“â€¦',
    'Ã¢â€ â€™',
    'Ã¢â‚¬â€œ',
    'Ã¢â‚¬â€',
    'Ã¢â‚¬',
    'Ã°Å¸',
    'Ã˜',
    'Ã™',
    'Ã¢â€â‚¬',
    'Ã¢Å¡',
  ] as const;
}

function getWellFormedTokensPattern() {
  return /[\u201C\u201D\u2018\u2019\u2013\u2014\u2026\u2022\u2713\u00A9\u00B1\u00B7]/u;
}

function getArabicPattern() {
  return /[\u0600-\u06FF]/u;
}

function getEmojiPattern() {
  return /[\u{1F300}-\u{1FAFF}]/u;
}

function getUtf8Decoder() {
  if (!utf8Decoder) {
    utf8Decoder = new TextDecoder('utf-8', { fatal: false });
  }

  return utf8Decoder;
}

function getWindows1252Bytes() {
  if (!windows1252Bytes) {
    windows1252Bytes = new Map<string, number>([
      ['â‚¬', 0x80],
      ['â€š', 0x82],
      ['Æ’', 0x83],
      ['â€ž', 0x84],
      ['â€¦', 0x85],
      ['â€ ', 0x86],
      ['â€¡', 0x87],
      ['Ë†', 0x88],
      ['â€°', 0x89],
      ['Å ', 0x8a],
      ['â€¹', 0x8b],
      ['Å’', 0x8c],
      ['Å½', 0x8e],
      ['â€˜', 0x91],
      ['â€™', 0x92],
      ['â€œ', 0x93],
      ['â€', 0x94],
      ['â€¢', 0x95],
      ['â€“', 0x96],
      ['â€”', 0x97],
      ['Ëœ', 0x98],
      ['â„¢', 0x99],
      ['Å¡', 0x9a],
      ['â€º', 0x9b],
      ['Å“', 0x9c],
      ['Å¾', 0x9e],
      ['Å¸', 0x9f],
    ]);
  }

  return windows1252Bytes;
}

function getMojibakePattern() {
  if (!mojibakePattern) {
    mojibakePattern = new RegExp(getSuspiciousTokens().map(escapeForRegex).join('|'), 'u');
  }

  return mojibakePattern;
}

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(
    Array.from(value, char => {
      const mappedByte = getWindows1252Bytes().get(char);
      if (typeof mappedByte === 'number') {
        return mappedByte;
      }

      const codePoint = char.codePointAt(0) ?? 0;
      return codePoint <= 0xff ? codePoint : 0x3f;
    }),
  );
  return getUtf8Decoder().decode(bytes);
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
  const pattern = getMojibakePattern();

  if (!pattern.test(value)) {
    score += 4;
  }

  if (getArabicPattern().test(value)) {
    score += 3;
  }

  if (getWellFormedTokensPattern().test(value)) {
    score += 2;
  }

  if (getEmojiPattern().test(value)) {
    score += 2;
  }

  if (containsControlCharacters(value)) {
    score -= 4;
  }

  const mojibakeHits = value.match(pattern)?.length ?? 0;
  score -= mojibakeHits * 3;

  return score;
}

export function containsLikelyMojibake(value: string): boolean {
  return getMojibakePattern().test(value);
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
