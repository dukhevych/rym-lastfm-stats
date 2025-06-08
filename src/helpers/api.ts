import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

interface FetchUserDataByNameParams {
  username: string;
  apiKey: string;
}

interface LastFmUser {
  id: string;
  name: string;
  realname?: string;
  url: string;
  country?: string;
  age?: string;
  gender?: string;
  subscriber?: string;
  playcount?: string;
  playlists?: string;
  bootstrap?: string;
  registered?: {
    unixtime: string;
    '#text': string;
  };
  image?: Array<{
    size: string;
    '#text': string;
  }>;
  type?: string;
}

interface LastFmUserResponse {
  user: LastFmUser;
}

export function fetchUserDataByName(
  username: string,
  apiKey: string
): Promise<LastFmUser | undefined> {
  if (!username) {
    return Promise.reject(new Error('No username provided.'));
  }

  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  const _params = {
    method: 'user.getinfo',
    user: username,
    api_key: apiKey,
    format: 'json',
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json() as Promise<LastFmUserResponse>)
    .then((data) => data.user)
    .catch((error) => {
      console.error('Error:', error);
      return undefined;
    });
}

interface FetchUserDataParams {
  lastfmSession: string;
  apiKey: string;
}

interface LastFmUser {
  id: string;
  name: string;
  realname?: string;
  url: string;
  country?: string;
  age?: string;
  gender?: string;
  subscriber?: string;
  playcount?: string;
  playlists?: string;
  bootstrap?: string;
  registered?: {
    unixtime: string;
    '#text': string;
  };
  image?: Array<{
    size: string;
    '#text': string;
  }>;
  type?: string;
}

interface LastFmUserResponse {
  user: LastFmUser;
}

export function fetchUserData(
  lastfmSession: string,
  apiKey: string
): Promise<LastFmUser | undefined> {
  const _params = {
    method: 'user.getinfo',
    api_key: apiKey,
    format: 'json',
    sk: lastfmSession,
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json() as Promise<LastFmUserResponse>)
    .then((data) => data.user)
    .catch((error) => {
      console.error('Error:', error);
      return undefined;
    });
}

interface FetchUserTopAlbumsOptions {
  limit?: number;
  period?: string;
}

interface LastFmTopAlbumArtist {
  name: string;
  mbid?: string;
  url: string;
}

interface LastFmTopAlbum {
  name: string;
  playcount: string;
  mbid?: string;
  url: string;
  artist: LastFmTopAlbumArtist;
  image: Array<{
    size: string;
    '#text': string;
  }>;
}

interface LastFmTopAlbumsResponse {
  topalbums: {
    album: LastFmTopAlbum[];
  };
}

export function fetchUserTopAlbums(
  username: string,
  apiKey: string,
  { limit = 8, period = '1month' }: FetchUserTopAlbumsOptions = {},
): Promise<LastFmTopAlbum[] | undefined> {
  if (!username) {
    return Promise.reject(new Error('No username provided.'));
  }

  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  const _params = {
    method: 'user.gettopalbums',
    user: username,
    api_key: apiKey,
    format: 'json',
    period,
    limit: limit.toString(),
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json() as Promise<LastFmTopAlbumsResponse>)
    .then((data) => {
      return data.topalbums.album;
    })
    .catch((error) => {
      console.error('Error:', error);
      return undefined;
    });
}

interface FetchUserTopArtistsOptions {
  limit?: number;
  period?: string;
}

interface LastFmTopArtistImage {
  size: string;
  '#text': string;
}

interface LastFmTopArtist {
  name: string;
  playcount: string;
  listeners: string;
  mbid?: string;
  url: string;
  streamable: string;
  image: LastFmTopArtistImage[];
}

interface LastFmTopArtistsResponse {
  topartists: {
    artist: LastFmTopArtist[];
  };
}

export function fetchUserTopArtists(
  username: string,
  apiKey: string,
  { limit = 8, period = '1month' }: FetchUserTopArtistsOptions = {},
): Promise<LastFmTopArtist[] | undefined> {
  if (!username) {
    return Promise.reject(new Error('No username provided.'));
  }

  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  const _params = {
    method: 'user.gettopartists',
    user: username,
    api_key: apiKey,
    format: 'json',
    period,
    limit: limit.toString(),
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json() as Promise<LastFmTopArtistsResponse>)
    .then((data) => {
      return data.topartists.artist;
    })
    .catch((error) => {
      console.error('Error:', error);
      return undefined;
    });
}

interface FetchArtistStatsParams {
  artist: string;
}

interface LastFmArtistTag {
  name: string;
  url: string;
}

interface LastFmArtistStats {
  listeners: string;
  playcount: string;
}

interface LastFmArtistBio {
  links: {
    link: {
      href: string;
      rel: string;
      "#text": string;
    }
  };
  published: string;
  summary: string;
  content: string;
}

interface LastFmArtist {
  name: string;
  mbid?: string;
  url: string;
  image: Array<{
    "#text": string;
    size: string;
  }>;
  streamable: string;
  ontour: string;
  stats: LastFmArtistStats;
  similar?: {
    artist: Array<{
      name: string;
      url: string;
      image: Array<{
        "#text": string;
        size: string;
      }>;
    }>;
  };
  tags?: {
    tag: LastFmArtistTag[];
  };
  bio?: LastFmArtistBio;
  userplaycount?: string;
}

interface LastFmArtistResponse {
  artist: LastFmArtist;
}

interface ArtistStatsCacheData {
  data: LastFmArtistResponse;
  lastDate: number;
}

