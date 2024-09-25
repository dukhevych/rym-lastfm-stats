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

export const TOP_ALBUMS_PERIOD_OPTIONS = [
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

export const TOP_ALBUMS_PERIOD_LABELS_MAP = TOP_ALBUMS_PERIOD_OPTIONS.reduce(
  (acc, { value, label }) => {
    acc[value] = label;
    return acc;
  },
  {},
);

export const TOP_ALBUMS_PERIOD_DEFAULT = '1month';
export const TOP_ALBUMS_LIMIT_MIN = 4;
export const TOP_ALBUMS_LIMIT_MAX = 8;
export const TOP_ALBUMS_LIMIT_DEFAULT = 8;

export const RECENT_TRACKS_LIMIT_MIN = 1;
export const RECENT_TRACKS_LIMIT_MAX = 20;
export const RECENT_TRACKS_LIMIT_DEFAULT = 10;

export const OPTIONS_DEFAULT = {
  lastfmApiKey: '',
  lastfmUsername: '',

  // ARTIST PAGE
  artistStats: true,

  // RELEASE PAGE
  releaseStats: true,

  // PROFILE PAGE
  recentTracks: true,
  recentTracksReplace: false,
  recentTracksLimit: RECENT_TRACKS_LIMIT_DEFAULT,
  topAlbums: true,
  topAlbumsLimit: TOP_ALBUMS_LIMIT_DEFAULT,
  topAlbumsPeriod: TOP_ALBUMS_PERIOD_DEFAULT,

  // SEARCH PAGE
  searchStrict: true,
};

export const OPTIONS_DEFAULT_KEYS = Object.keys(OPTIONS_DEFAULT);
