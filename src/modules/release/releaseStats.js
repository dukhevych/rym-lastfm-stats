import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

import './releaseStats.css';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let lastfmStatsCell;
let config;
let artistNames;
let detectedArtist;
let detectedReleaseTitle;
let releaseType;

const INFO_CONTAINER_SELECTOR = '.album_info tbody';
const INFO_ARTISTS_SELECTOR = '.album_info [itemprop="byArtist"] a';
const INFO_ALBUM_TITLE_SELECTOR = '.album_title';

function getArtistNames() {
  const artists = document.querySelectorAll(INFO_ARTISTS_SELECTOR);
  return Array.from(artists)
    .map((artist) => {
      const localizedName = artist.querySelector('.subtext');
      return localizedName ? localizedName.textContent.replace(/^\[|\]$/g, '') : artist.textContent;
    });
}

function getReleaseTitle() {
  const title = document.querySelector(INFO_ALBUM_TITLE_SELECTOR);
  if (!title) return null;
  return Array.from(title.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .join('');
}

function prepareReleaseStatsUI() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  if (!infoTable) return;

  const tr = document.createElement('tr');
  const th = document.createElement('th');

  const td = document.createElement('td');
  td.id = 'lastfm_data';

  th.classList.add('info_hdr');
  th.textContent = 'Last.fm';
  td.classList.add('release_pri_descriptors');
  td.colspan = '2';
  td.textContent = 'Loading...';

  tr.appendChild(th);
  tr.appendChild(td);

  infoTable.appendChild(tr);

  return td;
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  lastfmStatsCell.textContent = '';
  lastfmStatsCell.style.display = 'flex';
  lastfmStatsCell.style.alignItems = 'center';

  const listenersSpan =
    listeners !== undefined
      ? utils.createSpan(
          `${listeners} listeners ${cacheTimeHint}`,
          `${utils.shortenNumber(parseInt(listeners))} listeners`,
        )
      : null;
  const playcountSpan =
    playcount !== undefined
      ? utils.createSpan(
          `${playcount}, ${parseInt(playcount / listeners)} per listener ${cacheTimeHint}`,
          `${utils.shortenNumber(parseInt(playcount))} plays`,
        )
      : null;
  const userplaycountSpan =
    userplaycount !== undefined
      ? utils.createStrong(
          `${userplaycount} scrobbles`,
          `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`,
        )
      : null;

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.title = 'View on Last.fm';

  const lastfmIcon = document.createElement('img');
  lastfmIcon.src = browserAPI.runtime.getURL('images/lastfm-pic.png');

  lastfmIcon.alt = 'Last.fm';
  lastfmIcon.style.width = 'auto';
  lastfmIcon.style.height = '20px';
  lastfmIcon.style.display = 'block';

  link.appendChild(lastfmIcon);

  const elements = [
    listenersSpan,
    playcountSpan,
    userplaycountSpan,
    link,
  ].filter((x) => x);

  elements.forEach((element, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
      lastfmStatsCell.appendChild(separator);
    }
    lastfmStatsCell.appendChild(element);
  });
}

async function getArtistAndReleaseTitle() {
  const result = {
    override: {},
    original: {},
  };

  const override = await utils.storageGet(window.location.href);

  if (override) {
    result.override.artist = override.artist;
    result.override.releaseTitle = override.releaseTitle;
  }

  artistNames = artistNames ?? getArtistNames();
  detectedArtist = detectedArtist ?? artistNames[0];
  detectedReleaseTitle = detectedReleaseTitle ?? getReleaseTitle();

  result.original.artist = detectedArtist;
  result.original.releaseTitle = detectedReleaseTitle;

  return result;
}

function getReleaseType() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (!infoTable) return null;
  const releaseType = infoTable
    .querySelector('tr:nth-child(2) td')
    .textContent.toLowerCase().split(', ')[0];
  return releaseType;
}

