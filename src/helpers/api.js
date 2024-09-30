const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export function fetchUserRecentTracks(username, apiKey, { limit = 5 } = {}) {
  if (!username) {
    return Promise.reject(new Error('No username provided.'));
  }

  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';

  const _params = {
    method: 'user.getrecenttracks',
    user: username,
    api_key: apiKey,
    format: 'json',
    limit,
    nowplaying: true,
  };

  const params = new URLSearchParams(_params);

  const url = `${baseUrl}?${params.toString()}`;

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

  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';

  const _params = {
    method: 'user.gettopalbums',
    user: username,
    api_key: apiKey,
    format: 'json',
    period,
    limit,
  };

  const params = new URLSearchParams(_params);

  const url = `${baseUrl}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data.topalbums.album;
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

  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';

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
  const url = `${baseUrl}?${params.toString()}`;

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

        // if (cacheAge < 86400000) {
        if (cacheAge < 300000) {
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

export function fetchReleaseStats(username, apiKey, { artist, releaseTitle }) {
  if (!apiKey) {
    return Promise.reject(new Error('No API key provided.'));
  }

  if (!artist) {
    return Promise.reject(new Error('No artist provided.'));
  }

  if (!releaseTitle) {
    return Promise.reject(new Error('No release title provided.'));
  }

  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  const _params = {
    method: 'album.getInfo',
    artist: artist,
    album: releaseTitle,
    api_key: apiKey,
    format: 'json',
  };

  if (username) {
    _params.user = username;
  }

  const params = new URLSearchParams(_params);
  const url = `${baseUrl}?${params.toString()}`;

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

        // Check if cached data is older than 24 hours (86400000 milliseconds)
        if (cacheAge < 86400000) {
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
