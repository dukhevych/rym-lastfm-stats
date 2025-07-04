import { remove as removeDiacritics } from 'diacritics';

import { RYMEntityCode } from '@/helpers/enums';

export function removeBrackets(str: string) {
  return str.replace(/^\[(.*)\]$/, '$1');
}

export function checkPartialStringsMatch(str1: string, str2: string): boolean {
  if (!str1 || !str2) return false;
  return str1 === str2 || str1.includes(str2) || str2.includes(str1);
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

  if (trackTitle) url += `&searchtype=${RYMEntityCode.Song}`;
  else if (releaseTitle) url += `&searchtype=${RYMEntityCode.Release}`;
  else if (artist) url += `&searchtype=${RYMEntityCode.Artist}`;

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
  if (typeof string !== 'string') {
    throw new TypeError('Expected a string');
  }
  return removeDiacritics(string);
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
    .trim());
}