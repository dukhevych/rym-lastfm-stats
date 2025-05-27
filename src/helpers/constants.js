const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const manifest = browserAPI.runtime.getManifest();

export const isDev = process.env.NODE_ENV === 'development';

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

export const THEMES = {};

LIGHT_THEME_CLASSES.reduce((acc, theme) => {
  acc[theme] = 'light';
  return acc;
}, THEMES);

DARK_THEME_CLASSES.reduce((acc, theme) => {
  acc[theme] = 'dark';
  return acc;
}, THEMES);

// Last.fm api values
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
}, {});

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
}

export const OPTIONS_DEFAULT = {
  lastfmApiKey: '',
  ...PROFILE_OPTIONS_DEFAULT,
};

// Interval constants for fetching data
export const RECENT_TRACKS_INTERVAL_MS = isDev ? 10000 : 120000; // 10 seconds / 2 minutes
export const RECENT_TRACKS_INTERVAL_MS_THROTTLED = RECENT_TRACKS_INTERVAL_MS / 2;
export const TOP_ALBUMS_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const TOP_ARTISTS_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const STATS_CACHE_LIFETIME_GUEST_MS = 24 * 60 * 60 * 1000; // 24 hours
export const STATS_CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

// [Addon entity type]: [RYM entity code]
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

// [RYM entity code]: [Addon entity type]
export const RYM_ENTITY_CODES_INVERTED = Object.entries(RYM_ENTITY_CODES).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

// Keywords to clean up album titles from additional information in parentheses or brackets
// (Deluxe Edition), (Remastered), [Digipack], (Live in London) etc.
export const REPLACE_KEYWORDS = [
  'deluxe',
  'version',
  'digipack',
  'edition',
  'part',
  'bonus',
  'expanded',
  'remaster',
  'remastered',
  'reissue',
  'live',
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

// [DB value]: [display value]
export const RYM_FORMATS = {
  'CD': 'CD',
  'LP': 'Vinyl',
  'MP3': 'Digital',
  'CD-R': 'CD-R',
  'Cassette': 'Cassette',
  'DVD-A': 'DVD-A',
  'SACD': 'SACD',
  'Minidisc': 'Minidisc',
  'Multiple': 'Multiple',
  '8-Track': '8-track',
  'Other': 'Other',
};

// [display value]: [RYM DB value]
export const RYM_FORMATS_INVERTED = Object.entries(RYM_FORMATS).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

// [DB value]: [display value]
export const RYM_OWNERSHIP_TYPES = {
  o: 'In collection',
  w: 'On wishlist',
  u: 'Used to own',
  n: '(not cataloged)',
};

// [display value on Profile/Collection]: [RYM DB value]
// Only 2 values are used in the Profile/Collection
// `In collection` always has `format`
// `Wishlist` and `Used to own` are always shown no matter if `format` is set or not
export const RYM_OWNERSHIP_TYPES_EXTRA_LABELS = {
  'Wishlist': 'w',
  'Used to Own': 'u',
};