async function render(_config) {
  if (!_config) return;

  config = _config;

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;

  const { original, override } = await getArtistAndReleaseTitle();

  const artist = override.artist || original.artist;
  const releaseTitle = override.releaseTitle || original.releaseTitle;

  const storageKey = `releaseStats_${artist}`;

  lastfmStatsCell = lastfmStatsCell ?? prepareReleaseStatsUI();

  if (!config.lastfmApiKey) {
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        console.log('Inserting cached lastfm data:', data);

        populateReleaseStats(data, timestamp);
        return;
      }
    }
  }

  releaseType = releaseType || getReleaseType();

  const data = await api.fetchReleaseStats(
    userName,
    config.lastfmApiKey || process.env.LASTFM_API_KEY,
    {
      artist,
      releaseTitle,
      releaseType,
    }
  );

  const releaseTypeDataMap = {
    album: 'album',
    single: 'track',
  };

  const { playcount, listeners, userplaycount, url } = data[releaseTypeDataMap[releaseType] ?? 'album'];

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
  };

  if (!config.lastfmApiKey) {
    localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), data: stats }));
  }

  populateReleaseStats(stats);

  if (lastfmStatsCell && config.lastfmApiKey) {
    const incorrectStatsWrapper = document.createElement('div');
    incorrectStatsWrapper.style.position = 'relative';
    incorrectStatsWrapper.style.marginLeft = 'auto';

    const searchLink = document.createElement('a');
    searchLink.href = '#';
    searchLink.textContent = 'Incorrect stats?';

    incorrectStatsWrapper.appendChild(searchLink);
    lastfmStatsCell.appendChild(incorrectStatsWrapper);

    const incorrectStatsPopup = document.createElement('div');
    incorrectStatsPopup.classList.add('incorrect-stats-popup');

    incorrectStatsWrapper.appendChild(incorrectStatsPopup);

    document.addEventListener(('click'), (event) => {
      if (!incorrectStatsWrapper.contains(event.target)) {
        incorrectStatsPopup.style.display = 'none';
      }
    });

    searchLink.addEventListener('click', async (event) => {
      event.preventDefault();

      const albums = await api.searchAlbum(
        config.lastfmApiKey,
        { artist: original.artist, albumTitle: original.releaseTitle },
      );

      if (albums && albums.results && albums.results.albummatches) {
        const { albummatches } = albums.results;
        const albumList = document.createElement('ul');
        albumList.classList.add('list-search-albums')
        albumList.style.listStyleType = 'none';
        albumList.style.padding = '0';
        albumList.style.margin = '0';

        albummatches.album.forEach((album) => {
          if (override) {
            if (override.artist + override.releaseTitle === album.artist + album.name) return;
          } else {
            if (album.artist + album.name === original.artist + original.releaseTitle) return;
          }

          const listItem = document.createElement('li');

          const link = document.createElement('a');
          link.href = '#';
          link.textContent = `${album.artist} - ${album.name}`;
          link.style.cursor = 'pointer';
          listItem.appendChild(link);

          link.dataset.artist = album.artist;
          link.dataset.album = album.name;

          albumList.appendChild(listItem);
        });

        albumList.addEventListener('click', async (e) => {
          const selectedArtist = e.target.dataset.artist;
          const selectedAlbum = e.target.dataset.album;

          if (selectedArtist && selectedAlbum) {
            await utils.storageSet({
              [window.location.href]: {
                artist: selectedArtist,
                releaseTitle: selectedAlbum,
              },
            });
            render(config)
          }
          incorrectStatsPopup.classList.remove('is-active');
        });

        incorrectStatsPopup.innerHTML = '';
        incorrectStatsPopup.appendChild(albumList);
        incorrectStatsPopup.classList.add('is-active');
      }

      console.log('Last.fm search results:', albums);
    });
  }

}

export default {
  render,
  targetSelectors: [INFO_CONTAINER_SELECTOR, INFO_ARTISTS_SELECTOR, INFO_ALBUM_TITLE_SELECTOR],
};
