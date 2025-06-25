declare const chrome: any;

import browser from 'webextension-polyfill';
import { Vibrant } from "node-vibrant/browser";
import { MD5 } from 'crypto-js';
import { remove as removeDiacritics } from 'diacritics';
import * as constants from './constants';
import type { TrackDataNormalized } from '@/modules/profile/recentTracks/types';
import type { RecentTrack } from '@/api/getRecentTracks';

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

export function detectColorScheme() {
  const html = document.querySelector('html');

  if (!html) return 'light';

  const htmlThemeClass = Array.from(html.classList).find(cls => cls.startsWith('theme_'));

  if (htmlThemeClass) {
    const theme = htmlThemeClass.replace('theme_', '');
    html.setAttribute('data-scheme', constants.THEMES[htmlThemeClass]);
    return theme;
  }

  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.setAttribute('data-scheme', 'dark');
      return 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      html.setAttribute('data-scheme', 'light');
      return 'light';
    }
  }

  return 'light';
}

export function initColorSchemeDetection() {
  detectColorScheme();

  const observer = new MutationObserver(() => {
    detectColorScheme();
  });

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
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

interface SelectOption {
  value: string;
  label: string;
}

export const createSelect = (options: SelectOption[], selectedValue?: string, selectAttributes?: CreateElementProps): HTMLSelectElement => {
  return createElement(
    'select',
    selectAttributes || {},
    options.map(({ value, label }) => createElement('option', {
      value,
      selected: value === selectedValue,
    }, label)),
  );
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

export function getRYMUsername() {
  const headerProfileUsername = document.querySelector('#header_profile_username');

  if (headerProfileUsername) {
    return (headerProfileUsername.textContent ?? '').trim();
  }

  return null;
}

export function isMyCollection() {
  const currentUrl = window.location.href;
  const [, urlUsername] = currentUrl.match(/\/collection\/([^/?#]+)(?:\/([^?#]*))?/) || [];

  if (!urlUsername) return false;

  const headerUsername = getRYMUsername();

  return headerUsername === urlUsername;
};

export function isMyProfile() {
  const currentUrl = window.location.href;
  const [, urlUsername] = currentUrl.match(/\/~([^/?#]+)/) || [];

  if (!urlUsername) return false;

  const headerUsername = getRYMUsername();

  return headerUsername === urlUsername;
};

// Depends on the list of dark theme classes that is hardcoded and can be changed by RYM
export function isDarkMode() {
  const htmlElement = document.querySelector('html');
  if (!htmlElement) return false;
  const htmlClasses = htmlElement.classList;
  return constants.DARK_THEME_CLASSES.some((darkThemeClass) =>
    htmlClasses.contains(darkThemeClass),
  );
};

export async function getLastfmUserName() {
  const userData = await getSyncedUserData() as UserData;
  return userData?.name ?? '';
};

export function detectLastfmUserName() {
  let userName = null;

  const firstLastFmLink = Array.from(document.querySelectorAll('a')).find((link) => {
    if (link.closest('#shoutbox_commentarea') !== null) {
      return false;
    }
    const href = link.href.toLowerCase();
    return (
      (href.includes('last.fm') && href.includes('/user/')) ||
      (href.includes('lastfm.') && href.includes('/user/'))
    );
  });

  if (firstLastFmLink) {
    const parts = firstLastFmLink.href
      .replace(/\/$/, '')
      .replace(/^\/|\/$/g, '')
      .split('/');

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase() === 'user' && parts[i + 1]) {
        userName = parts[i + 1].trim();
        break;
      }
    }
  }

  return userName;
}

const STORAGE_TYPES = ['local', 'sync'];

export type StorageType = 'local' | 'sync';

export interface StorageGetResult {
  [key: string]: any;
}

export function storageGet<T = StorageGetResult>(
  keys: string | string[] | null,
  storageType: StorageType = 'sync'
): Promise<T> {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise<T>((resolve, reject) => {
    browser.storage[storageType].get(keys, (result: StorageGetResult) => {
      if (typeof chrome !== 'undefined' && chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        if (typeof keys === 'string') {
          resolve(result[keys] as T);
        } else {
          resolve(result as T);
        }
      }
    });
  });
}

export interface StorageSetPayload {
  [key: string]: any;
}

export function storageSet(
  payload: StorageSetPayload,
  storageType: StorageType = 'sync'
): Promise<void> {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise<void>((resolve, reject) => {
    browser.storage[storageType].set(payload, () => {
      if (typeof chrome !== 'undefined' && chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export interface StorageRemoveOptions {
  keys: string | string[];
  storageType?: StorageType;
}

export function storageRemove(
  keys: string | string[],
  storageType: StorageType = 'sync'
): Promise<void> {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise<void>((resolve, reject) => {
    browser.storage[storageType].remove(keys, () => {
      if (typeof chrome !== 'undefined' && chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export function getSyncedOptions(fields = Object.keys(constants.OPTIONS_DEFAULT)) {
  return storageGet(fields);
};

export function getSyncedUserData() {
  return storageGet('userData');
};

export function generateSearchUrl({
  artist = '',
  releaseTitle = '',
  trackTitle = '',
} = {}, strictSearch = true) {
  let url = 'https://rateyourmusic.com';

  const query = [artist, releaseTitle, trackTitle]
    .filter((part) => ![undefined, null, ''].includes(part))
    .join(' ');
  let searchterm: string;

  if (!query) {
    return url;
  } else {
    searchterm = encodeURIComponent(normalizeForSearch(query));
    url += '/search?';
    url += `searchterm=${searchterm}`;
  }

  if (trackTitle) url += `&searchtype=z`;
  else if (releaseTitle) url += `&searchtype=l`;
  else if (artist) url += `&searchtype=a`;

  // Strict search results are provided by this addon and are not a part of RYM functionality
  if (strictSearch) url += '&strict=true';

  if (artist) url += `&enh_artist=${artist}`;
  if (releaseTitle) url += `&enh_release=${releaseTitle}`;
  if (trackTitle) url += `&enh_track=${trackTitle}`;

  return url;
};

export function generateSearchHint(params: string[]) {
  return `Search for "${params.join(' - ')}" on RateYourMusic`;
}

export function waitForDOMReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      return resolve(undefined);
    }

    const check = () => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        resolve(undefined);
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  });
}

export interface CheckDOMConditionOptions {
  targetSelectors: string[];
  conditionCallback: () => any;
}

export async function checkDOMCondition(
  targetSelectors: string[],
  conditionCallback: () => any
): Promise<any> {
  return new Promise((resolve) => {
    function _() {
      const targetElementsExist = targetSelectors.every(
        (selector) => !!document.querySelector(selector),
      );

      if (document.body && targetElementsExist) {
        resolve(conditionCallback());
      } else {
        requestAnimationFrame(_);
      }
    }
    _();
  });
}

export const getFullConfig = async () => {
  const storageItems = await getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };
  return config;
}

import svgLoader from '@/assets/icons/loader.svg?raw';
import starSvg from '@/assets/icons/star.svg?raw';
import lastfmSvg from '@/assets/icons/lastfm.svg?raw';
import lastfmSquareSvg from '@/assets/icons/lastfm-square.svg?raw';
import playlistSvg from '@/assets/icons/playlist.svg?raw';
import volumeSvg from '@/assets/icons/volume.svg?raw';
import brushSvg from '@/assets/icons/brush.svg?raw';
import closeSvg from '@/assets/icons/close.svg?raw';
import lockSvg from '@/assets/icons/lock.svg?raw';
import unlockSvg from '@/assets/icons/unlock.svg?raw';

const svgSpriteId = 'svg-sprite';

interface SvgSprite extends SVGSVGElement {}
let svgSprite: SvgSprite | null = null;

export const createSVGSprite = function() {
  svgSprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgSprite.setAttribute('id', svgSpriteId);
  svgSprite.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgSprite.setAttribute('style', 'display:none;');

  addIconToSVGSprite(svgLoader, 'svg-loader-symbol');
  addIconToSVGSprite(starSvg, 'svg-star-symbol');
  addIconToSVGSprite(lastfmSvg, 'svg-lastfm-symbol');
  addIconToSVGSprite(lastfmSquareSvg, 'svg-lastfm-square-symbol');
  addIconToSVGSprite(playlistSvg, 'svg-playlist-symbol');
  addIconToSVGSprite(volumeSvg, 'svg-volume-symbol');
  addIconToSVGSprite(brushSvg, 'svg-brush-symbol');
  addIconToSVGSprite(closeSvg, 'svg-close-symbol');
  addIconToSVGSprite(lockSvg, 'svg-lock-symbol');
  addIconToSVGSprite(unlockSvg, 'svg-unlock-symbol');

  return svgSprite;
}

export interface InsertSVGSprite {
  (svgSprite: SVGSVGElement): Promise<void>;
}

export const insertSVGSprite: InsertSVGSprite = function(svgSprite) {
  return new Promise<void>((resolve) => {
    if (document.body) {
      document.body.appendChild(svgSprite);
      resolve();
    } else {
      function _() {
        if (document.body) {
          document.body.appendChild(svgSprite);
          resolve();
        } else {
          requestAnimationFrame(_);
        }
      }
      _();
    }
  });
}

export interface AddIconToSVGSprite {
  (iconRaw: string, iconName: string): void;
}

export const addIconToSVGSprite: AddIconToSVGSprite = function(iconRaw, iconName) {
  if (!svgSprite) {
    console.error('SVG sprite not found');
    return;
  }
  if (!iconRaw) {
    console.error('Icon raw data is empty');
    return;
  }
  if (!iconName) {
    console.error('Icon name is empty');
    return;
  }
  if (svgSprite.querySelector(`#${iconName}`)) {
    console.warn(`Icon with name "${iconName}" already exists in the SVG sprite.`);
    return;
  }
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(iconRaw, 'image/svg+xml');
  const svgElement = svgDoc.documentElement;
  const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
  symbolElement.setAttribute('id', iconName);
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    symbolElement.setAttribute('viewBox', viewBox);
  }
  Array.from(svgElement.childNodes).forEach(node => {
    symbolElement.appendChild(node.cloneNode(true));
  });

  svgSprite.appendChild(symbolElement);
}

export interface CreateSvgUseOptions {
  iconName: string;
  viewBox?: string;
}

export const createSvgUse = function(
  iconName: string,
  viewBox: string = '0 0 24 24'
): SVGSVGElement {
  const wrapper: SVGSVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('viewBox', viewBox);
  const useElement: SVGUseElement = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  useElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${iconName}`);
  wrapper.appendChild(useElement);
  return wrapper;
}

export interface Wait {
  (ms: number): Promise<void>;
}

export const wait: Wait = function(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

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

export interface GetDirectInnerText {
  (element: Element): string;
}

export const getDirectInnerText: GetDirectInnerText = function(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node: ChildNode) => node.nodeType === Node.TEXT_NODE)
    .map((node: ChildNode) => (node.textContent ?? '').trim())
    .join(' ')
    .trim();
};

export interface Slugify {
  (str: string): string;
}

export const slugify: Slugify = function(str: string): string {
  if (!str) return '';
  return deburr(str
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove non-word characters except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single one
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, '') // Remove trailing hyphens
  );
}

export interface NormalizeForSearch {
  (str: string): string;
}

export function normalizeForSearch(str: string): string {
  if (!str) return '';

  return deburr(str
    .toLowerCase()
    .replace(/\sand\s/g, ' & ')
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

export interface CheckPartialStringsMatch {
  (str1: string, str2: string): boolean;
}

export const checkPartialStringsMatch: CheckPartialStringsMatch = function(str1, str2) {
  if (!str1 || !str2) return false;

  return str1 === str2 || str1.includes(str2) || str2.includes(str1);
};

export interface GetNodeDirectTextContent {
  (item: Node | null): string;
}

export function getNodeDirectTextContent(item: Node | null): string {
  if (!item) return '';

  const result: string[] = [];

  item.childNodes.forEach((node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result.push(node.textContent ?? '');
    }
  });

  return result.join(' ').trim();
}

export interface ExtractIdFromTitle {
  (title: string): string;
}

export const extractIdFromTitle: ExtractIdFromTitle = function(title: string): string {
  const idStr = title.match(/\d+/g)?.join('');
  return idStr || '';
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

export interface CleanupReleaseEdition {
  (releaseTitle: string): string;
}

export function cleanupReleaseEdition(releaseTitle: string): string {
  if (!releaseTitle) return '';

  return releaseTitle
    .replace(constants.EDITION_KEYWORDS_REPLACE_PATTERN, '')
    .trim();
}

export interface CreateElementProps {
  style?: Partial<CSSStyleDeclaration>;
  className?: string | string[];
  dataset?: { [key: string]: string };
  [key: string]: any;
}

export type Child = Node | string | number | boolean | null | undefined;
export type Children = Child | Child[];

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: CreateElementProps,
  ...children: Children[]
): HTMLElementTagNameMap[K];

export function createElement(
  tag: string,
  props?: CreateElementProps,
  ...children: Children[]
): HTMLElement;

export function createElement(
  tag: string,
  props: CreateElementProps = {},
  ...children: Children[]
): HTMLElement {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key === 'className') {
      if (Array.isArray(value)) el.classList.add(...value);
      else el.classList.add(...value.trim().split(/\s+/)); // handles 'foo bar'
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        el.dataset[dataKey] = dataValue != null ? String(dataValue) : undefined;
      }
    } else if (key in el) {
      (el as any)[key] = value;
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children.flat()) {
    if (child == null) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return el;
}

export function setColorVar(name: string, value: string | number) {
  document.documentElement.style.setProperty(name, `${value}`);
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

export function generateLastFMProfileUrl(artistName: string) {
  return `https://www.last.fm/music/${encodeURIComponent(artistName)}`;
}

export function removeArtistNameBrackets(artistName: string) {
  return artistName.replace(/^\[(.*)\]$/, '$1');
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