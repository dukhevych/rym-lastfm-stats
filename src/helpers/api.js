import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export function fetchUserDataByName(username, apiKey) {
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
    .then((response) => response.json())
    .then((data) => data.user)
    .catch((error) => console.error('Error:', error));
}

export function fetchUserData(lastfmSession, apiKey) {
  const _params = {
    method: 'user.getinfo',
    api_key: apiKey,
    format: 'json',
    sk: lastfmSession,
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => data.user)
    .catch((error) => console.error('Error:', error));
}

export function fetchUserRecentTracks(username, apiKey, { limit = 5 } = {}, signal) {
  if (!username) {
    return Promise.reject(new Error('No username provided.'));
  }

  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  const _params = {
    method: 'user.getrecenttracks',
    user: username,
    api_key: apiKey,
    format: 'json',
    limit,
    nowplaying: true,
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url, { signal })
    .then((response) => response.json())
    .then((data) => {
      return data.recenttracks?.track || data;
    });
}

export function fetchUserTopAlbums(
  username,
  apiKey,
  { limit = 8, period = '1month' } = {},
) {
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
    limit,
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data.topalbums.album;
    })
    .catch((error) => console.error('Error:', error));
}

export function fetchUserTopArtists(
  username,
  apiKey,
  { limit = 8, period = '1month' } = {},
) {
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
    limit,
  };

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data.topartists.artist;
    })
    .catch((error) => console.error('Error:', error));
}

export async function fetchArtistStats(username, apiKey, { artist }) {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  if (!artist) {
    return Promise.reject(new Error('No artist provided.'));
  }

  const _params = {
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
    const parsedData = cachedData;
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
  const data = await response.json();

  const cacheObject = {};

  cacheObject[cacheKey] = { data, lastDate: now };

  await utils.storageSet(cacheObject, 'local');

  return data;
}

export async function fetchReleaseStats(
  username,
  apiKey,
  { artist, releaseTitle, releaseType },
) {
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
    const parsedData = cachedData[cacheKey];
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

  const methods = {
    album: 'album.getInfo',
    single: 'track.getInfo',
  };

  const method = methods[releaseType] || methods.album;

  const _params = {
    method,
    api_key: apiKey,
    artist,
    format: 'json',
  };

  if (username) _params.user = username;

  _params[method.split('.')[0]] = releaseTitle;

  let data = null;

  const params = new URLSearchParams(_params);
  const url = `${BASE_URL}?${params.toString()}`;
  const response = await fetch(url);

  try {
    data = await response.json();

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

  await utils.storageSet({ [cacheKey]: { data, lastDate: now } }, 'local');

  return data;
}

export async function searchRelease(
  apiKey,
  { artists, releaseTitle },
) {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }
  if (!artists || artists.length === 0) {
    return Promise.reject(new Error('No artist provided.'));
  }
  if (!releaseTitle || releaseTitle.trim() === '' || typeof releaseTitle !== 'string') {
    return Promise.reject(new Error('No album title provided.'));
  }

  let result = null;

  for (const artist of artists) {
    const _params = {
      method: 'album.search',
      album: `${artist} ${releaseTitle}`,
      api_key: apiKey,
      limit: 5,
      format: 'json',
    };

    const params = new URLSearchParams(_params);
    const url = `${BASE_URL}?${params.toString()}`;
    const response = await (await fetch(url)).json();

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
