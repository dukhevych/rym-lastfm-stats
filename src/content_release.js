const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

import * as utils from './helpers/utils.js';

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

browserAPI.storage.sync.get(['lastfmUsername', 'lastfmApiKey'])
  .then(function(items) {
    const { artist, releaseTitle } = getArtistAndAlbum();

    if (items.lastfmApiKey) {
      fetchReleaseStats(items.lastfmUsername, items.lastfmApiKey, {
        artist,
        releaseTitle,
      });
    } else {
      insertDummyLink(artist, releaseTitle);
      console.log('Last.fm credentials not set. Please set them in the extension options.');
    }
  });

function insertDummyLink(artist, releaseTitle) {
  const infoTable = document.querySelector('.album_info tbody');

  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    th.classList.add('info_hdr');
    th.textContent = 'Last.fm';
    td.classList.add('release_pri_descriptors');
    td.colspan = "2";

    const url = 'https://www.last.fm/music/' + encodeURIComponent(artist) + '/' + encodeURIComponent(releaseTitle);

    const link = utils.createLink(url, 'View on Last.fm');

    td.appendChild(link);

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

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

    const listenersSpan = listeners !== undefined ? utils.createSpan(`${listeners} listeners`, `${utils.shortenNumber(parseInt(listeners))} listeners`) : null;
    const playcountSpan = playcount !== undefined ? utils.createSpan(`${playcount}, ${parseInt(playcount / listeners)} per listener`, `${utils.shortenNumber(parseInt(playcount))} plays`) : null;
    const userplaycountSpan = userplaycount !== undefined ? utils.createStrong(`${userplaycount} scrobbles`, `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`) : null;
    const link = utils.createLink(url, 'View on Last.fm');

    const elements = [listenersSpan, playcountSpan, userplaycountSpan, link].filter(x => x);

    elements.forEach((element, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
        td.appendChild(separator);
      }
      td.appendChild(element);
    });

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

function fetchReleaseStats(username, apiKey, {
  artist,
  releaseTitle,
}) {
  const baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  const _params = {
    method: 'album.getInfo',
    artist: artist,
    album: releaseTitle,
    api_key: apiKey,
    format: 'json'
  };

  if (username) {
    _params.user = username;
  }

  const params = new URLSearchParams(_params);

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
