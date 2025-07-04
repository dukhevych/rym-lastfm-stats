import * as constants from '@/helpers/constants';

function detectColorScheme() {
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
  const observer = new MutationObserver(detectColorScheme);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

export function getRYMUsername() {
  const headerProfileUsername = document.querySelector('#header_profile_username');
  if (headerProfileUsername) return (headerProfileUsername.textContent ?? '').trim();
  return null;
}

export function isMyCollection() {
  const currentUrl = window.location.href;
  const [, urlUsername] = currentUrl.match(/\/collection\/([^/?#]+)(?:\/([^?#]*))?/) || [];
  if (!urlUsername) return false;
  return getRYMUsername() === urlUsername;
};

export function isMyProfile() {
  const currentUrl = window.location.href;
  const [, urlUsername] = currentUrl.match(/\/~([^/?#]+)/) || [];
  if (!urlUsername) return false;
  return getRYMUsername() === urlUsername;
};

// Depends on the list of dark theme classes that is hardcoded and can be changed by RYM
export function isDarkMode() {
  const html = document.querySelector('html');
  if (!html) return false;
  const htmlClasses = html.classList;
  return constants.DARK_THEME_CLASSES.some(darkThemeClass => htmlClasses.contains(darkThemeClass));
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