import browser from 'webextension-polyfill';
import * as enums from '@/helpers/enums';

const manifest = browser.runtime.getManifest();
export const isDev = process.env.NODE_ENV === 'development';

export const isIdentityApiSupported = !!(browser.identity && browser.identity.launchWebAuthFlow);

// Interval constants for fetching data
export const RECENT_TRACKS_INTERVAL_MS = isDev ? (10 * 1000) : (1 * 60 * 1000); // 10 seconds / 1 minute
export const RECENT_TRACKS_INTERVAL_MS_THROTTLED = RECENT_TRACKS_INTERVAL_MS / 2;
export const TOP_ALBUMS_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const TOP_ARTISTS_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const STATS_CACHE_LIFETIME_GUEST_MS = isDev ? 10 * 1000 : 3 * 60 * 60 * 1000; // 30 seconds / 3 hours
export const STATS_CACHE_LIFETIME_MS = isDev ? 30 * 1000 : 5 * 60 * 1000; // 30 seconds /5 minutes
export const STATS_CACHE_LIFETIME_WITH_API_KEY_MS = isDev ? 30 * 1000 : 1 * 60 * 1000; // 30 seconds / 1 minute
export const RYM_SYNC_OUTDATED_THRESHOLD_MS = isDev ? 1000 * 60 * 60 * 24 * 1 : 1000 * 60 * 60 * 24 * 30; // 30 days

export function getStatsCacheLifetime(userName: string | null | undefined, lastfmApiKey: string | null | undefined) {
  // With Last.fm Api Key it's ok to cache for a really shorter time
  if (lastfmApiKey) return STATS_CACHE_LIFETIME_WITH_API_KEY_MS;

  // If no Api Key but signed in with Last.fm
  if (userName) return STATS_CACHE_LIFETIME_MS;

  // If no Api Key and not signed in with Last.fm - it's reasonable to cache for much longer time
  return STATS_CACHE_LIFETIME_GUEST_MS;
}

export const APP_VERSION = manifest.version;
export const APP_NAME = manifest.name;
export const APP_NAME_SLUG = APP_NAME.replace(/\s+/g, '-').toLowerCase();

export const RYM_DB_VERSION = 2;
export const RYM_DB_NAME = 'rymExportDB';
export const RYM_DB_STORE_NAME = 'rymExportStore';

export const LASTFM_COLOR = '#f71414';

export const LIGHT_THEME_CLASSES = [
  'theme_light',
  'theme_lightgray',
  'theme_pink',
  'theme_classic',
];

export const DARK_THEME_CLASSES = [
  'theme_eve',
  'theme_night',
  'theme_darkgray',
];

export const THEMES: { [key: string]: string } = {};

LIGHT_THEME_CLASSES.reduce((acc, theme) => {
  acc[theme] = 'light';
  return acc;
}, THEMES);

DARK_THEME_CLASSES.reduce((acc, theme) => {
  acc[theme] = 'dark';
  return acc;
}, THEMES);

// Last.fm api values
export const PERIOD_OPTIONS: { value: LastFmPeriod, label: string }[] = [
  {
    value: 'overall',
    label: 'Overall',
  },
  {
    value: '7day',
    label: 'Last 7 days',
  },
  {
    value: '1month',
    label: 'Last month',
  },
  {
    value: '3month',
    label: 'Last 3 months',
  },
  {
    value: '6month',
    label: 'Last 6 months',
  },
  {
    value: '12month',
    label: 'Last year',
  },
];

export const PERIOD_LABELS_MAP = PERIOD_OPTIONS.reduce(
  (acc: { [key: string]: string }, { value, label }) => {
    acc[value] = label;
    return acc;
  }, {} as { [key: string]: string }
);

// TOP ALBUMS
export const TOP_ALBUMS_PERIOD_DEFAULT = '1month';

// TOP ARTISTS
export const TOP_ARTISTS_PERIOD_DEFAULT = '12month';
export const TOP_ARTISTS_LIMIT_MIN = 5;
export const TOP_ARTISTS_LIMIT_MAX = 10;
export const TOP_ARTISTS_LIMIT_DEFAULT = 5;

// RECENT TRACKS
export const RECENT_TRACKS_LIMIT_MIN = 1;
export const RECENT_TRACKS_LIMIT_MAX = 20;
export const RECENT_TRACKS_LIMIT_DEFAULT = 10;

