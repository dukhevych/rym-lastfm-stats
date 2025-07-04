import browser from 'webextension-polyfill';
import { Vibrant } from "node-vibrant/browser";
import { MD5 } from 'crypto-js';
import { remove as removeDiacritics } from 'diacritics';
import * as constants from './constants';
import type { TrackDataNormalized } from '@/modules/profile/recentTracks/types';
import type { RecentTrack } from '@/api/getRecentTracks';
import { getSyncedUserData } from './storageUtils';
import { RYMEntityCode } from './enums';

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

export function shortenNumber(num: number): string {
  if (num >= 1000000) {
    return parseFloat((num / 1000000).toFixed(1)) + 'M';
  } else if (num >= 1000) {
    return parseFloat((num / 1000).toFixed(1)) + 'k';
  } else {
    return num.toString();
  }
};

export interface FormatNumberOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
}

export const formatNumber = (
  number: number,
  options: FormatNumberOptions = {}
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 20,
    locale = 'en-US',
  } = options;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return formatter.format(number);
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

  console.log(encodeURIComponent(artist));

  if (artist) url += `&enh_artist=${encodeURIComponent(artist)}`;
  if (releaseTitle) url += `&enh_release=${encodeURIComponent(releaseTitle)}`;
  if (trackTitle) url += `&enh_track=${encodeURIComponent(trackTitle)}`;

  console.log(url);

  return url;
};

export function generateSearchHint(params: string[]) {
  return `Search for "${params.join(' - ')}" on RateYourMusic`;
}

export interface Wait {
  (ms: number): Promise<void>;
}

export const wait: Wait = function(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const sleep = wait;

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

export interface ThrottledFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
}

export function throttle<T extends (...args: any[]) => any>(fn: T, wait: number): ThrottledFunction<T> {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout>;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    const invoke = () => {
      lastCall = now;
      fn.apply(this, args);
    };

    if (now - lastCall >= wait) {
      invoke();
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => invoke(), wait - (now - lastCall));
    }
  };
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

