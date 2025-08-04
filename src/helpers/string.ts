import { toArabic } from 'roman-numerals';
import { remove as removeDiacritics } from 'diacritics';

import * as constants from '@/helpers/constants';
import { ERYMEntityCode } from '@/helpers/enums';

const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000,
};

export function wordsToNumbers(text: string): number | null {
  const words = text.toLowerCase().replace(/[^a-z\s-]/g, '').split(/[\s-]+/);
  let result = 0;
  let current = 0;

  for (const word of words) {
    const value = WORD_NUMBERS[word];
    if (value != null) {
      if (value === 100 || value === 1000) {
        current *= value;
      } else {
        current += value;
      }
    } else if (current) {
      result += current;
      current = 0;
    }
  }

  result += current;
  return result || null;
}

export function removeBrackets(str: string) {
  return str.replace(/^\[(.*)\]$/, '$1');
}

export function checkPartialStringsMatch(str1: string, str2: string, options: {
  allowEmpty?: boolean;
  ignoreCase?: boolean;
  edgesOnly?: boolean;
  startOnly?: boolean;
  endOnly?: boolean;
} = {}): boolean {
  const {
    allowEmpty = false,
    ignoreCase = true,
    edgesOnly = true,
    startOnly = false,
    endOnly = false,
  } = options;

  // Handle empty strings
  if (allowEmpty) {
    if (str1 === str2) return true;
    if (!str1 || !str2) return false;
  }

  // Apply case normalization if needed
  const s1 = ignoreCase ? str1.toLowerCase() : str1;
  const s2 = ignoreCase ? str2.toLowerCase() : str2;

  // Exact match - always return true
  if (s1 === s2) return true;

  // Word boundary matching using string methods
  const startsWithWordBoundary = s1.startsWith(s2 + ' ') || s2.startsWith(s1 + ' ');
  const endsWithWordBoundary = s1.endsWith(' ' + s2) || s2.endsWith(' ' + s1);

  if (startOnly) {
    return startsWithWordBoundary;
  }

  if (endOnly) {
    return endsWithWordBoundary;
  }

  if (edgesOnly) {
    return startsWithWordBoundary || endsWithWordBoundary;
  }

  // Default: substring matching
  return s1.includes(s2) || s2.includes(s1);
}

export function extractNumbers(str: string): string {
  return str.match(/\d+/g)?.join('') || '';
}

export function shortenNumber(num: number): string {
  if (num >= 1000000) {
    return parseFloat((num / 1000000).toFixed(1)) + 'M';
  } else if (num >= 1000) {
    return parseFloat((num / 1000).toFixed(1)) + 'k';
  } else {
    return num.toString();
  }
};

export function generateSearchUrl({
  artist = '',
  releaseTitle = '',
  trackTitle = '',
} = {}, strictSearch = true) {
  let url = 'https://rateyourmusic.com';

  const query = [artist, releaseTitle, trackTitle]
    .filter(Boolean)
    .join(' ');
  let searchterm: string;

  if (!query) {
    return '';
  } else {
    searchterm = encodeURIComponent(query);
    url += '/search?';
    url += `searchterm=${searchterm}`;
  }

  if (trackTitle) url += `&searchtype=${ERYMEntityCode.Song}`;
  else if (releaseTitle) url += `&searchtype=${ERYMEntityCode.Release}`;
  else if (artist) url += `&searchtype=${ERYMEntityCode.Artist}`;

  // Strict search results are provided by this addon and are not a part of RYM functionality
  if (strictSearch) url += '&strict=true';

  if (artist) url += `&enh_artist=${encodeURIComponent(artist)}`;
  if (releaseTitle) url += `&enh_release=${encodeURIComponent(releaseTitle)}`;
  if (trackTitle) url += `&enh_track=${encodeURIComponent(trackTitle)}`;

  return url;
}

export function generateSearchHint(items: string[]) {
  return `Search for "${items.join(' - ')}" on RateYourMusic`;
}

export interface Deburr {
  (string: string): string;
}

export const deburr: Deburr = function(string: string): string {
  return removeDiacritics(string);
}

