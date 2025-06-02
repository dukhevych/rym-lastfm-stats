import { Vibrant } from "node-vibrant/browser";
import { MD5 } from '@/libs/crypto-js.min.js';
import { remove as removeDiacritics } from 'diacritics';
import * as constants from './constants.js';

const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;
const SYSTEM_API_SECRET = process.env.LASTFM_API_SECRET;

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export function detectColorScheme() {
  const html = document.querySelector('html');
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

export function shortenNumber(num) {
  if (num >= 1000000) {
    return parseFloat((num / 1000000).toFixed(1)) + 'M';
  } else if (num >= 1000) {
    return parseFloat((num / 1000).toFixed(1)) + 'k';
  } else {
    return num.toString();
  }
};

export const createSpan = (title, text) => {
  const span = document.createElement('span');
  span.title = title.trim();
  span.textContent = text.trim();
  return span;
};

export const createParagraph = (text) => {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return paragraph;
};

export const createSelect = (options, selectedValue) => {
  const select = document.createElement('select');

  options.forEach(({ value, label }) => {
    const selectOption = document.createElement('option');
    selectOption.value = value;
    selectOption.textContent = label;

    if (value === selectedValue) {
      selectOption.selected = true;
    }

    select.appendChild(selectOption);
  });

  return select;
};

export const createStrong = (title, text) => {
  const strong = document.createElement('strong');
  strong.title = title;
  strong.textContent = text;
  return strong;
};

export const createLink = (href, text, target = '_blank') => {
  const link = document.createElement('a');
  link.href = href;
  if (target) link.target = target;
  if (text) link.textContent = text;
  return link;
};

export const formatNumber = (number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 20,
  });

  return formatter.format(number);
};

export function getHeaderUsername() {
  const headerProfileUsername = document.querySelector('#header_profile_username');

  if (headerProfileUsername) {
    return headerProfileUsername.textContent.trim();
  }

  return null;
}

