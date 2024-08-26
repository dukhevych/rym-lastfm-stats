export function fetchUserRecentTracks(username, apiKey, { limit = 5 } = {}) {
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

  return fetch(url)
    .then((response) => response.json())
    .catch((error) => console.error('Error:', error));
}

export function fetchReleaseStats(username, apiKey, { artist, releaseTitle }) {
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

  return fetch(url)
    .then((response) => response.json())
    .catch((error) => console.error('Error:', error));
}
