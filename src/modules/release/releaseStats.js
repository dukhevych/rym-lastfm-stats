import { ref, computed, watchEffect, watch } from 'vue';

import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

import './releaseStats.css';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const storageKey = `releaseStats_${window.location.href}`;
const storageSearchKey = `releaseStatsSearch_${window.location.href}`;

const releaseTypeDataMap = {
  album: 'album',
  single: 'track',
};

let config;
let lastfmStatsCell;

let lastfmListenersElement;
let lastfmPlaycountElement;
let lastfmUserplaycountElement;
let lastfmLinkElement;

let releaseType;
let userName;

const artistNames = ref([]);
const parsedArtists = computed(() => artistNames.value);
const parsedArtist = computed(() => parsedArtists.value[0] ?? null);
const parsedReleaseTitle = ref('');

const originalMetadata = computed(() => ({
  artist: parsedArtist.value,
  releaseTitle: parsedReleaseTitle.value,
}));

const overrideMetadata = ref({
  artist: null,
  releaseTitle: null,
});

const artist = computed(() => {
  return overrideMetadata.value.artist || originalMetadata.value.artist;
});
const releaseTitle = computed(() => {
  return overrideMetadata.value.releaseTitle || originalMetadata.value.releaseTitle;
});

const searchData = ref([]);

const searchOptions = computed(() => {
  const result = [];

  searchData.value.forEach((album) => {
    if (album.artist === artist.value && album.name === releaseTitle.value) {
      return;
    }

    result.push({
      label: `${album.artist} - ${album.name}`,
      value: {
        artist: album.artist,
        releaseTitle: album.name,
      },
    });
  });

  return result;
});


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
  td.classList.add('is-loading');
  td.id = 'lastfm_data';

  th.classList.add('info_hdr');
  th.textContent = 'Last.fm';
  td.classList.add('release_pri_descriptors');
  td.colspan = '2';
  td.textContent = 'Loading...';

  tr.appendChild(th);
  tr.appendChild(td);

  infoTable.appendChild(tr);

  td.textContent = '';
  td.style.display = 'flex';
  td.style.alignItems = 'center';

  lastfmListenersElement = document.createElement('span');
  lastfmListenersElement.id = 'lastfm_listeners';

  lastfmPlaycountElement = document.createElement('span');
  lastfmPlaycountElement.id = 'lastfm_playcount';

  lastfmUserplaycountElement = document.createElement('strong');
  lastfmUserplaycountElement.id = 'lastfm_userplaycount';

  lastfmLinkElement = document.createElement('a');
  lastfmLinkElement.target = '_blank';
  lastfmLinkElement.title = 'View on Last.fm';
  lastfmLinkElement.id = 'lastfm_link';

  const lastfmIcon = document.createElement('img');
  lastfmIcon.src = browserAPI.runtime.getURL('images/lastfm-pic.png');

  lastfmIcon.alt = 'Last.fm';
  lastfmIcon.style.width = 'auto';
  lastfmIcon.style.height = '20px';
  lastfmIcon.style.display = 'block';

  lastfmLinkElement.appendChild(lastfmIcon);

  [
    lastfmListenersElement,
    lastfmPlaycountElement,
    lastfmUserplaycountElement,
    lastfmLinkElement,
  ].forEach((element, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
      td.appendChild(separator);
    }
    td.appendChild(element);
  });

  return td;
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  lastfmStatsCell.classList.remove('is-loading');

  if (listeners !== undefined) {
    lastfmListenersElement.style.display = 'block';
    lastfmListenersElement.title = `${listeners} listeners ${cacheTimeHint}`;
    lastfmListenersElement.textContent = `${utils.shortenNumber(parseInt(listeners))} listeners`;
  } else {
    lastfmListenersElement.style.display = 'none';
  }

  if (playcount !== undefined && listeners !== undefined) {
    lastfmPlaycountElement.style.display = 'block';
    lastfmPlaycountElement.title = `${playcount}, ${parseInt(playcount / listeners)} per listener ${cacheTimeHint}`;
    lastfmPlaycountElement.textContent = `${utils.shortenNumber(parseInt(playcount))} plays`;
  } else {
    lastfmListenersElement.style.display = 'block';
  }

  if (userplaycount !== undefined) {
    lastfmUserplaycountElement.style.display = 'block';
    lastfmUserplaycountElement.title = `${userplaycount} scrobbles`;
    lastfmUserplaycountElement.textContent = `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`;
  } else {
    lastfmUserplaycountElement.style.display = 'none';
  }

  lastfmLinkElement.href = url;
}

function getReleaseType() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (!infoTable) return null;
  const releaseType = infoTable
    .querySelector('tr:nth-child(2) td')
    .textContent.toLowerCase().split(', ')[0];
  return releaseType;
}

async function getUsername() {
  const userData = await utils.getSyncedUserData();
  return userData?.name ?? null;
}

