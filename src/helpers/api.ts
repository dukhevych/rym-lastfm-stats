const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

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
  album_count?: string;
  artist_count?: string;
  track_count?: string;
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
