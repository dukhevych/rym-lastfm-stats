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
  getReleaseId,
} from './targets.js';

const uiElements = {};

const state = {
  releaseType: null,
  userName: null,
  searchResults: null,
  releaseId: null,
  artistQuery: null,
  releaseTitleQuery: null,
  artists: [],
  releaseTitle: null,
  config: null,
  get artistNamesFlatNormalized() {
    const result = [];
    this.artistNames.forEach((artist) => {
      if (artist.artistNameLocalized) {
        result.push(utils.normalizeForSearch(artist.artistNameLocalized));
      }
      result.push(utils.normalizeForSearch(artist.artistName));
    });
    return result;
  },
  get storageKey() {
    if (!this.releaseId || !this.artistQuery || !this.releaseTitleQuery) {
      return null;
    }

    let value = `releaseStats_${this.releaseId}`;

    if (this.userName) {
      value += `_${this.userName}`;
    }

    value += `_${utils.slugify(this.artistQuery)}_${utils.slugify(this.releaseTitleQuery)}`;

    return value;
  },
  get artistQueryCacheKey() {
    if (!this.releaseId) return null;
    return `artistQuery_${this.releaseId}`;
  },
  get releaseTitleQueryCacheKey() {
    if (!this.releaseId) return null;
    return `releaseTitleQuery_${this.releaseId}`;
  },
};

function createSearchDialog() {
  let list;
  const dialog = h('dialog', { className: 'dialog-base', id: 'dialog-search-lastfm' }, [
    h(
      'h2',
      { className: 'dialog-title' },
      [
        'Choose Last.fm release',
        h(
          'a',
          {
            href: '#',
            className: 'dialog-close-btn',
            onClick: (e) => {
              e.preventDefault();
              dialog.close();
            },
          },
          utils.createSvgUse('svg-close-symbol')
        ),
      ],
    ),

    list = h('ul', { className: 'list-search' })
  ]);

  return { dialog, list };
}

function populateSearchDialog() {
  if (!uiElements.searchList) return;

  uiElements.searchList.replaceChildren();

  state.searchResults.forEach((item) => {
    const isSelected = item.artist === state.artistQuery && item.name === state.releaseTitleQuery;
    const classNames = ['search-item'];

    if (isSelected) classNames.push('is-selected');

    const itemElement = h('li', {
      className: classNames.join(' '),
      dataset: {
        artist: item.artist,
        title: item.name,
      },
    }, [
      h('a', {
        href: item.url,
        className: 'search-item-link',
        onClick: async (e) => {
          e.preventDefault();
          await utils.storageSet({
            [state.artistQueryCacheKey]: item.artist,
            [state.releaseTitleQueryCacheKey]: item.name,
          }, 'local');
          state.artistQuery = item.artist;
          state.releaseTitleQuery = item.name;
          updateSearchDialog();
          uiElements.searchDialog.close();
          uiElements.statsWrapper.classList.add('is-loading');
          await updateReleaseStats();
          uiElements.statsWrapper.classList.remove('is-loading');
        },
      }, [
        h('img', {
          className: 'search-item-image',
          src: item.image[0]['#text'],
        }),
        h('span', { className: 'search-item-title' }, `${item.artist} - ${item.name}`),
      ]),
    ]);

    uiElements.searchList.appendChild(itemElement);
  });
}

function updateSearchDialog() {
  uiElements.searchList.querySelectorAll('.search-item').forEach((item) => {
    const artist = item.dataset.artist;
    const title = item.dataset.title;

    if (artist === state.artistQuery && title === state.releaseTitleQuery) {
      item.classList.add('is-selected');
    } else {
      item.classList.remove('is-selected');
    }
  });
}