async function init() {
  userName = await getUsername();

  artistNames.value = getArtistNames();
  parsedReleaseTitle.value = getReleaseTitle();
  releaseType = getReleaseType();

  const override = await utils.storageGet(window.location.href, 'local');

  if (override && override.artist && override.releaseTitle) {
    overrideMetadata.value.artist = override.artist;
    overrideMetadata.value.releaseTitle = override.releaseTitle;
  }

  lastfmStatsCell = prepareReleaseStatsUI();
}

async function getFromCache() {
  const cachedData = await utils.storageGet(storageKey, 'local');

  if (!cachedData) return null;

  const { timestamp, data } = JSON.parse(cachedData);
  const cachedDate = new Date(timestamp).toDateString();
  const currentDate = new Date().toDateString();

  if (cachedDate !== currentDate) return null;

  return { data, timestamp };
}

async function render(_config) {
  if (!_config) return;
  config = _config;

  await init();

  if (!lastfmStatsCell) return;
  if (!artist.value || !releaseTitle.value) return;


  if (!config.lastfmApiKey) {
    const { data, timestamp } = await getFromCache();

    if (data && timestamp) {
      populateReleaseStats(data, timestamp);
      return;
    }
  }

  if (config.lastfmApiKey) {
    const searchDataCached = await utils.storageGet(storageSearchKey, 'local');
    if (searchDataCached) {
      searchData.value = searchDataCached.slice();
    }
  }

  const promises = [];

  const fetchPromise = api.fetchReleaseStats(
    userName, // can be empty
    config.lastfmApiKey || process.env.LASTFM_API_KEY,
    {
      artist: artist.value,
      releaseTitle: releaseTitle.value,
      releaseType,
    }
  );

  promises.push(fetchPromise);

  if (config.lastfmApiKey && searchData.value.length === 0) {
    const searchPromise = api.searchAlbum(
      config.lastfmApiKey,
      {
        artist: parsedArtist.value,
        albumTitle: parsedReleaseTitle.value,
      }
    );
    promises.push(searchPromise);
  }

  const [dataResponse, searchResponse] = await Promise.all(promises);

  const { playcount, listeners, userplaycount, url } = dataResponse[releaseTypeDataMap[releaseType] ?? 'album'];

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
  };

  populateReleaseStats(stats);

  if (!config.lastfmApiKey) {
    await utils.storageSet({
      [storageKey]: JSON.stringify({ timestamp: Date.now(), data: stats })
    }, 'local');
  }

  if (searchResponse && searchResponse.results && searchResponse.results.albummatches) {
    const { albummatches } = searchResponse.results;

    searchData.value = albummatches.album.slice();

    await utils.storageSet({
      [storageSearchKey]: albummatches.album.slice(),
    }, 'local');
  }

  if (config.lastfmApiKey) {
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

    const albumList = document.createElement('ul');
    albumList.classList.add('list-search-albums')
    albumList.style.listStyleType = 'none';
    albumList.style.padding = '0';
    albumList.style.margin = '0';

    incorrectStatsPopup.appendChild(albumList);

    watch([artist, releaseTitle], async () => {
      const data = await api.fetchReleaseStats(
        userName, // can be empty
        config.lastfmApiKey || process.env.LASTFM_API_KEY,
        {
          artist: artist.value,
          releaseTitle: releaseTitle.value,
          releaseType,
        }
      );

      const { playcount, listeners, userplaycount, url } = data[releaseTypeDataMap[releaseType] ?? 'album'];

      const stats = {
        playcount,
        listeners,
        userplaycount,
        url,
      };

      populateReleaseStats(stats);
    });

    watchEffect(() => {
      if (searchOptions.value.length === 0) return;

      albumList.innerHTML = '';

      searchOptions.value.forEach(({ label, value }) => {
        if (value.artist === artist.value && value.releaseTitle === releaseTitle.value) {
          return;
        }

        const listItem = document.createElement('li');

        listItem.addEventListener('click', async (e) => {
          e.stopPropagation();

          overrideMetadata.value.artist = value.artist;
          overrideMetadata.value.releaseTitle = value.releaseTitle;

          await utils.storageSet({
            [window.location.href]: {
              artist: value.artist,
              releaseTitle: value.releaseTitle,
            },
          }, 'local');

          incorrectStatsPopup.classList.remove('is-active');
        });

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = label;
        link.style.cursor = 'pointer';
        listItem.appendChild(link);

        albumList.appendChild(listItem);
      });
    });

    document.addEventListener(('click'), (event) => {
      if (!incorrectStatsWrapper.contains(event.target)) {
        incorrectStatsPopup.classList.remove('is-active');
      }
    });

    searchLink.addEventListener('click', async (event) => {
      event.preventDefault();
      incorrectStatsPopup.classList.toggle('is-active');
    });
  }

}

export default {
  render,
  targetSelectors: [INFO_CONTAINER_SELECTOR, INFO_ARTISTS_SELECTOR, INFO_ALBUM_TITLE_SELECTOR],
};
