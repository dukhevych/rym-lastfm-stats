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

export const createButton = (title, attributes = {}) => {
  const button = document.createElement('button');
  button.title = title;
  button.textContent = title;
  Object.entries(attributes).forEach(([key, value]) => {
    button.setAttribute(key, value);
  });
  return button;
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
  link.textContent = text;
  return link;
};

export const formatNumber = (number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 20,
  });

  return formatter.format(number);
};

export function isMyProfile() {
  const headerProfileUsername = document.querySelector(
    '#header_profile_username',
  );
  const profileName = document.querySelector('#profilename');

  if (headerProfileUsername && profileName) {
    return (
      headerProfileUsername.textContent.trim() ===
      profileName.textContent.trim()
    );
  }

  return false;
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

export function detectUserName() {
  let userName = null;

  const firstLastFmLink = Array.from(document.querySelectorAll('a')).find((link) => {
    if (link.closest('#shoutbox_commentarea') !== null) {
      return false;
    }
    const href = link.href.toLowerCase();
    return (
      href.includes('last.fm/user/')
      || (href.includes('lastfm.') && href.includes('/user/'))
    );
  });

  if (firstLastFmLink) {
    const parts = firstLastFmLink.href
      .replace(/\/$/, '')
      .replace(/^\/|\/$/g, '')
      .split('/');
    userName = parts[parts.length - 1].trim();
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

export function getSyncedOptions(fields = constants.OPTIONS_DEFAULT_KEYS) {
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
    url += `searchterm=${encodeURIComponent(searchterm.toLowerCase())}`;
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
import starSvg from '@/assets/icons/star4.svg?raw';
import lastfmSvg from '@/assets/icons/lastfm.svg?raw';
import playlistSvg from '@/assets/icons/playlist.svg?raw';
import volumeSvg from '@/assets/icons/volume.svg?raw';

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
  addIconToSVGSprite(playlistSvg, 'svg-playlist-symbol');
  addIconToSVGSprite(volumeSvg, 'svg-volume-symbol');

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

export function getAndWatchObjectField(propName, fieldName, onChange) {
  return new Promise((resolve) => {
    let resolved = false;
    let lastValue;

    const handler = (e) => {
      if (
        e?.detail?.prop === propName &&
        e?.detail?.field === fieldName
      ) {
        const newVal = e.detail.value;

        // If value hasn't changed, ignore
        if (newVal === lastValue) return;
        lastValue = newVal;

        if (!resolved) {
          resolved = true;
          resolve({ initialValue: newVal, stopWatching });
        } else {
          onChange?.(newVal);
        }
      }
    };

    function stopWatching() {
      window.removeEventListener("my-extension:field-update", handler);
    }

    window.addEventListener("my-extension:field-update", handler);

    const browserAPI = typeof browser !== "undefined" ? browser : chrome;
    browserAPI.runtime.sendMessage({
      type: "get-and-watch-object-field",
      propName,
      fieldName
    });
  });
}

export async function getImageColors(imageUrl, theme = 'light') {
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

  return getVibrantUiColors(palette, theme);
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
  };

  const darkColors = {
    bgColor: (palette.DarkMuted || palette.Muted || palette.DarkVibrant)?.hex || '#222',
    accentColor: (palette.Vibrant || palette.LightVibrant)?.hex || '#ff4081',
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