interface FetchImageResponse {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

export async function getImageColors(imageUrl: string): Promise<ReturnType<typeof getVibrantUiColors>> {
  const dataUrl: string = await new Promise<string>((resolve, reject) => {
    browser.runtime.sendMessage({ type: 'FETCH_IMAGE', url: imageUrl }, (response: FetchImageResponse) => {
      if (!response?.success) {
        return reject(new Error(response?.error || 'Failed to fetch image'));
      }
      resolve(response.dataUrl as string);
    });
  });

  const v = new Vibrant(dataUrl);

  const rawPalette = await v.getPalette();

  // Convert null swatches to undefined to match VibrantPalette type
  const palette: VibrantPalette = Object.fromEntries(
    Object.entries(rawPalette).map(([key, value]) => [key, value === null ? undefined : value])
  );

  return getVibrantUiColors(palette);
}

export interface GetContrastingColorOptions {
  darkColor?: string;
  lightColor?: string;
}

export function getContrastingColor(
  hexColor: string,
  darkColor: string = '#000',
  lightColor: string = '#fff'
): string {
  if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hexColor)) {
    throw new Error('Invalid hex color format');
  }

  const hex: string = hexColor.slice(1);
  const parseHex = (hex: string): number => parseInt(hex.length === 1 ? hex + hex : hex, 16);

  const r: number = parseHex(hex.length === 3 ? hex[0] : hex.substring(0, 2));
  const g: number = parseHex(hex.length === 3 ? hex[1] : hex.substring(2, 4));
  const b: number = parseHex(hex.length === 3 ? hex[2] : hex.substring(4, 6));

  const relativeLuminance = (r: number, g: number, b: number): number => {
    const [R, G, B]: number[] = [r, g, b].map((c: number) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  return relativeLuminance(r, g, b) > 0.179 ? darkColor : lightColor;
}

export async function getVibrantUiColors(palette: VibrantPalette): Promise<VibrantUiColors> {
  const lightColors = {
    bgColor: (palette.LightMuted || palette.Muted || palette.LightVibrant)?.hex || '#222',
    accentColor: (palette.Vibrant || palette.DarkVibrant)?.hex || '#ff4081',
    accentColorHSL: (palette.Vibrant || palette.DarkVibrant)?.hsl || [0.9444444, 1, 0.63],
  };

  const darkColors = {
    bgColor: (palette.DarkMuted || palette.Muted || palette.DarkVibrant)?.hex || '#222',
    accentColor: (palette.Vibrant || palette.LightVibrant)?.hex || '#ff4081',
    accentColorHSL: (palette.Vibrant || palette.LightVibrant)?.hsl || [0.9444444, 1, 0.63],
  };

  return {
    light: {
      ...lightColors,
      get bgColorContrast() {
        return getContrastingColor(this.bgColor);
      },
      get accentColorContrast() {
        return getContrastingColor(this.accentColor);
      },
    },
    dark: {
      ...darkColors,
      get bgColorContrast() {
        return getContrastingColor(this.bgColor);
      },
      get accentColorContrast() {
        return getContrastingColor(this.accentColor);
      },
    },
    palette,
  };
}

export interface FetchSessionKeyParams {
  method: string;
  api_key: string | undefined;
  token: string;
  api_sig?: string;
  format?: string;
}

export interface LastFmSessionResponse {
  session?: {
    name: string;
    key: string;
    subscriber: number;
  };
  error?: number;
  message?: string;
  [key: string]: any;
}

export async function fetchSessionKey(token: string): Promise<string | null> {
  let apiSig: string;

  try {
    apiSig = generateApiSig({
      method: 'auth.getSession',
      api_key: SYSTEM_API_KEY,
      token: token,
    });
  } catch (error) {
    console.error('Error generating API signature:', error);
    return null;
  }

  const _params: FetchSessionKeyParams = {
    method: 'auth.getSession',
    api_key: SYSTEM_API_KEY,
    token: token,
    api_sig: apiSig,
    format: 'json',
  };

  const params = new URLSearchParams(_params as unknown as Record<string, string>);

  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      return null;
    }
    const data: LastFmSessionResponse = await response.json();
    if (data.session) {
      return data.session.key;
    } else {
      console.error('Failed to get session:', data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching session key:', error);
    return null;
  }
};

export interface ApiSigParams {
  [key: string]: string | undefined;
}

export type GenerateApiSig = (params: ApiSigParams) => string;

const generateApiSig: GenerateApiSig = (params) => {
  const sortedKeys = Object.keys(params).sort();
  let stringToSign = '';

  sortedKeys.forEach((key) => {
    stringToSign += key + params[key];
  });

  stringToSign += SYSTEM_API_SECRET;
  return generateMd5(stringToSign);
};

interface GenerateMd5 {
  (string: string): string;
}

const generateMd5: GenerateMd5 = function(string: string): string {
  return MD5(string).toString();
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

export interface DecodeHtmlEntities {
  (str: string): string;
}

export const decodeHtmlEntities: DecodeHtmlEntities = function(str: string): string {
  return new DOMParser().parseFromString(str, 'text/html').body?.textContent ?? '';
};;

export interface ArtistNameItem {
  artistName: string;
  artistNameLocalized: string;
}

export interface CombinedArtistNamesResult {
  artistName: string;
  artistNameLocalized: string;
}

export function combineArtistNames(artistNames: ArtistNameItem[]): CombinedArtistNamesResult {
  if (artistNames.length === 1) return artistNames[0];

  if (artistNames.length === 0) return { artistName: '', artistNameLocalized: '' };

  const lastArtistNames: ArtistNameItem = artistNames.pop() as ArtistNameItem;

  let combinedArtistName: string = `${artistNames.map((name) => name.artistName).join(', ')}`;

  combinedArtistName += ' & ' + lastArtistNames.artistName;

  let combinedArtistNameLocalized: string = `${artistNames.map((name) => name.artistNameLocalized || name.artistName).join(', ')}`;

  combinedArtistNameLocalized += ' & ' + (lastArtistNames.artistNameLocalized || lastArtistNames.artistName);

  return {
    artistName: combinedArtistName,
    artistNameLocalized: combinedArtistNameLocalized !== combinedArtistName ? combinedArtistNameLocalized : '',
  }
};

export interface DeepValueObject {
  [key: string]: any;
}

export interface SetDeepValue {
  (obj: DeepValueObject, path: string, value: any): void;
}

export const setDeepValue: SetDeepValue = function(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
};

export interface GetWindowDataOptions {
  deep?: boolean;
}

export interface GetWindowDataResult {
  initialValue: Record<string, any>;
  stopWatching?: () => void;
}

export interface WindowDataEventDetail {
  field: string;
  value: any;
  prop: string;
}

export type WindowDataOnChange = (data: Record<string, any>) => void;

export function getWindowData(
  paths: string[],
  onChange?: WindowDataOnChange,
  options: GetWindowDataOptions = {}
): Promise<GetWindowDataResult> {
  return new Promise((resolve) => {
    let resolved = false;

    const slug = constants.APP_NAME_SLUG;
    const eventName = `${slug}:field-update`;
    const flatMap: Record<string, any> = {};
    const nestedMap: Record<string, any> = {};
    const received = new Set<string>();

    let pending = false;

    const handler = (e: CustomEvent<WindowDataEventDetail>) => {
      const { field, value, prop } = e.detail;
      const fullPath = `${prop}.${field}`;

      if (!paths.includes(fullPath)) return;
      if (flatMap[fullPath] === value) return;

      flatMap[fullPath] = value;
      setDeepValue(nestedMap, fullPath, value);
      received.add(fullPath);

      if (!resolved && received.size === paths.length) {
        resolved = true;
        if (!onChange) {
          window.removeEventListener(eventName, handler as EventListener);
          resolve({ initialValue: nestedMap });
        } else {
          resolve({ initialValue: nestedMap, stopWatching });
        }
        return;
      }

      if (onChange && resolved && !pending) {
        pending = true;
        queueMicrotask(() => {
          pending = false;
          onChange(nestedMap);
        });
      }
    };

    function stopWatching() {
      window.removeEventListener(eventName, handler as EventListener);
    }

    browser.runtime.sendMessage({
      type: 'get-window-data',
      paths,
      watch: !!onChange,
      deep: options.deep === true,
    });

    window.addEventListener(eventName, handler as EventListener);
  });
}

export interface ShallowEqualObject {
  [key: string]: any;
}

export function shallowEqual(obj1: ShallowEqualObject, obj2: ShallowEqualObject): boolean {
  if (!obj1 || !obj2) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    if (constants.isDev) console.warn('Objects have different number of keys:', keys1.length, keys2.length);
    return false;
  }

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) {
      if (constants.isDev) console.warn(`Values for key "${key}" are different:`, obj1[key], obj2[key]);
      return false;
    }
  }

  return true;
}