export function deburrLight(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export interface NormalizeForSearch {
  (str: string): string;
}

export function normalizeForSearch(str: string): string {
  if (!str) return '';

  return deburr(str
    .toLowerCase()
    .replace(/\s&\s/g, ' and ')
    .replace(/\./g, '')
    .replace(/_/g, '')
    .replace(/"/g, '')
    .replace(/ - /g, ' ')
    .replace(/'/g, '')
    .replace(/\s\/\s/g, ' ')
    .replace(/\//g, ' ')
    .replace(/’/g, '')
    .replace(/\\/g, '')
    .replace(/:/g, '')
    .replace(/,/g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ pt /g, ' part ')
    .replace(/ vol /g, ' volume ')
    .trim()
  );
}

export function cleanupReleaseEdition(releaseTitle: string): string {
  if (!releaseTitle) return '';

  return releaseTitle
    .replace(constants.SUFFIX_EDITION_KEYWORDS_PATTERN, '')
    .trim();
}

export function cleanupSuffix(releaseTitle: string, pattern?: RegExp): string {
  if (!releaseTitle) return '';

  return releaseTitle
    .replace(pattern || constants.SUFFIX_PATTERN, '')
    .trim();
}

export function matchSuffix(title: string, pattern?: RegExp): string {
  const match = title.match(pattern || constants.SUFFIX_PATTERN);
  return match ? match[1] : '';
}

export function extractReleaseSuffixType(suffix: string, keywords: string[]): Set<string> {
  const lower = suffix.toLowerCase();
  const results = new Set<string>();

  for (const keyword of keywords) {
    if (lower.includes(keyword)) {
      results.add(keyword);
    }
  }

  return results;
}

export function extractReleaseSuffixNumericValue(value: string): number | null {
  if (!value) return null;

  // Strip keywords
  const cleaned = value
    .toLowerCase()
    .trim()
    .replace(/\./g, '')
    .replace('pt ', 'part ')
    .replace('vol ', 'volume ')
    .replace(new RegExp(constants.NUMBERED_KEYWORDS.join('|'), 'g'), '')
    .trim();

  // Try direct number
  if (!isNaN(Number(cleaned))) return Number(cleaned);

  // Try Roman numeral
  try {
    const roman = toArabic(cleaned.toUpperCase());
    if (roman) return roman;
  } catch {}

  // Try word-number
  const wordParsed = wordsToNumbers(cleaned);
  if (typeof wordParsed === 'number' && !isNaN(wordParsed)) return wordParsed;

  return null;
}


export interface ReleaseTitleExtras {
  value: string;
  normalized: string;
  suffix: string;
  noSuffix: string;
  noSuffixNormalized: string;
  editionSuffix: string;
  editionSuffixType: Set<string>;
  numericSuffix: string;
  numericSuffixType: Set<string>;
  numericSuffixValue: number | null;
}

export function getReleaseTitleExtras(value: string): ReleaseTitleExtras {
  const cache = new Map<string, any>();

  const memoize = <T>(key: string, fn: () => T): T => {
    if (!cache.has(key)) {
      cache.set(key, fn());
    }
    return cache.get(key);
  };

  return {
    value,
    get normalized() {
      return memoize('normalized', () => normalizeForSearch(value));
    },

    get editionSuffix() {
      return memoize('editionSuffix', () => matchSuffix(value, constants.SUFFIX_EDITION_KEYWORDS_PATTERN));
    },
    get editionSuffixType() {
      return memoize('editionSuffixType', () => extractReleaseSuffixType(this.editionSuffix, constants.EDITION_KEYWORDS));
    },

    get numericSuffix() {
      return memoize('numericSuffix', () => matchSuffix(value, constants.SUFFIX_NUMBERED_KEYWORDS_PATTERN));
    },
    get numericSuffixType() {
      return memoize('numericSuffixType', () => extractReleaseSuffixType(this.numericSuffix, constants.NUMBERED_KEYWORDS));
    },
    get numericSuffixValue() {
      return memoize('numericSuffixValue', () => extractReleaseSuffixNumericValue(this.numericSuffix));
    },

    get suffix() {
      return memoize('suffix', () => this.editionSuffix || this.numericSuffix || '');
    },
    get noSuffix() {
      return memoize('noSuffix', () => this.suffix && cleanupSuffix(value));
    },
    get noSuffixNormalized() {
      return memoize('noSuffixNormalized', () => normalizeForSearch(this.noSuffix));
    },
  };
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}