export function isMyCollection() {
  const currentUrl = window.location.href;
  const [, urlUsername] = currentUrl.match(/\/collection\/([^/?#]+)(?:\/([^?#]*))?/) || [];

  if (!urlUsername) return false;

  const headerUsername = getHeaderUsername();

  return headerUsername === urlUsername;
};

export function isMyProfile() {
  const currentUrl = window.location.href;
  const [, urlUsername] = currentUrl.match(/\/~([^/?#]+)/) || [];

  if (!urlUsername) return false;

  const headerUsername = getHeaderUsername();

  return headerUsername === urlUsername;
};

// Depends on the list of dark theme classes that is hardcoded and can be changed by RYM
export function isDarkMode() {
  const htmlClasses = document.querySelector('html').classList;
  return constants.DARK_THEME_CLASSES.some((darkThemeClass) =>
    htmlClasses.contains(darkThemeClass),
  );
};

export async function getUserName() {
  const userData = await getSyncedUserData();
  return userData?.name ?? null;
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

export function storageGet(keys, storageType = 'sync') {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise((resolve, reject) => {
    browserAPI.storage[storageType].get(keys, (result) => {
      if (typeof chrome !== 'undefined' && chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        if (typeof keys === 'string') {
          resolve(result[keys]);
        } else {
          resolve(result);
        }
      }
    });
  });
}

export function storageSet(payload, storageType = 'sync') {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise((resolve, reject) => {
    browserAPI.storage[storageType].set(payload, () => {
      if (typeof chrome !== 'undefined' && chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export function storageRemove(keys, storageType = 'sync') {
  if (!STORAGE_TYPES.includes(storageType)) {
    throw new Error(`Invalid storage type: ${storageType}`);
  }

  return new Promise((resolve, reject) => {
    browserAPI.storage[storageType].remove(keys, () => {
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

  const searchterm = [artist, releaseTitle, trackTitle]
    .filter((part) => ![undefined, null, ''].includes(part))
    .join(' ');

  if (!searchterm) {
    return url;
  } else {
    url += '/search?';
    url += `searchterm=${encodeURIComponent(normalizeForSearch(searchterm))}`;
  }

  if (trackTitle) url += `&searchtype=z`;
  else if (releaseTitle) url += `&searchtype=l`;
  else if (artist) url += `&searchtype=a`;

  // Strict search results are provided by this addon and are not a part of RYM functionality
  if (strictSearch) url += '&strict=true';

  return url;
};

export function waitForDOMReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      return resolve();
    }

    const check = () => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };

    requestAnimationFrame(check);
  });
}

export async function checkDOMCondition(targetSelectors, conditionCallback) {
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

const svgSpriteId = 'svg-sprite';
let svgSprite = null;

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

  return svgSprite;
}

export const insertSVGSprite = function(svgSprite) {
  return new Promise((resolve) => {
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

export const addIconToSVGSprite = function(iconRaw, iconName) {
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
  symbolElement.setAttribute('viewBox', svgElement.getAttribute('viewBox'));
  [...svgElement.childNodes].forEach(node => {
    symbolElement.appendChild(node.cloneNode(true));
  });

  svgSprite.appendChild(symbolElement);
}

export const createSvgUse = function(iconName, viewBox = '0 0 24 24') {
  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('viewBox', viewBox);
  const useElement = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  useElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${iconName}`);
  wrapper.appendChild(useElement);
  return wrapper;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

export function throttle(fn, wait) {
  let lastCall = 0;
  let timeout;

  return function (...args) {
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

export function deburr(string) {
  if (typeof string !== 'string') {
    throw new TypeError('Expected a string');
  }
  return removeDiacritics(string);
}

export async function getImageColors(imageUrl) {
  const dataUrl = await new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage({ type: 'FETCH_IMAGE', url: imageUrl }, (response) => {
      if (!response?.success) {
        return reject(new Error(response?.error || 'Failed to fetch image'));
      }
      resolve(response.dataUrl);
    });
  });

  const v = new Vibrant(dataUrl);

  const palette = await v.getPalette();

  return getVibrantUiColors(palette);
}

export function getContrastingColor(hexColor, darkColor = '#000', lightColor = '#fff') {
  if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(hexColor)) {
    throw new Error('Invalid hex color format');
  }

  const hex = hexColor.slice(1);
  const parseHex = (hex) => parseInt(hex.length === 1 ? hex + hex : hex, 16);

  const r = parseHex(hex.length === 3 ? hex[0] : hex.substring(0, 2));
  const g = parseHex(hex.length === 3 ? hex[1] : hex.substring(2, 4));
  const b = parseHex(hex.length === 3 ? hex[2] : hex.substring(4, 6));

  const relativeLuminance = (r, g, b) => {
    const [R, G, B] = [r, g, b].map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  };

  return relativeLuminance(r, g, b) > 0.179 ? darkColor : lightColor;
}

export async function getVibrantUiColors(palette) {
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

export async function fetchSessionKey(token) {
  let apiSig;

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

  const _params = {
    method: 'auth.getSession',
    api_key: SYSTEM_API_KEY,
    token: token,
    api_sig: apiSig,
    format: 'json',
  };

  const params = new URLSearchParams(_params);

  const url = `https://ws.audioscrobbler.com/2.0/?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
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

const generateApiSig = (params) => {
  const sortedKeys = Object.keys(params).sort();
  let stringToSign = '';

  sortedKeys.forEach((key) => {
    stringToSign += key + params[key];
  });

  stringToSign += SYSTEM_API_SECRET;
  return generateMd5(stringToSign);
};

function generateMd5(string) {
  return MD5(string).toString();
}

export function getDirectInnerText(element) {
  return Array.from(element.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .join(' ')
    .trim();
}

export function normalizeForSearch(str) {
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
    .replace(/’/g, '')
    .replace(/\\/g, '')
    .replace(/:/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .replace(/ pt /g, ' part ')
    .replace(/ vol /g, ' volume ')
    .trim());
}

export function decodeHtmlEntities(str) {
  return new DOMParser().parseFromString(str, 'text/html').body.textContent;
};

export function combineArtistNames(artistNames) {
  if (artistNames.length === 1) return artistNames[0];

  if (artistNames.length === 0) return null;

  const lastArtistNames = artistNames.pop();

  let combinedArtistName = `${artistNames.map((name) => name.artistName).join(', ')}`;

  combinedArtistName += ' & ' + lastArtistNames.artistName;

  let combinedArtistNameLocalized = `${artistNames.map((name) => name.artistNameLocalized || name.artistName).join(', ')}`;

  combinedArtistNameLocalized += ' & ' + (lastArtistNames.artistNameLocalized || lastArtistNames.artistName);

  return {
    artistName: combinedArtistName,
    artistNameLocalized: combinedArtistNameLocalized !== combinedArtistName ? combinedArtistNameLocalized : '',
  }
};

export function checkPartialStringsMatch(str1, str2) {
  if (!str1 || !str2) return false;

  return str1 === str2 || str1.includes(str2) || str2.includes(str1);
}

export function getNodeDirectTextContent(item) {
  if (!item) return '';

  const result = [];

  item.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result.push(node.textContent);
    }
  });

  return result.join(' ');
}

export function extractIdFromTitle(title) {
  const idStr = title.match(/\d+/g)?.join('');
  return idStr || null;
}

function setDeepValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

export function getWindowData(paths, onChange, options = {}) {
  return new Promise((resolve) => {
    let resolved = false;

    const slug = constants.APP_NAME_SLUG;
    const eventName = `${slug}:field-update`;
    const flatMap = {};
    const nestedMap = {};
    const received = new Set();

    let pending = false;

    const handler = (e) => {
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
          window.removeEventListener(eventName, handler);
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
      window.removeEventListener(eventName, handler);
    }

    browserAPI.runtime.sendMessage({
      type: 'get-window-data',
      paths,
      watch: !!onChange,
      deep: options.deep === true,
    });

    window.addEventListener(eventName, handler);
  });
}

export function shallowEqual(obj1, obj2) {
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

export function omit(obj, keysToOmit) {
  if (!obj) return obj;
  if (Object.keys(obj).length === 0) return obj;

  const result = {};

  for (const key in obj) {
    if (!keysToOmit.includes(key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

export function cleanupReleaseEdition(releaseTitle) {
  if (!releaseTitle) return '';

  return releaseTitle
    .replace(constants.EDITION_KEYWORDS_REPLACE_PATTERN, '')
    .trim();
}

export function createElement(tag, props = {}, ...children) {
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
        el.dataset[dataKey] = dataValue;
      }
    } else if (key in el) {
      el[key] = value;
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
