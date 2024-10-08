const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
import * as constants from './constants.js';

export function shortenNumber(num) {
  if (num >= 1000000) {
    return parseFloat((num / 1000000).toFixed(1)) + 'M';
  } else if (num >= 1000) {
    return parseFloat((num / 1000).toFixed(1)) + 'k';
  } else {
    return num.toString();
  }
}

export const createSpan = (title, text) => {
  const span = document.createElement('span');
  span.title = title;
  span.textContent = text;
  return span;
};

export const createParagraph = (text) => {
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  return paragraph;
}

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
}

export function isDarkMode() {
  const htmlClasses = document.querySelector('html').classList;
  return constants.DARK_THEME_CLASSES.some((darkThemeClass) =>
    htmlClasses.contains(darkThemeClass),
  );
}

export function getUserName(config) {
  let userName;

  if (isMyProfile() && config.lastfmUsername) {
    userName = config.lastfmUsername;
  }

  if (!userName) {
    const firstLastFmLink = document.querySelector(
      'a[href*="last.fm"][href*="/user/"]',
    );

    if (firstLastFmLink) {
      const parts = firstLastFmLink.href
        .replace(/\/$/, '')
        .replace(/^\/|\/$/g, '')
        .split('/');
      userName = parts[parts.length - 1].trim();

      if (isMyProfile()) {
        browserAPI.storage.sync.set({ lastfmUsername: userName });
      }
    } else {
      console.log('No Last.fm links found.');
    }
  }

  return userName;
}

export function getStorageItems(fields = constants.OPTIONS_DEFAULT_KEYS) {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(fields, (items) => {
      resolve(items);
    });
  });
}

export function generateSearchUrl({ artist = '', releaseTitle = '', trackTitle = '' } = {}) {
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

  if (trackTitle) url+= `&searchtype=z`;
  else if (releaseTitle) url+= `&searchtype=l`;
  else if (artist) url+= `&searchtype=a`;

  url += '&strict=true';

  return url;
}