function prepareReleaseStatsUI() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (!infoTable) return;

  const { dialog: searchDialog, list: searchList } = createSearchDialog();

  uiElements.searchDialog = searchDialog;
  uiElements.searchList = searchList;

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

  uiElements.searchDialogOpener = h(
    'a',
    {
      title: 'Search Last.fm for this release',
      className: 'incorrect-stats-link',
      onClick: (e) => {
        e.preventDefault();
        uiElements.searchDialog.showModal();
      },
    },
    'Incorrect stats?'
  );

  uiElements.statsWrapper = h(
    'div',
    { className: ['list-stats-wrapper', 'is-loading'] },
    [
      uiElements.statsList,
      uiElements.lastfmLink,
      uiElements.searchDialogOpener,
    ]
  );

  uiElements.heading = h('th', { className: 'info_hdr' }, 'Last.fm');

  uiElements.content = h(
    'td',
    { className: 'release_pri_descriptors release-stats-content', colspan: '2' },
    uiElements.statsWrapper,
  );

  uiElements.tr = h('tr', {}, [uiElements.heading, uiElements.content]);

  infoTable.appendChild(uiElements.tr);
  document.body.appendChild(uiElements.searchDialog);
}

function setNoData() {
  if (!uiElements.statsWrapper) return;
  uiElements.statsWrapper.classList.add('no-data');
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  uiElements.statsWrapper.classList.remove('is-loading');

  if (listeners !== undefined) {
    uiElements.listeners.classList.remove('is-hidden');
    uiElements.listeners.style.display = 'block';
    uiElements.listeners.title = `${listeners} listeners ${cacheTimeHint}`;
    uiElements.listeners.dataset.value = utils.shortenNumber(parseInt(listeners));
  } else {
    uiElements.listeners.classList.add('is-hidden');
  }

  if (playcount !== undefined && listeners !== undefined) {
    uiElements.playcount.classList.remove('is-hidden');
    uiElements.playcount.title = `${playcount}, ${parseInt(playcount / listeners)} per listener ${cacheTimeHint}`;
    uiElements.playcount.dataset.value = utils.shortenNumber(parseInt(playcount));
  } else {
    uiElements.playcount.classList.add('is-hidden');
  }

  if (userplaycount !== undefined) {
    uiElements.userplaycount.classList.remove('is-hidden');
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`;
  } else {
    uiElements.userplaycount.classList.add('is-hidden');
  }

  uiElements.lastfmLink.href = url;
}

async function initSearchResults() {
  const cacheKey = `searchResults_${state.releaseId}`;
  const searchResultsCache = await utils.storageGet(cacheKey, 'local');

  if (searchResultsCache) {
    if (constants.isDev) console.log('Using cached search results:', searchResultsCache);
    state.searchResults = searchResultsCache;
    return;
  }

  const searchResults = await api.searchRelease(
    state.config.lastfmApiKey || process.env.LASTFM_API_KEY,
    {
      artists: state.artists.map(utils.normalizeForSearch),
      releaseTitle: state.releaseTitle,
    },
  );

  if (!searchResults || searchResults.length === 0) {
    console.warn('No search results returned from api for:', state.artists, state.releaseTitle);
    return null;
  }

  const searchResultsFiltered = searchResults.filter((item) => {
    const itemArtistNormalized = utils.normalizeForSearch(item.artist);
    const itemTitleNormalized = utils.normalizeForSearch(item.name);

    const hasArtist = state.artistNamesFlatNormalized
      .some((name) => utils.checkPartialStringsMatch(itemArtistNormalized, name));

    if (!hasArtist) return false;

    return utils.checkPartialStringsMatch(itemTitleNormalized, utils.normalizeForSearch(state.releaseTitle));
  });

  if (searchResultsFiltered.length === 0) {
    console.warn('No matching search results found for:', state.artists, state.releaseTitle);
    return null;
  }

  const searchResultsFilteredSorted = searchResultsFiltered.sort((a, b) => {
      const isFullMatch = (item) => {
        const itemTitleNormalized = utils.normalizeForSearch(item.name);
        const itemArtistNormalized = utils.normalizeForSearch(item.artist);
        const hasFullTitleMatch = itemTitleNormalized === utils.normalizeForSearch(state.releaseTitle);
        if (!hasFullTitleMatch) return false;
        const hasArtistFullMatch = state.artistNamesFlatNormalized.some((name) => itemArtistNormalized === name);
        if (!hasArtistFullMatch) return false;
        return true;
      }

      const aMatch = isFullMatch(a);
      const bMatch = isFullMatch(b);

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
  });

  if (constants.isDev) console.log('Search results found:', searchResultsFilteredSorted);

  await utils.storageSet({ [cacheKey]: searchResultsFilteredSorted }, 'local');

  state.searchResults = searchResultsFilteredSorted;
}

async function initQueries() {
  const artistCacheKey = `artistQuery_${state.releaseId}`;
  const releaseTitleCacheKey = `releaseTitleQuery_${state.releaseId}`;

  const cachedQueries = await utils.storageGet([artistCacheKey, releaseTitleCacheKey], 'local');

  let artistQuery = cachedQueries[artistCacheKey];
  let releaseTitleQuery = cachedQueries[releaseTitleCacheKey];

  if (!artistQuery || !releaseTitleQuery) {
    if (state.searchResults && state.searchResults.length > 0) {
      const bestResult = state.searchResults[0];
      artistQuery = bestResult.artist;
      releaseTitleQuery = bestResult.name;

      await utils.storageSet({
        [artistCacheKey]: artistQuery,
        [releaseTitleCacheKey]: releaseTitleQuery,
      }, 'local');
    } else {
      console.warn('No search results to extract queries from.');
    }
  }

  if (artistQuery && releaseTitleQuery) {
    state.artistQuery = artistQuery;
    state.releaseTitleQuery = releaseTitleQuery;
  }
}

async function updateReleaseStats() {
  const data = await api.fetchReleaseStats(
    state.userName,
    state.config.lastfmApiKey || process.env.LASTFM_API_KEY,
    {
      artist: state.artistQuery,
      releaseTitle: state.releaseTitleQuery,
      releaseType: state.releaseType,
    }
  );

  if (!data || Object.keys(data).length === 0) {
    console.warn('No data found for the specified artist/release', state.artistQuery, state.releaseTitleQuery);
    setNoData();
    return;
  }

  const releaseTypeDataMap = {
    album: 'album',
    single: 'track',
  };

  const releaseTypeData = data[releaseTypeDataMap[state.releaseType] ?? 'album'];

  if (!releaseTypeData) {
    console.warn('No data found for the specified release type:', state.releaseType);
    setNoData();
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

  if (!state.config.lastfmApiKey) {
    utils.storageSet({
      [state.storageKey]: { timestamp: Date.now(), data: stats },
    }, 'local');
  }

  populateReleaseStats(stats);
}

function initState(config) {
  if (!config) return;

  state.config = config;
  state.artistNames = getArtistNames();
  state.artists = state.artistNames.map((artist) => {
    const { artistName, artistNameLocalized } = artist;
    return artistNameLocalized || artistName;
  });
  state.releaseType = getReleaseType();
  state.releaseTitle = getReleaseTitle();
  state.releaseId = getReleaseId();
}

async function render(config) {
  initState(config);

  if (state.artists.length === 0 || !state.releaseTitle) {
    console.error('No artist or release title found.');
    return;
  }

  prepareReleaseStatsUI();

  const [userData] = await Promise.all([
    utils.getSyncedUserData(),
    initSearchResults(),
  ]);

  await initQueries();

  if (constants.isDev) {
    console.log('Artist query:', state.artistQuery);
    console.log('Release title query:', state.releaseTitleQuery);
  }

  const userName = userData?.name;

  if (userName) state.userName = userName;

  if (!state.artistQuery || !state.releaseTitleQuery) {
    console.warn('No artist or release title found during Last.fm search. Trying to fallback to parsed values.');
    state.artistQuery = state.artists[0];
    state.releaseTitleQuery = state.releaseTitle;
  } else {
    populateSearchDialog();
  }

  // Use cached data once per day if no API key is provided
  // Another layer of caching is added to api.fetchReleaseStats, plan to make this consistent later
  if (!config.lastfmApiKey) {
    const cachedData = await utils.storageGet(state.storageKey, 'local');

    if (cachedData && cachedData.timestamp && cachedData.data) {
      const { timestamp, data } = cachedData;
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        populateReleaseStats(data, timestamp);
        return;
      }
    }
  }

  await updateReleaseStats();
}

export default {
  render,
  targetSelectors: [INFO_CONTAINER_SELECTOR, INFO_ARTISTS_SELECTOR, INFO_ALBUM_TITLE_SELECTOR],
};
