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
