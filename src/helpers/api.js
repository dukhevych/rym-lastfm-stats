import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

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
      return data.recenttracks.track;
    })
    .catch((error) => console.error('Error:', error));
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

  if (cachedData) {
    const parsedData = JSON.parse(cachedData);
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

  console.log('Fetching new data');

  const response = await fetch(url);
  const data = await response.json();

  const cacheObject = {};

  cacheObject[cacheKey] = JSON.stringify({ data, lastDate: now });

  await utils.storageSet(cacheObject, 'local');

  return data;
}

export async function fetchReleaseStats(
  username,
  apiKey,
  { artists, releaseTitle, releaseType },
) {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  if (!artists || artists.length === 0) {
    return Promise.reject(new Error('No artists provided.'));
  }

  if (!releaseTitle) {
    return Promise.reject(new Error('No release title provided.'));
  }

  const cacheKeys = artists.map((artist) => `releaseStats_${artist}_${releaseTitle}`);
  const cachedData = await utils.storageGet(cacheKeys, 'local');
  const cacheKey = Object.keys(cachedData).find((key) => cachedData[key] !== undefined);

  if (cachedData && cacheKey) {
    const now = new Date().getTime();
    const parsedData = JSON.parse(cachedData[cacheKey]);
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
    format: 'json',
  };

  if (releaseType === 'album') {
    _params.album = releaseTitle;
  } else if (releaseType === 'single') {
    _params.track = releaseTitle;
  } else {
    _params.album = releaseTitle;
  }

  if (username) {
    _params.user = username;
  }

  let data = null;
  let matchedArtist = null;

  const artistVariants = new Set(artists);

  artists.forEach((artist) => {
    artistVariants.add(artist.split(' & ').join(' and '));
    artistVariants.add(artist.split(' and ').join(' & '));
  });

  for (const artist of Array.from(artistVariants)) {
    try {
      const params = new URLSearchParams({
        ..._params,
        artist,
      });
      const url = `${BASE_URL}?${params.toString()}`;
      const response = await fetch(url);
      data = await response.json();

      if (data.error) {
        console.warn(`Error fetching data for ${artist}`, data.error, data.message);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      matchedArtist = artist;
      break;
    } catch (error) {
      console.error(`Error fetching data for artist: ${artist}`, error);
    }
  }

  if (data.error) {
    console.error('No data found for any artist.');
    return null;
  }

  const newCacheKey = `releaseStats_${matchedArtist}_${releaseTitle}`;
  const now = new Date().getTime();

  const cacheObject = {};

  cacheObject[newCacheKey] = JSON.stringify({ data, lastDate: now });

  await utils.storageSet(cacheObject, 'local');

  return data;
}
