import browser from 'webextension-polyfill';
import * as enums from '@/helpers/enums';

const manifest = browser.runtime.getManifest();
export const isDev = process.env.NODE_ENV === 'development';

// Interval constants for fetching data
export const RECENT_TRACKS_INTERVAL_MS = isDev ? (15 * 1000) : (2 * 60 * 1000); // 15 seconds / 2 minutes
export const RECENT_TRACKS_INTERVAL_MS_THROTTLED = RECENT_TRACKS_INTERVAL_MS / 2;
export const TOP_ALBUMS_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const TOP_ARTISTS_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
export const STATS_CACHE_LIFETIME_GUEST_MS = 3 * 60 * 60 * 1000; // 3 hours
export const STATS_CACHE_LIFETIME_MS = isDev ? 10 * 1000 : 10 * 60 * 1000; // 10 seconds /10 minutes

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

export const PROFILE_OPTIONS_DEFAULT = {
  recentTracks: true,
  recentTracksHistory: true,
  recentTracksShowOnLoad: false,
  recentTracksBackground: 1,
  recentTracksPollingEnabled: true,
  rymPlayHistoryHide: false,
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
export const RYM_ENTITY_CODES_INVERTED = Object.entries(RYM_ENTITY_CODES).reduce((acc: { [key: string]: string }, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as { [key: string]: string });

// Keywords to clean up album titles from additional information in parentheses or brackets
// (Deluxe Edition), (Remastered), [Digipack], (Live in London) etc.
export const EDITION_KEYWORDS = [
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
  're-issue',
  'live',
  'redux',
  'limited',
  'exclusive',
  'single',
  'ep',
  'special',
  'legacy',
  'collector',
  'anniversary',
  'instrumental',
  'ost',
  'soundtrack',
];

export const EDITION_KEYWORDS_REPLACE_PATTERN = new RegExp(
  `\\s*[\\[(]([^\\])]*\\b(?:${EDITION_KEYWORDS.join('|')})\\b[^\\])]*)[\\])]$`,
  'i'
);

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

export const RECENT_TRACK_BACKGROUND_NAMES = [
  'Clean',
  'Diagonal',
  'Mutiny',
  'Breathing',
  'Hypnosis',
  'Diagonal #2',
  'Star',
  'Grille',
  'Explosion',
  'Glitch',
  'Plaid',
  'Tiny rombo',
  'Diagonal #3',
  'Diagonal #4',
  'Vertical stripes',
  'Rombo',
  'Squares',
  'Horizontal stripes #1',
  'Horizontal stripes #2',
  'Flow',
  'EQ LG',
  'EQ SM inverted'
];
