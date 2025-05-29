import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';
import * as constants from '@/helpers/constants.js';
import { createElement as h } from '@/helpers/utils.js';

import './releaseStats.css';

import {
  INFO_CONTAINER_SELECTOR,
  INFO_ARTISTS_SELECTOR,
  INFO_ALBUM_TITLE_SELECTOR,
  getArtistNames,
  getReleaseTitle,
  getReleaseType,
} from './targets.js';

const uiElements = {};

function prepareReleaseStatsUI() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (!infoTable) return;

  uiElements.infoTable = infoTable;

  uiElements.statsList = h('ul', { className: 'list-stats' }, [
    uiElements.listeners = h('li', { className: 'is-listeners' }, 'listeners'),
    uiElements.playcount = h('li', { className: 'is-playcount' }, 'plays'),
    uiElements.userplaycount = h('li', { className: 'is-user-playcount' })
  ]);

  uiElements.lastfmLink = h(
    'a',
    {
      className: 'lastfm-link',
      target: '_blank',
      title: 'View on Last.fm'
    },
    utils.createSvgUse('svg-lastfm-square-symbol')
  );

  uiElements.statsWrapper = h(
    'div',
    { className: ['list-stats-wrapper', 'is-loading'] },
    [uiElements.statsList, uiElements.lastfmLink]
  );

  uiElements.heading = h('th', { className: 'info_hdr' }, 'Last.fm');

  uiElements.content = h(
    'td',
    { className: 'release_pri_descriptors', colspan: '2' },
    uiElements.statsWrapper
  );

  uiElements.tr = h('tr', {}, [uiElements.heading, uiElements.content]);

  infoTable.appendChild(uiElements.tr);
}

function setNoFound() {
  if (!uiElements.statsWrapper) return;
  uiElements.statsWrapper.classList.add('not-found');
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  uiElements.statsWrapper.classList.remove('is-loading');

  if (listeners !== undefined) {
    uiElements.listeners.style.display = 'block';
    uiElements.listeners.title = `${listeners} listeners ${cacheTimeHint}`;
    uiElements.listeners.dataset.value = utils.shortenNumber(parseInt(listeners));
  } else {
    uiElements.listeners.style.display = 'none';
  }

  if (playcount !== undefined && listeners !== undefined) {
    uiElements.playcount.style.display = 'block';
    uiElements.playcount.title = `${playcount}, ${parseInt(playcount / listeners)} per listener ${cacheTimeHint}`;
    uiElements.playcount.dataset.value = utils.shortenNumber(parseInt(playcount));
  } else {
    uiElements.listeners.style.display = 'block';
  }

  if (userplaycount !== undefined) {
    uiElements.userplaycount.style.display = 'block';
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`;
  } else {
    uiElements.userplaycount.style.display = 'none';
  }

  uiElements.lastfmLink.href = url;
}

async function render(config) {
  if (!config) return;

  const artistNames = getArtistNames();

  if (constants.isDev) console.log('Parsed artists:', artistNames);

  const artists = artistNames.map((artist) => {
    const { artistName, artistNameLocalized } = artist;
    return artistNameLocalized || artistName;
  });

  const releaseTitle = getReleaseTitle();

  if (artists.length === 0 || !releaseTitle) {
    console.error('No artist or release title found.');
    return;
  }

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;
  const storageKey = `releaseStats_${artists.join('_')}`;

  prepareReleaseStatsUI();

  if (!config.lastfmApiKey) {
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        populateReleaseStats(data, timestamp);
        return;
      }
    }
  }

  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  const releaseType = infoTable
    .querySelector('tr:nth-child(2) td')
    .textContent.toLowerCase().split(', ')?.[0];

  const data = await api.fetchReleaseStats(
    userName,
    config.lastfmApiKey || process.env.LASTFM_API_KEY,
    {
      artists,
      releaseTitle,
      releaseType,
    }
  );

  if (!data || Object.keys(data).length === 0) {
    console.warn('No data found for the specified artists/release', artists, releaseTitle);
    setNoFound();
    return;
  }

  const releaseTypeDataMap = {
    album: 'album',
    single: 'track',
  };

  const releaseTypeData = data[releaseTypeDataMap[releaseType] ?? 'album'];

  if (!releaseTypeData) {
    console.warn('No data found for the specified release type:', releaseType);
    setNoFound();
    return;
  }

  const {
    playcount,
    listeners,
    userplaycount,
    url
  } = releaseTypeData;

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
}

export default {
  render,
  targetSelectors: [INFO_CONTAINER_SELECTOR, INFO_ARTISTS_SELECTOR, INFO_ALBUM_TITLE_SELECTOR],
};
