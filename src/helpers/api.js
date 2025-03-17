const CACHE_LIFETIME = 86400000;

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

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

export function fetchUserRecentTracks(username, apiKey, { limit = 5 } = {}) {
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

  return fetch(url)
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

export function fetchArtistStats(username, apiKey, { artist }) {
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

  if (username) {
    return fetch(url)
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error:', error);
      throw error;
    });
  }

  const cacheKey = `artistStats_${artist}`;
  const now = new Date().getTime();

  return new Promise((resolve, reject) => {
    browserAPI.storage.local.get([cacheKey], (result) => {
      if (browserAPI.runtime.lastError) {
        return reject(browserAPI.runtime.lastError);
      }

      const cachedData = result[cacheKey];
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheAge = now - parsedData.lastDate;

        if (cacheAge < CACHE_LIFETIME) {
          return resolve(parsedData.data);
        }
      }

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const cacheObject = {};
          cacheObject[cacheKey] = JSON.stringify({ data, lastDate: now });
          browserAPI.storage.local.set(cacheObject, () => {
            if (browserAPI.runtime.lastError) {
              return reject(browserAPI.runtime.lastError);
            }
            resolve(data);
          });
        })
        .catch((error) => {
          console.error('Error:', error);
          reject(error);
        });
    });
  });
}

export function fetchReleaseStats(
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

  const methods = {
    album: 'album.getInfo',
    single: 'track.getInfo',
  };

  const method = methods[releaseType] || methods.album;

  const _params = {
    method,
    artist: artist,
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

  const params = new URLSearchParams(_params);

  const url = `${BASE_URL}?${params.toString()}`;

  if (username) {
    return fetch(url)
      .then((response) => response.json())
      .catch((error) => {
        console.error('Error:', error);
        throw error;
      });
  }

  const cacheKey = `releaseStats_${artist}_${releaseTitle}`;
  const now = new Date().getTime();

  return new Promise((resolve, reject) => {
    browserAPI.storage.local.get([cacheKey], (result) => {
      if (browserAPI.runtime.lastError) {
        return reject(browserAPI.runtime.lastError);
      }

      const cachedData = result[cacheKey];
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheAge = now - parsedData.lastDate;

        if (cacheAge < CACHE_LIFETIME) {
          return resolve(parsedData.data);
        }
      }

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          const cacheObject = {};
          cacheObject[cacheKey] = JSON.stringify({ data, lastDate: now });
          browserAPI.storage.local.set(cacheObject, () => {
            if (browserAPI.runtime.lastError) {
              return reject(browserAPI.runtime.lastError);
            }
            resolve(data);
          });
        })
        .catch((error) => {
          console.error('Error:', error);
          reject(error);
        });
    });
  });
}
