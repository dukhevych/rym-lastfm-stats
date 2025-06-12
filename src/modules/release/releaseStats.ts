import * as utils from '@/helpers/utils';
import * as api from '@/api';
import * as constants from '@/helpers/constants';
import { createElement as h } from '@/helpers/utils';
import type { ReleaseType } from '@/api/getReleaseInfo';
import type { AlbumSearchResult } from '@/api/searchAlbums';
import './releaseStats.css';
import {
  PARENT_SELECTOR,
  INFO_TABLE_SELECTOR,
  getArtistNames,
  getReleaseTitle,
  getReleaseType,
  getReleaseId,
} from './targets';

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
  storageKey: string;
  artistQueryCacheKey: string;
  releaseTitleQueryCacheKey: string;
  artists: string[];
}

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
  get storageKey() {
    let value = `releaseStats_${this.releaseId}`;

    if (this.userName) {
      value += `_${this.userName}`;
    }

    value += `_${utils.slugify(this.artistQuery)}_${utils.slugify(this.releaseTitleQuery)}`;

    return value;
  },
  get artistQueryCacheKey() { return `artistQuery_${this.releaseId}`; },
  get releaseTitleQueryCacheKey() { return `releaseTitleQuery_${this.releaseId}`; },
  get searchCacheKey() {
    return `searchResults_${this.releaseId}`;
  },
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
          utils.createSvgUse('svg-close-symbol')
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
          className: 'list-dialog-item-image',
          src: item.image[0]['#text'],
        }),
        h('span', { className: 'list-dialog-item-title' }, `${item.artist} - ${item.name}`),
      ]),
    ]);
  });

  uiElements.searchList.append(...uiElements.searchListItems);
}

function updateSearchDialog() {
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

function prepareReleaseStatsUI() {
  const { dialog: searchDialog, list: searchList } = createSearchDialog();

  uiElements.infoTable = document.querySelector(INFO_TABLE_SELECTOR) as HTMLTableElement;

  uiElements.searchDialog = searchDialog;
  uiElements.searchList = searchList;

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
      onClick: (e: MouseEvent) => {
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

  uiElements.infoTable.appendChild(uiElements.tr);
  document.body.appendChild(uiElements.searchDialog);
}

function setNoData() {
  if (!uiElements.statsWrapper) return;
  uiElements.statsWrapper.classList.add('no-data');
}

interface ReleaseStats {
  playcount?: number;
  listeners?: number;
  userplaycount?: number;
  url: string;
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url }: ReleaseStats,
  timestamp?: number,
) {
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  uiElements.statsWrapper.classList.remove('is-loading');

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
    uiElements.playcount.title = `${playcount}, ${Math.trunc(playcount / listeners)} per listener ${cacheTimeHint}`;
    uiElements.playcount.dataset.value = utils.shortenNumber(Math.trunc(playcount));
  } else {
    uiElements.playcount.classList.add('is-hidden');
  }

  if (userplaycount !== undefined) {
    uiElements.userplaycount.classList.remove('is-hidden');
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(Math.trunc(userplaycount))}`;
  } else {
    uiElements.userplaycount.classList.add('is-hidden');
  }

  uiElements.lastfmLink.href = url;
}

async function initSearchResults() {
  const searchResultsCache: AlbumSearchResult[] | undefined = await utils.storageGet(state.searchCacheKey, 'local');

  if (searchResultsCache) {
    if (constants.isDev) console.log('Using cached search results:', searchResultsCache);
    state.searchResults = searchResultsCache;
    return;
  }

  const searchAlbumsResponse = await api.searchAlbums({
    apiKey: config.lastfmApiKey || process.env.LASTFM_API_KEY as string,
    params: {
      query: utils.normalizeForSearch(state.artists[0]) + ' ' + utils.normalizeForSearch(state.releaseTitle)
    },
  });

  const { results: { albummatches: { album: searchResults } } } = searchAlbumsResponse;

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

  if (constants.isDev) console.log('Search results found:', searchResultsFilteredSorted);

  await utils.storageSet({ [state.searchCacheKey]: searchResultsFilteredSorted }, 'local');

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
  const data = await api.getReleaseInfo({
    releaseType: state.releaseType,
    apiKey: config.lastfmApiKey || process.env.LASTFM_API_KEY as string,
    params: {
      artist: state.artistQuery,
      title: state.releaseTitleQuery,
      username: state.userName,
    },
  });

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

  if (!config.lastfmApiKey) {
    utils.storageSet({
      [state.storageKey]: { timestamp: Date.now(), data: stats },
    }, 'local');
  }

  populateReleaseStats(stats);
}

async function render(_config: ProfileOptions) {
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);

  if (!parent) {
    console.warn('No main section found, skipping release stats rendering.');
    return;
  }

  if (!_config) return;

  config = _config;

  uiElements.parent = parent;

  state.artistNames = getArtistNames(parent);

  const releaseType = getReleaseType(parent);
  if (releaseType) state.releaseType = releaseType;

  state.releaseTitle = getReleaseTitle(parent);

  state.releaseId = getReleaseId(parent);

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
  targetSelectors: [PARENT_SELECTOR],
};
