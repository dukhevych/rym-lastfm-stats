import * as api from '@/api';
import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';
import { createSvgUse } from '@/helpers/sprite';
import { storageGet, storageSet, getSyncedUserData, generateStorageKey } from '@/helpers/storageUtils';
import { createElement as h } from '@/helpers/dom';
import { checkPartialStringsMatch } from '@/helpers/string';

import './releaseStats.css';

import type { ReleaseType } from '@/api/getReleaseInfo';
import type { AlbumSearchResult } from '@/api/searchAlbums';

interface SearchCache {
  data: AlbumSearchResult[] | null;
  timestamp: number;
}

import {
  PARENT_SELECTOR,
  INFO_TABLE_SELECTOR,
  getArtistNames,
  getReleaseTitle,
  getReleaseType,
  getReleaseId,
} from './targets';

interface UIElements {
  parent: HTMLElement;
  searchDialog: HTMLDialogElement;
  searchList: HTMLUListElement;
  searchListItems: HTMLLIElement[];
  infoTable: HTMLTableElement;
  statsList: HTMLUListElement;
  listeners: HTMLLIElement;
  playcount: HTMLLIElement;
  userplaycount: HTMLLIElement;
  lastfmLink: HTMLAnchorElement;
  searchDialogOpener: HTMLAnchorElement;
  statsWrapper: HTMLDivElement;
  heading: HTMLTableCellElement;
  content: HTMLTableCellElement;
  tr: HTMLTableRowElement;
}

interface State {
  userName: string;
  releaseType: ReleaseType;
  releaseId: string;
  searchCacheKey: string;
  artistQuery: string;
  releaseTitleQuery: string;
  artistNames: { artistName: string; artistNameLocalized?: string }[];
  releaseTitle: string;
  searchResults: AlbumSearchResult[];
  artistNamesFlatNormalized: string[];
  artistQueryCacheKey: string;
  releaseTitleQueryCacheKey: string;
  artists: string[];
  cacheStorageKey: string;
  artistCacheKey: string;
  releaseTitleCacheKey: string;
}

const uiElements = {} as UIElements;
let config: ProfileOptions;

const state = {
  get artists() {
    return this.artistNames.map((artist) => {
      const { artistName, artistNameLocalized } = artist;
      return artistNameLocalized || artistName;
    });
  },
  get artistNamesFlatNormalized() {
    const result: string[] = [];
    this.artistNames.forEach((artist) => {
      if (artist.artistNameLocalized) {
        result.push(utils.normalizeForSearch(artist.artistNameLocalized));
      }
      result.push(utils.normalizeForSearch(artist.artistName));
    });
    return result;
  },
  get cacheStorageKey() {
    return generateStorageKey(
      'releaseStats',
      this.releaseId,
      this.userName,
      this.artistQuery,
      this.releaseTitleQuery,
    );
  },
  get artistQueryCacheKey() { return generateStorageKey('artistQuery', this.releaseId); },
  get releaseTitleQueryCacheKey() { return generateStorageKey('releaseTitleQuery', this.releaseId); },
  get searchCacheKey() {
    return generateStorageKey('searchResults', this.releaseId);
  },
  get releaseTitleCacheKey() { return generateStorageKey('releaseTitleQuery', this.releaseId); }
} as State;

function createSearchDialog() {
  const list = h('ul', { className: 'list-dialog' });

  const dialog = h('dialog', { className: 'dialog-base' }, [
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
            onClick: (e: MouseEvent) => {
              e.preventDefault();
              dialog.close();
            },
          },
          createSvgUse('svg-close-symbol')
        ),
      ],
    ),
    list,
  ]);

  return { dialog, list };
}

