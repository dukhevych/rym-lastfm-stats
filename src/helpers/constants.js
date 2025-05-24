export const RYM_DB_VERSION = 2;

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export const isDev = process.env.NODE_ENV === 'development';

export const LASTFM_COLOR = '#f71414';

export const RYM_DB_NAME = 'rymExportDB';

export const RYM_DB_STORE_NAME = 'rymExportStore';

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

export const THEMES = {};

LIGHT_THEME_CLASSES.reduce((acc, theme) => {
  acc[theme] = 'light';
  return acc;
}, THEMES);

DARK_THEME_CLASSES.reduce((acc, theme) => {
  acc[theme] = 'dark';
  return acc;
}, THEMES);

export const PERIOD_OPTIONS = [
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
  (acc, { value, label }) => {
    acc[value] = label;
    return acc;
  },
  {},
);

export const TOP_ALBUMS_PERIOD_DEFAULT = '1month';

export const TOP_ARTISTS_PERIOD_DEFAULT = '12month';
export const TOP_ARTISTS_LIMIT_MIN = 5;
export const TOP_ARTISTS_LIMIT_MAX = 10;
export const TOP_ARTISTS_LIMIT_DEFAULT = 5;

export const RECENT_TRACKS_LIMIT_MIN = 1;
export const RECENT_TRACKS_LIMIT_MAX = 20;
export const RECENT_TRACKS_LIMIT_DEFAULT = 10;

export const PROFILE_OPTIONS_DEFAULT = {
  recentTracks: true,
  recentTracksShowOnLoad: false,
  recentTracksReplace: true,
  recentTracksReplaceBackground: 1,
  recentTracksLimit: RECENT_TRACKS_LIMIT_DEFAULT,
  topArtists: true,
  topArtistsLimit: TOP_ARTISTS_LIMIT_DEFAULT,
  topArtistsPeriod: TOP_ARTISTS_PERIOD_DEFAULT,
  topAlbums: true,
  topAlbumsPeriod: TOP_ALBUMS_PERIOD_DEFAULT,
  parseOtherProfiles: false,
}

export const OPTIONS_DEFAULT = {
  lastfmApiKey: '',
  ...PROFILE_OPTIONS_DEFAULT,
};

export const OPTIONS_DEFAULT_KEYS = Object.keys(OPTIONS_DEFAULT);

export const RECENT_TRACKS_INTERVAL_MS = isDev ? 10000 : 120000;

export const RECENT_TRACKS_INTERVAL_MS_THROTTLED = RECENT_TRACKS_INTERVAL_MS / 2;

export const TOP_ALBUMS_INTERVAL_MS = 120000;

export const TOP_ARTISTS_INTERVAL_MS = 120000;

const manifest = browserAPI.runtime.getManifest();

export const APP_VERSION = manifest.version;

export const APP_NAME = manifest.name;

export const APP_NAME_SLUG = APP_NAME.replace(/\s+/g, '-').toLowerCase();

export const STATS_CACHE_LIFETIME_GUEST_MS = 24 * 60 * 60 * 1000; // 24 hours
export const STATS_CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

export const RYM_ENTITY_CODES = {
  artist: 'a',
  release: 'l',
  song: 'z',

  // Uncomment these if needed in the future
  // y: 'v/a release',
  // b: 'label',
  // h: 'genre',
  // u: 'user',
  // s: 'list',
}

export const RYM_ENTITY_CODES_INVERTED = Object.entries(RYM_ENTITY_CODES).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

export const REPLACE_KEYWORDS = [
  'deluxe',
  'version',
  'digipack',
  'edition',
  'bonus',
  'expanded',
  'remaster',
  'remastered',
  'reissue',
  'redux',
  'limited',
  'exclusive',
  'special',
  'legacy',
  'collector',
  'anniversary',
];

export const KEYWORDS_REPLACE_PATTERN = new RegExp(
  `\\s*[\\[(]([^\\])]*\\b(?:${REPLACE_KEYWORDS.join('|')})\\b[^\\])]*)[\\])]$`,
  'i'
);
