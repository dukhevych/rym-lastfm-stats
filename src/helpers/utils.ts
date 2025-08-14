import browser from 'webextension-polyfill';
import MD5 from 'crypto-js/md5';
import * as constants from './constants';
import type { TrackDataNormalized } from '@/modules/profile/recentTracks/types';
import type { RecentTrack } from '@/api/getRecentTracks';
import { formatDuration, intervalToDuration } from 'date-fns';

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

if (constants.isDev) {
  const originalStringify = JSON.stringify;

  JSON.stringify = function (value: any, replacer?: any, space?: any) {
    const customReplacer = (key: string, value: any) => {
      if (value instanceof Set) {
        return Array.from(value);
      }
      return typeof replacer === 'function' ? replacer(key, value) : value;
    };

    return originalStringify(value, customReplacer, space);
  };
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

export interface DecodeHtmlEntities {
  (str: string): string;
}

export const decodeHtmlEntities: DecodeHtmlEntities = function(str: string): string {
  return new DOMParser().parseFromString(str, 'text/html').body?.textContent ?? '';
};;

export function combineArtistNames(artistNames: RYMArtistNames): RYMArtistName {
  if (artistNames.length === 1) return artistNames[0];
  if (artistNames.length === 0) return { artistName: '', artistNameLocalized: '' };
  const lastArtistNames: RYMArtistName = artistNames.pop() as RYMArtistName;
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

export function getWindowData(
  paths: string[],
  onChange?: (data: Record<string, any>) => void,
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

export function filterEmptyKeys<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isEmpty =
      value === '' ||
      value === null ||
      value === undefined ||
      (Array.isArray(value) && value.length === 0) ||
      (value instanceof Set && value.size === 0) ||
      (Object.prototype.toString.call(value) === '[object Object]' &&
        Object.keys(value).length === 0);

    if (!isEmpty) {
      key === 'editionSuffixType' && console.log('not empty', key, value);
      (result as any)[key] = value;
    }
  }

  return result;
}

export function getEarliestRating(albums: IRYMRecordDBMatch[]) {
  let earliestRating = 0;
  let minId = Infinity;
  albums.forEach((album) => {
    if (!album.rating) return;

    const id = +album.id;
    if (id && id < minId) {
      minId = id;
      earliestRating = album.rating;
    }
  });
  return earliestRating;
}

export function msToHuman(ms: number, options = {}) {
  const duration = intervalToDuration({ start: 0, end: ms });
  return formatDuration(duration, options);
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Partial<T> {
  const result: Partial<T> = {};
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}
