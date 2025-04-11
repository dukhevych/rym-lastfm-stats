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
    const item = {
      label: `${album.artist} - ${album.name}`,
      value: {
        artist: album.artist,
        releaseTitle: album.name,
      },
    };

    if (album.artist.toLowerCase() === parsedArtist.value.toLowerCase()
      && album.name.toLowerCase() === parsedReleaseTitle.value.toLowerCase()
    ) {
      result.unshift(item);
    } else {
      result.push(item);
    }
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
  th.classList.add('info_hdr');
  th.textContent = 'Last.fm';

  const td = document.createElement('td');
  td.classList.add('release_pri_descriptors');
  td.setAttribute('colspan', '2');

  const statsWrapper = document.createElement('div');
  statsWrapper.classList.add('lastfm-stats-cell', 'is-loading');
  td.appendChild(statsWrapper);

  tr.appendChild(th);
  tr.appendChild(td);
  infoTable.appendChild(tr);

  const statsList = document.createElement('ul');
  statsList.classList.add('list-stats');

  lastfmListenersElement = document.createElement('li');
  lastfmListenersElement.classList.add('is-listeners');

  lastfmPlaycountElement = document.createElement('li');
  lastfmPlaycountElement.classList.add('is-playcount');

  lastfmUserplaycountElement = document.createElement('li');
  lastfmUserplaycountElement.classList.add('is-user-playcount');

  statsList.appendChild(lastfmListenersElement);
  statsList.appendChild(lastfmPlaycountElement);
  statsList.appendChild(lastfmUserplaycountElement);

  lastfmLinkElement = document.createElement('a');
  lastfmLinkElement.classList.add('lastfm-link');
  lastfmLinkElement.target = '_blank';
  lastfmLinkElement.title = 'View on Last.fm';

  const lastfmIcon = document.createElement('img');
  lastfmIcon.src = browserAPI.runtime.getURL('images/lastfm-pic.png');
  lastfmIcon.alt = 'Last.fm';

  lastfmLinkElement.appendChild(lastfmIcon);

  statsWrapper.appendChild(statsList);
  statsWrapper.appendChild(lastfmLinkElement);

  return statsWrapper;
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
    incorrectStatsWrapper.classList.add('incorrect-stats-wrapper');

    const searchLink = document.createElement('a');
    searchLink.classList.add('incorrect-stats-link');
    searchLink.href = '#';
    searchLink.textContent = 'Incorrect stats?';

    incorrectStatsWrapper.appendChild(searchLink);
    lastfmStatsCell.appendChild(incorrectStatsWrapper);

    const incorrectStatsPopup = document.createElement('div');
    incorrectStatsPopup.classList.add('incorrect-stats-popup');

    incorrectStatsWrapper.appendChild(incorrectStatsPopup);

    const albumList = document.createElement('ul');
    albumList.classList.add('list-search-albums')

    incorrectStatsPopup.appendChild(albumList);

    watch([artist, releaseTitle], async () => {
      lastfmStatsCell.classList.add('is-updating');
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
      lastfmStatsCell.classList.remove('is-updating');
    });

    if (searchOptions.value.length === 0) {
      const noResults = document.createElement('div');
      noResults.classList.add('incorrect-stats-popup-warning');
      noResults.textContent = 'No results';
      incorrectStatsPopup.appendChild(noResults);
    } else if (searchOptions.value.length === 1) {
      const noResults = document.createElement('div');
      noResults.classList.add('incorrect-stats-popup-warning');
      noResults.textContent = 'No alternative albums found';
      incorrectStatsPopup.appendChild(noResults);
    } else {
      const title = document.createElement('h3');
      title.classList.add('incorrect-stats-popup-title');
      title.innerText = 'Select the correct album:';
      incorrectStatsPopup.insertBefore(title, albumList);

      watchEffect(() => {
        while (albumList.firstChild) {
          albumList.removeChild(albumList.firstChild);
        }

        searchOptions.value.forEach(({ label, value }) => {
          const isCurrent = value.artist.toLowerCase() === artist.value.toLowerCase()
            && value.releaseTitle.toLowerCase() === releaseTitle.value.toLowerCase();

          const isCurrentParsed = value.artist.toLowerCase() === parsedArtist.value.toLowerCase()
            && value.releaseTitle.toLowerCase() === parsedReleaseTitle.value.toLowerCase();

          const listItem = document.createElement('li');

          if (isCurrent) {
            const span = document.createElement('span');
            span.classList.add('list-search-albums-item');
            span.innerText = label;
            if (isCurrentParsed) {
              span.innerText += ' (RYM)';
            }
            listItem.appendChild(span);
            albumList.appendChild(listItem);
            return;
          }

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
          link.classList.add('list-search-albums-item');
          link.href = '#';
          link.textContent = label;

          if (isCurrentParsed) {
            link.textContent += ' (RYM)';
          }

          listItem.appendChild(link);

          albumList.appendChild(listItem);
        });
      });
    }

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