export async function fetchArtistStats(
  username: string | undefined,
  apiKey: string,
  { artist }: FetchArtistStatsParams
): Promise<LastFmArtistResponse> {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  if (!artist) {
    return Promise.reject(new Error('No artist provided.'));
  }

  const _params: Record<string, string> = {
    method: 'artist.getInfo',
    artist: artist,
    api_key: apiKey,
    format: 'json',
  };

  if (username) {
    _params.user = username;
  }

  const params = new URLSearchParams(_params);
  const url = `${BASE_URL}?${params.toString()}`;

  const cacheKey = `artistStats_${artist}`;
  const now = new Date().getTime();

  const cachedData = await utils.storageGet(cacheKey, 'local');

  if (cachedData && typeof cachedData === 'object') {
    const parsedData = cachedData as ArtistStatsCacheData;
    const cacheAge = now - parsedData.lastDate;

    if (
      (username && cacheAge < constants.STATS_CACHE_LIFETIME_MS)
      || cacheAge < constants.STATS_CACHE_LIFETIME_GUEST_MS
    ) {
      console.log('Using cached data');
      return parsedData.data;
    } else {
      await utils.storageRemove(cacheKey, 'local');
    }
  }

  const response = await fetch(url);
  const data = await response.json() as LastFmArtistResponse;

  const cacheObject: Record<string, ArtistStatsCacheData> = {};

  cacheObject[cacheKey] = { data, lastDate: now };

  await utils.storageSet(cacheObject, 'local');

  return data;
}

interface FetchReleaseStatsParams {
  artist: string;
  releaseTitle: string;
  releaseType: 'album' | 'single';
}

interface LastFmReleaseResponse {
  album?: any;
  track?: any;
  error?: number;
  message?: string;
}

interface ReleaseStatsCacheData {
  data: LastFmReleaseResponse;
  lastDate: number;
}

export async function fetchReleaseStats(
  username: string | undefined,
  apiKey: string,
  { artist, releaseTitle, releaseType }: FetchReleaseStatsParams
): Promise<LastFmReleaseResponse | null> {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  if (!artist) {
    return Promise.reject(new Error('No artist provided.'));
  }

  if (!releaseTitle) {
    return Promise.reject(new Error('No release title provided.'));
  }

  let cacheKey = `releaseStats_${artist}_${releaseTitle}`;
  if (username) cacheKey += `_${username}`;

  const cachedData = await utils.storageGet(cacheKey, 'local');

  let now = Date.now();

  if (cachedData && typeof cachedData === 'object' && cachedData[cacheKey]) {
    const parsedData = cachedData[cacheKey] as ReleaseStatsCacheData;
    const cacheAge = now - parsedData.lastDate;

    if (
      (username && cacheAge < constants.STATS_CACHE_LIFETIME_MS)
      || cacheAge < constants.STATS_CACHE_LIFETIME_GUEST_MS
    ) {
      return parsedData.data;
    } else {
      await utils.storageRemove(cacheKey, 'local');
    }
  }

  const methods: Record<string, string> = {
    album: 'album.getInfo',
    single: 'track.getInfo',
  };

  const method = methods[releaseType] || methods.album;

  const _params: Record<string, string> = {
    method,
    api_key: apiKey,
    artist,
    format: 'json',
  };

  if (username) _params.user = username;

  _params[method.split('.')[0]] = releaseTitle;

  let data: LastFmReleaseResponse | null = null;

  const params = new URLSearchParams(_params);
  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetch(url);

  try {
    data = await response.json() as LastFmReleaseResponse;

    if (data.error) {
      console.warn(`Error fetching data for "${artist}" - "${releaseTitle}"`, data.error, data.message);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching data for artist: ${artist}`, error);
    return null;
  }

  if (data.error) {
    return null;
  }

  now = Date.now();

  await utils.storageSet({ [cacheKey]: { data, lastDate: now } as ReleaseStatsCacheData }, 'local');

  return data;
}

interface SearchReleaseParams {
  artists: string[];
  releaseTitle: string;
}

interface LastFmAlbumMatchImage {
  size: string;
  '#text': string;
}

interface LastFmAlbumMatch {
  name: string;
  artist: string;
  url: string;
  image: LastFmAlbumMatchImage[];
  mbid?: string;
}

interface LastFmAlbumMatches {
  album: LastFmAlbumMatch[];
}

interface LastFmAlbumSearchResults {
  albummatches: LastFmAlbumMatches;
}

interface LastFmAlbumSearchResponse {
  results?: LastFmAlbumSearchResults;
  error?: number;
  message?: string;
}

export async function searchRelease(
  apiKey: string,
  { artists, releaseTitle }: SearchReleaseParams,
): Promise<LastFmAlbumMatch[] | null> {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }
  if (!artists || artists.length === 0) {
    return Promise.reject(new Error('No artist provided.'));
  }
  if (!releaseTitle || releaseTitle.trim() === '' || typeof releaseTitle !== 'string') {
    return Promise.reject(new Error('No album title provided.'));
  }

  let result: LastFmAlbumMatch[] | null = null;

  for (const artist of artists) {
    const _params = {
      method: 'album.search',
      album: `${artist} ${releaseTitle}`,
      api_key: apiKey,
      limit: '5',
      format: 'json',
    };

    const params = new URLSearchParams(_params);
    const url = `${BASE_URL}?${params.toString()}`;
    const response: LastFmAlbumSearchResponse = await (await fetch(url)).json();

    if (response.error) {
      console.warn(`Error fetching data for "${artist} - ${releaseTitle}"`, response.error, response.message);
      await utils.wait(500);
      continue;
    }

    const albums = response.results?.albummatches?.album;

    if (!albums || albums.length === 0) {
      console.warn(`No albums found for "${artist} - ${releaseTitle}"`);
      await utils.wait(500);
      continue;
    }

    result = albums;

    break;
  }

  return result;
}
