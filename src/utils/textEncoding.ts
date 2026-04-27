let mojibakePattern: RegExp | undefined;
let utf8Decoder: TextDecoder | undefined;
let windows1252ByteByChar: Map<string, number> | undefined;

type UnknownRecord = Record<string, unknown>;

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSuspiciousTokens() {
  return [
    '\uFFFD',
    'Â',
    'Ã',
    'Ø',
    'Ù',
    'â€',
    'ðŸ',
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

function getWindows1252ByteByChar() {
  if (!windows1252ByteByChar) {
    windows1252ByteByChar = new Map<string, number>([
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
  }

  return windows1252ByteByChar;
}

function getMojibakePattern() {
  if (!mojibakePattern) {
    mojibakePattern = new RegExp(getSuspiciousTokens().map(escapeForRegex).join('|'), 'u');
  }

  return mojibakePattern;
}

function decodeLatin1AsUtf8(value: string): string {
  const bytes = Uint8Array.from(
    Array.from(value, (char) => {
      const mappedByte = getWindows1252ByteByChar().get(char);
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
    return value.map((item) => normalizeTextTree(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as UnknownRecord).map(([key, item]) => [
        key,
        normalizeTextTree(item),
      ]),
    ) as T;
  }

  return value;
}
