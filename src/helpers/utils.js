const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
import * as constants from './constants.js';

export function detectColorScheme() {
  const theme = constants.THEMES[`theme_${localStorage.getItem('theme')}`];
  const html = document.querySelector('html');

  if (!['light', 'dark'].includes(theme)) {
    html.setAttribute('data-scheme', 'dark');
    return;
  }

  html.setAttribute('data-scheme', theme);

  return theme;
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

// Can become broken if RYM changes layout and ids
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
  return await browserAPI.storage.local.get('userData').then((items) => {
    return items?.userData?.lastfmUsername;
  });
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

const svgSpriteId = 'svg-sprite';
let svgSprite = null;

export const createSVGSprite = function() {
  const loader = document.createElement('div');
  loader.classList.add('loader');

  svgSprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgSprite.setAttribute('id', svgSpriteId);
  svgSprite.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgSprite.setAttribute('style', 'display:none;');

  addIconToSVGSprite(svgLoader, 'svg-loader-symbol');

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
  symbolElement.innerHTML = svgElement.innerHTML;

  svgSprite.appendChild(symbolElement);
}

export const createSvgUse = function(iconName, viewBox) {
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