function populateSearchDialog() {
  if (!uiElements.searchList) return;

  uiElements.searchList.replaceChildren();

  if (!state.searchResults || state.searchResults.length === 0) {
    const noResultsItem = h('li', { className: 'list-dialog-item is-no-results' }, 'No results found');
    uiElements.searchList.appendChild(noResultsItem);
    return;
  }

  uiElements.searchListItems = state.searchResults.map((item) => {
    const isSelected = item.artist === state.artistQuery && item.name === state.releaseTitleQuery;
    const classNames = ['list-dialog-item'];

    if (isSelected) classNames.push('is-selected');

    return h('li', {
      className: classNames.join(' '),
      dataset: {
        artist: item.artist,
        title: item.name,
      },
    }, [
      h('a', {
        href: item.url,
        className: 'list-dialog-item-link',
        onClick: async (e: MouseEvent) => {
          e.preventDefault();

          // SET VALUES
          state.artistQuery = item.artist;
          state.releaseTitleQuery = item.name;

          // UPDATE VALUES IN CACHE
          await storageSet({
            [state.artistQueryCacheKey]: item.artist,
            [state.releaseTitleQueryCacheKey]: item.name,
          }, 'local');

          // CLOSE DIALOG
          uiElements.searchDialog.close();

          // UPDATE STATS
          uiElements.statsWrapper.classList.add('is-updating');
          await updateStats();
          uiElements.statsWrapper.classList.remove('is-updating');
        },
      }, [
        h('img', {
          className: 'list-dialog-item-image',
          src: item.image[0]['#text'],
        }),
        h('span', { className: 'list-dialog-item-title' }, `${item.artist} - ${item.name}`),
      ]),
    ]);
  });

  uiElements.searchList.append(...uiElements.searchListItems);
}

function updateDialogState() {
  if (!uiElements.searchDialog || !uiElements.searchListItems) return;

  uiElements.searchListItems.forEach((item) => {
    const artist = item.dataset.artist;
    const title = item.dataset.title;

    if (artist === state.artistQuery && title === state.releaseTitleQuery) {
      item.classList.add('is-selected');
    } else {
      item.classList.remove('is-selected');
    }
  });
}

function prepareSearchDialog() {
  const { dialog: searchDialog, list: searchList } = createSearchDialog();

  uiElements.searchDialog = searchDialog;
  uiElements.searchList = searchList;

  uiElements.searchDialogOpener = h(
    'a',
    {
      title: 'Search Last.fm for this release',
      className: 'incorrect-stats-link',
      onClick: (e: MouseEvent) => {
        e.preventDefault();
        uiElements.searchDialog.showModal();
      },
    },
    'Incorrect stats?'
  );

  uiElements.statsWrapper.appendChild(uiElements.searchDialogOpener);

  document.body.appendChild(uiElements.searchDialog);
}

function initUI() {
  uiElements.infoTable = document.querySelector(INFO_TABLE_SELECTOR) as HTMLTableElement;

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
    createSvgUse('svg-lastfm-square-symbol')
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

  uiElements.infoTable.appendChild(uiElements.tr);
}

function setNoData() {
  if (!uiElements.statsWrapper) return;
  uiElements.statsWrapper.classList.add('no-data');
}