export const MODULE_TOGGLE_CONFIG = process.env.MODULES_ARRAY as unknown as ModuleToggleConfig;
export const MODULE_CUSTOMIZATION_CONFIG = process.env.CONFIG_DEFAULTS as unknown as AddonOptions;

export const PROFILE_OPTIONS_DEFAULT: AddonOptions = {
  ...MODULE_TOGGLE_CONFIG,
  ...MODULE_CUSTOMIZATION_CONFIG,
};

// [Addon entity type]: [RYM entity code]
export const RYM_ENTITY_CODES = {
  [enums.ERYMEntityType.Artist]: enums.ERYMEntityCode.Artist,
  [enums.ERYMEntityType.Release]: enums.ERYMEntityCode.Release,
  [enums.ERYMEntityType.Song]: enums.ERYMEntityCode.Song,
}

export const RYM_ENTITY_CODES_INVERTED = Object.fromEntries(
  Object.entries(RYM_ENTITY_CODES).map(([key, value]) => [value, key])
);

import suffixEditionKeywords from '@/config/suffixEditionKeywords.json';
export const EDITION_KEYWORDS = suffixEditionKeywords as string[];

import suffixNumberedKeywords from '@/config/suffixNumberedKeywords.json';
export const NUMBERED_KEYWORDS = suffixNumberedKeywords as string[];

export const SUFFIX_KEYWORDS = [
  ...EDITION_KEYWORDS,
  ...NUMBERED_KEYWORDS,
]

export const getSuffixPattern = (keywords: string[] = SUFFIX_KEYWORDS) => {
  return new RegExp(
    `\\s*[\\[(]([^\\])]*${
      `\\b(?:${keywords.join('|')})\\b`
    }[^\\])]*)[\\])]$`,
    'i'
  );
}

export const SUFFIX_PATTERN = getSuffixPattern();
export const SUFFIX_EDITION_KEYWORDS_PATTERN = getSuffixPattern(EDITION_KEYWORDS);
export const SUFFIX_NUMBERED_KEYWORDS_PATTERN = getSuffixPattern(NUMBERED_KEYWORDS);

// [DB value]: [display value]
export const RYMFormatsLabels: Record<ERYMFormat, string> = {
  [enums.ERYMFormat.CD]: 'CD',
  [enums.ERYMFormat.LP]: 'Vinyl',
  [enums.ERYMFormat.MP3]: 'Digital',
  [enums.ERYMFormat.CD_R]: 'CD-R',
  [enums.ERYMFormat.Cassette]: 'Cassette',
  [enums.ERYMFormat.DVD_A]: 'DVD-A',
  [enums.ERYMFormat.SACD]: 'SACD',
  [enums.ERYMFormat.Minidisc]: 'Minidisc',
  [enums.ERYMFormat.Multiple]: 'Multiple',
  [enums.ERYMFormat.EightTrack]: '8-track',
  [enums.ERYMFormat.Other]: 'Other',
};

// [display value]: [RYM DB value]
export const RYMFormatsLabelsReverse: Record<string, ERYMFormat> = Object.fromEntries(
  Object.entries(RYMFormatsLabels).map(([key, value]) => [value, key as ERYMFormat])
);

export const RYMOwnershipStatusLabels: Record<ERYMOwnershipStatus, string> = {
  [enums.ERYMOwnershipStatus.InCollection]: 'In collection',
  [enums.ERYMOwnershipStatus.OnWishlist]: 'On wishlist',
  [enums.ERYMOwnershipStatus.UsedToOwn]: 'Used to own',
  [enums.ERYMOwnershipStatus.NotCataloged]: '(not cataloged)',
};

// [display value on Profile/Collection]: [RYM DB value]
// Only 2 values are used in the Profile/Collection
// `In collection` always has `format`
// `Wishlist` and `Used to own` are always shown no matter if `format` is set or not
export const RYMOwnershipAltToCode: Partial<Record<ERYMOwnershipAltText, ERYMOwnershipStatus>> = {
  [enums.ERYMOwnershipAltText.OnWishlist]: enums.ERYMOwnershipStatus.OnWishlist,
  [enums.ERYMOwnershipAltText.UsedToOwn]: enums.ERYMOwnershipStatus.UsedToOwn,
};

import backgroundNames from '@/config/background.json';
export const RECENT_TRACK_BACKGROUND_NAMES = backgroundNames as string[];
