import * as utils from './utils.js';

function parseArtistAndAlbum(metaContent) {
  const cleanContent = metaContent.replace(' - RYM/Sonemic', '');
  const parts = cleanContent.split(' by ');

  if (parts.length === 2) {
    return {
      releaseTitle: parts[0].trim(),
      artist: parts[1].trim()
    };
  } else {
    return {
      releaseTitle: null,
      artist: null
    };
  }
}

function getArtistAndAlbum() {
  const metaTag = document.querySelector('meta[property="og:title"]');
  if (metaTag) return parseArtistAndAlbum(metaTag.content);
  return { releaseTitle: null, artist: null };
}

chrome.storage.sync.get(['lastfmUsername', 'lastfmApiKey'], function(items) {
  if (items.lastfmUsername && items.lastfmApiKey) {
    const { artist, releaseTitle } = getArtistAndAlbum();

    fetchReleaseStats(items.lastfmUsername, items.lastfmApiKey, {
      artist,
      releaseTitle,
    });
  } else {
    console.log('Last.fm credentials not set. Please set them in the extension options.');
  }
});

function insertReleaseStats({ playcount, listeners, userplaycount, url }, label = 'Last.fm') {
  const infoTable = document.querySelector('.album_info tbody');

  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    th.classList.add('info_hdr');
    th.textContent = label;
    td.classList.add('release_pri_descriptors');
    td.colspan = "2";

    const playcountSpan = `<span title="${playcount}">${utils.formatNumber(parseInt(playcount))} plays</span>`;
    const listenersSpan = `<span title="${listeners}">${utils.formatNumber(parseInt(listeners))} listeners</span>`;
    const userplaycountSpan = `<strong title="${userplaycount} times">My scrobbles: ${utils.formatNumber(parseInt(userplaycount))}</strong>`;

    const link = `<a href=${url} target="_blank">View on Last.fm</a>`;

    td.innerHTML = [listenersSpan, playcountSpan, userplaycountSpan, link].join('&nbsp;&nbsp;|&nbsp;&nbsp;');

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

function fetchReleaseStats(username, apiKey, {
  artist,
  releaseTitle,
}) {
  const baseUrl = 'http://ws.audioscrobbler.com/2.0/';
  const params = new URLSearchParams({
      method: 'album.getInfo',
      user: username,
      artist: artist,
      album: releaseTitle,
      api_key: apiKey,
      format: 'json'
  });
  const url = `${baseUrl}?${params.toString()}`;

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const {
        playcount,
        listeners,
        userplaycount,
        url,
      } = data.album;

      insertReleaseStats({
        playcount,
        listeners,
        userplaycount,
        url,
      });
    })
    .catch(error => console.error('Error:', error));
}