interface ReleaseStats {
  playcount: number;
  listeners: number;
  userplaycount?: number | null;
  url: string;
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url }: ReleaseStats,
  timestamp?: number,
) {
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  if (listeners !== undefined) {
    uiElements.listeners.classList.remove('is-hidden');
    uiElements.listeners.style.display = 'block';
    uiElements.listeners.title = `${listeners} listeners ${cacheTimeHint}`;
    uiElements.listeners.dataset.value = utils.shortenNumber(Math.trunc(listeners));
  } else {
    uiElements.listeners.classList.add('is-hidden');
  }

  if (playcount !== undefined && listeners !== undefined) {
    uiElements.playcount.classList.remove('is-hidden');
    uiElements.playcount.title = `${playcount} plays, ${Math.trunc(playcount / listeners)} per listener ${cacheTimeHint}`;
    uiElements.playcount.dataset.value = utils.shortenNumber(Math.trunc(playcount));
  } else {
    uiElements.playcount.classList.add('is-hidden');
  }

  if (userplaycount !== undefined && userplaycount !== null) {
    uiElements.userplaycount.classList.remove('is-hidden');
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(Math.trunc(userplaycount || 0))}`;
  } else {
    uiElements.userplaycount.classList.add('is-hidden');
  }

  uiElements.lastfmLink.href = url;
}

async function initSearchResults() {
  const searchResultsCache: SearchCache | undefined = await storageGet(state.searchCacheKey, 'local');

  const oneDayMs = 1000 * 60 * 60 * 24;

  if (searchResultsCache) {
    const { data, timestamp } = searchResultsCache;

    const tooSoonToUpdate = Date.now() - timestamp < oneDayMs;

    if (tooSoonToUpdate) {
      if (constants.isDev) console.log('Using cached search results:', data);
      state.searchResults = data || [];
      return;
    }
  }

  let searchResults: AlbumSearchResult[] | undefined;

  const apiKey = config.lastfmApiKey || process.env.LASTFM_API_KEY as string;
  const titleNormalized = utils.normalizeForSearch(state.releaseTitle);

  for (const artist of state.artists) {
    console.log('search for', artist);
    const searchAlbumsResponse = await api.searchAlbums({
      apiKey,
      params: {
        query: utils.normalizeForSearch(artist) + ' ' + titleNormalized,
      },
    });

    const albums = searchAlbumsResponse?.results?.albummatches?.album;

    if (albums && albums.length > 0) {
      searchResults = albums;
      break;
    }
  }

  if (!searchResults || searchResults.length === 0) {
    await utils.wait(100);
    const searchAlbumsResponse = await api.searchAlbums({
      apiKey,
      params: {
        query: utils.normalizeForSearch(state.artists[0]) + ' ' + titleNormalized.split(' ')[0],
      }
    });

    const albums = searchAlbumsResponse?.results?.albummatches?.album;

    if (albums && albums.length > 0) {
      searchResults = albums;
    }
  }

  if (!searchResults || searchResults.length === 0) {
    console.warn('No search results returned from api for:', state.artists, state.releaseTitle);
    await storageSet({
      [state.searchCacheKey]: {
        data: null,
        timestamp: Date.now(),
      },
    }, 'local');
    return;
  }

  const searchResultsFiltered = searchResults.filter((item) => {
    const itemArtistNormalized = utils.normalizeForSearch(item.artist);
    const itemTitleNormalized = utils.normalizeForSearch(item.name);

    const hasArtist = state.artistNamesFlatNormalized
      .some((name) => checkPartialStringsMatch(itemArtistNormalized, name));

    if (!hasArtist) return false;

    return checkPartialStringsMatch(itemTitleNormalized, utils.normalizeForSearch(state.releaseTitle));
  });

  if (searchResultsFiltered.length === 0) {
    console.warn('No matching search results found for:', state.artists, state.releaseTitle);
    await storageSet({
      [state.searchCacheKey]: {
        data: null,
        timestamp: Date.now()
      }
    }, 'local');
    return;
  }

  const isFullMatch = (item: AlbumSearchResult) => {
    const itemTitleNormalized = utils.normalizeForSearch(item.name);
    const itemArtistNormalized = utils.normalizeForSearch(item.artist);
    const hasFullTitleMatch = itemTitleNormalized === utils.normalizeForSearch(state.releaseTitle);
    if (!hasFullTitleMatch) return false;
    const hasArtistFullMatch = state.artistNamesFlatNormalized.some((name) => itemArtistNormalized === name);
    if (!hasArtistFullMatch) return false;
    return true;
  }

  const searchResultsFilteredSorted = searchResultsFiltered.sort((a, b) => {
    const aMatch = isFullMatch(a);
    const bMatch = isFullMatch(b);

    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  constants.isDev && console.log('Search results found:', searchResultsFilteredSorted);

  await storageSet({
    [state.searchCacheKey]: {
      data: searchResultsFilteredSorted,
      timestamp: Date.now(),
    },
  }, 'local');

  state.searchResults = searchResultsFilteredSorted;
}

async function initQueries() {
  const cachedQueries = await storageGet([
    state.artistQueryCacheKey,
    state.releaseTitleQueryCacheKey,
  ], 'local');

  let artistQuery = cachedQueries[state.artistQueryCacheKey];
  let releaseTitleQuery = cachedQueries[state.releaseTitleQueryCacheKey];

  if (!artistQuery || !releaseTitleQuery) {
    if (state.searchResults && state.searchResults.length > 0) {
      artistQuery = state.searchResults[0].artist;
      releaseTitleQuery = state.searchResults[0].name;
    } else {
      artistQuery = state.artists[0];
      releaseTitleQuery = state.releaseTitle;
    }

    await storageSet({
      [state.artistQueryCacheKey]: artistQuery,
      [state.releaseTitleQueryCacheKey]: releaseTitleQuery,
    }, 'local');
  }

  state.artistQuery = artistQuery;
  state.releaseTitleQuery = releaseTitleQuery;
}

async function fetchReleaseInfo(artist: string, title: string) {
  constants.isDev && console.log('fetchReleaseInfo', artist, title);

  try {
    const releaseInfoResponse = await api.getReleaseInfo({
      params: {
        artist,
        title,
        username: state.userName,
      },
      apiKey: config.lastfmApiKey || process.env.LASTFM_API_KEY as string,
      releaseType: state.releaseType,
    });

    console.log('releaseInfoResponse', releaseInfoResponse);

    const stats: ReleaseStats = {
      playcount: 0,
      listeners: 0,
      userplaycount: null,
      url: '',
    };

    const releaseTypeDataMap = {
      album: 'album',
      single: 'track',
      'music video': 'track',
      ep: 'album',
    };

    const releaseTypeData = releaseInfoResponse[releaseTypeDataMap[state.releaseType] ?? 'album'];

    if (releaseInfoResponse && !releaseInfoResponse.error) {
      stats.playcount = +releaseTypeData.playcount;
      stats.listeners = +releaseTypeData.listeners;
      stats.userplaycount = isNaN(+releaseTypeData.userplaycount) ? null : +releaseTypeData.userplaycount;
      stats.url = releaseTypeData.url;

      return stats;
    } else {
      return null;
    }
  } catch (error) {
    console.error(error);
    console.error('Error fetching release info!!!!!!!!!!!!!!!');
    return null;
  }
}

async function updateStats() {
  let stats: ReleaseStats | null = null;
  let timestamp: number | null = null;

  const cachedData = await storageGet(state.cacheStorageKey, 'local');
  const cacheLifetime = state.userName ? constants.STATS_CACHE_LIFETIME_MS : constants.STATS_CACHE_LIFETIME_GUEST_MS;

  if (
    cachedData
      && cachedData.timestamp
      && cachedData.userName === state.userName
      && ((Date.now() - cachedData.timestamp) <= cacheLifetime)
  ) {
    constants.isDev && console.log('Using cached data for user:', state.userName);

    stats = cachedData.data;
    timestamp = cachedData.timestamp;
  }

  if (!stats && !timestamp) {
    constants.isDev && console.log('Fetching new data');

    stats = await fetchReleaseInfo(state.artistQuery, state.releaseTitleQuery);
    timestamp = Date.now();

    await storageSet({
      [state.cacheStorageKey]: {
        timestamp,
        data: stats,
        userName: state.userName,
      },
    }, 'local');
  }

  uiElements.statsWrapper.classList.remove('is-loading');
  uiElements.statsWrapper.classList.remove('no-data');

  updateDialogState();

  if (stats && timestamp) {
    updateReleaseInfo(stats, timestamp);
  } else {
    uiElements.statsWrapper.classList.add('no-data');
  }
}

function updateReleaseInfo(stats: ReleaseStats, timestamp: number) {
  populateReleaseStats(stats, timestamp);
}

async function render(_config: ProfileOptions) {
  // SET PARENT ELEMENT
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) return;
  uiElements.parent = parent;

  // SET CONFIG
  if (!_config) return;
  config = _config;

  // SET RELEASE ID
  state.releaseId = getReleaseId(parent);
  if (!state.releaseId) {
    console.warn('No release ID found.');
    return;
  }

  // SET PAGE DATA
  state.artistNames = getArtistNames(parent);
  state.releaseType = getReleaseType(parent) ?? 'album';
  state.releaseTitle = getReleaseTitle(parent);

  // CHECK IF ARTISTS EXIST AND RELEASE TITLE IS SET
  if (state.artists.length === 0 || !state.releaseTitle) {
    console.error('No artist or release title found.');
    return;
  }

  // INIT UI
  initUI();

  // FETCH SEARCH RESULTS
  await initSearchResults();

  // PREPARE SEARCH DIALOG
  if (state.searchResults && state.searchResults.length > 0) {
    prepareSearchDialog();
  }

  // INIT QUERIES
  await initQueries();

  // SET USER NAME
  const userData = await getSyncedUserData();
  const userName = userData?.name;
  if (userName) state.userName = userName;

  // POPULATE SEARCH DIALOG
  if (state.searchResults && state.searchResults.length > 0) {
    populateSearchDialog();
  }

  // FETCH AND POPULATE STATS
  await updateStats();
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};
