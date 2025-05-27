import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';
import * as constants from '@/helpers/constants.js';

import {
  INFO_CONTAINER_SELECTOR,
  INFO_ARTISTS_SELECTOR,
  INFO_ALBUM_TITLE_SELECTOR,
  getArtistNames,
  getReleaseTitle,

} from './targets.js';

function prepareReleaseStatsUI() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (infoTable) {
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
  }
}

function setNoFound() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (infoTable) {
    const td = infoTable.querySelector('#lastfm_data');
    td.textContent = 'No data found';
  }
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  if (infoTable) {
    const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

    const td = infoTable.querySelector('#lastfm_data');

    td.textContent = '';

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
    const link = utils.createLink(url, 'View on Last.fm');

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
        td.appendChild(separator);
      }
      td.appendChild(element);
    });
  }
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