export interface OmitObject {
  [key: string]: any;
}

export type OmitKeys = string[];

export function omit<T extends OmitObject, K extends keyof T>(
  obj: T,
  keysToOmit: K[] | string[]
): Partial<Omit<T, K>> {
  if (!obj) return obj;
  if (Object.keys(obj).length === 0) return obj;

  const result: Partial<Omit<T, K>> = {};

  for (const key in obj) {
    if (!keysToOmit.map(String).includes(String(key))) {
      (result as any)[key] = obj[key];
    }
  }

  return result;
}

export function cleanupReleaseEdition(releaseTitle: string): string {
  if (!releaseTitle) return '';

  return releaseTitle
    .replace(constants.EDITION_KEYWORDS_REPLACE_PATTERN, '')
    .trim();
}

function matchEditionSuffix(title: string): string | null {
  const match = title.match(constants.EDITION_KEYWORDS_REPLACE_PATTERN);
  return match ? match[1] : null;
}

export function extractReleaseEditionType(releaseTitle: string): string | null {
  const matched = matchEditionSuffix(releaseTitle);
  if (!matched) return null;

  const lower = matched.toLowerCase();
  for (const keyword of constants.EDITION_KEYWORDS) {
    if (lower.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

export function generateLastFMProfileUrl(artistName: string) {
  return `https://www.last.fm/music/${encodeURIComponent(artistName)}`;
}

export async function restartBackground() {
  await browser.runtime.sendMessage({ type: 'RESTART_BACKGROUND' });
}

export function normalizeLastFmTrack(track: RecentTrack): TrackDataNormalized {
  return {
    nowPlaying: track["@attr"]?.nowplaying === 'true',
    coverUrl: track.image[0]['#text'],
    coverLargeUrl: track.image[3]['#text'],
    coverExtraLargeUrl: track.image[track.image.length - 1]['#text'],
    trackName: track.name,
    timestamp: track.date?.uts ? Number(track.date.uts) : null,
    albumName: track.album['#text'],
    artistName: track.artist['#text'],
  }
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.trunc(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

type CSSVarName = `--${string}`;

export function getColorsMap(colors: VibrantUiColors) {
  const result: Record<CSSVarName, string> = {
    '--clr-light-bg': colors.light.bgColor,
    '--clr-light-bg-contrast': colors.light.bgColorContrast,
    '--clr-light-accent': colors.light.accentColor,
    '--clr-light-accent-contrast': colors.light.accentColorContrast,
    '--clr-dark-bg': colors.dark.bgColor,
    '--clr-dark-bg-contrast': colors.dark.bgColorContrast,
    '--clr-dark-accent': colors.dark.accentColor,
    '--clr-dark-accent-contrast': colors.dark.accentColorContrast,
    '--clr-light-accent-hue': String(Math.trunc(colors.light.accentColorHSL[0] * 360)),
    '--clr-light-accent-saturation': (colors.light.accentColorHSL[1] * 100).toFixed(2),
    '--clr-light-accent-lightness': (colors.light.accentColorHSL[2] * 100).toFixed(2),
    '--clr-dark-accent-hue': String(Math.trunc(colors.dark.accentColorHSL[0] * 360)),
    '--clr-dark-accent-saturation': (colors.dark.accentColorHSL[1] * 100).toFixed(2),
    '--clr-dark-accent-lightness': (colors.dark.accentColorHSL[2] * 100).toFixed(2),
  };

  Object.keys(colors.palette).forEach((key) => {
    if (colors.palette[key]?.rgb) {
      result[`--clr-palette-${key.toLowerCase()}`] = rgbToHex(colors.palette[key].rgb);
    }
  });

  return result;
}

/**
 * Wraps a function with lazy evaluation — computes its result only once,
 * then caches and returns that same result on every subsequent call.
 *
 * - Useful for expensive calculations or derived values.
 * - Ensures the wrapped function is called exactly once.
 * - Acts like a zero-dependency memoized getter.
 *
 * Example:
 *   const getValue = lazy(() => computeSomething());
 *   getValue(); // computes and caches
 *   getValue(); // returns cached value
 *
 * @param fn - A function that returns a value of type T
 * @returns A zero-arg function that returns the same computed value on every call
 */
export function lazy<T>(fn: () => T): () => T {
  let val: T | undefined;     // Cached value
  let evaluated = false;      // Flag to track whether fn has been called

  return () => {
    if (!evaluated) {
      val = fn();             // Call and cache the result
      evaluated = true;       // Mark as evaluated
    }
    return val!;              // Non-null assertion since val is guaranteed after first call
  };
}
