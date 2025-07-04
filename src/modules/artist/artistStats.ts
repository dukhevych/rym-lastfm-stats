import * as api from '@/api';
import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';
import { createSvgUse } from '@/helpers/sprite';
import { createElement as h } from '@/helpers/dom';
import { storageGet, storageSet, generateStorageKey, getLastfmUserName } from '@/helpers/storageUtils';

import {
  getArtistId,
  getArtistNames,
  PARENT_SELECTOR,
  ARTIST_INFO_SELECTOR,
} from './targets';

import '@/modules/release/releaseStats.css';

interface UIElements {
  parent: HTMLElement;
  artistInfoMain: HTMLElement;
  statsList: HTMLElement;
  listeners: HTMLElement;
  playcount: HTMLElement;
  userplaycount: HTMLElement;
  lastfmLinksContainer: HTMLElement;
  lastfmLink: HTMLAnchorElement;
  statsWrapper: HTMLElement;
  heading: HTMLElement;
  content: HTMLElement;
  artistNamesDialog: HTMLDialogElement;
  artistNamesDialogList: HTMLUListElement;
  artistNamesDialogListItems: HTMLLIElement[];
  artistNamesDialogOpener: HTMLAnchorElement;
}

interface State {
  artistName: string;
  artistNameLocalized: string;
  artistAkaNames: string[];
  artistAdditionalNames: string[];
  artistId: string;
  artistQuery: string;
  artistQueryCacheKey: string;
  artistNameOptions: string[];
  notFound: boolean;
  userName: string;
  cacheStorageKey: string;
}

let config: ProfileOptions;
const uiElements = {} as UIElements;
const state = {
  get artistNameOptions(): string[] {
    return Array.from(new Set([this.artistNameLocalized, this.artistName, ...this.artistAkaNames, ...this.artistAdditionalNames].filter(Boolean)));
  },
  get artistQueryCacheKey(): string { return generateStorageKey('artistQuery', this.artistId); },
  get cacheStorageKey(): string { return generateStorageKey('artistStats', this.artistId, this.artistQuery); },
} as State;

function createArtistNamesDialog() {
  const list = h('ul', { className: 'list-dialog' });

  const dialog = h('dialog', { className: 'dialog-base', id: 'dialog-artist-names' }, [
    h(
      'h2',
      { className: 'dialog-title' },
      [
        'Choose artist name',
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

async function updateStats() {
  let stats: ArtistStats | null = null;
  let timestamp: number | undefined;

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

    stats = await fetchArtistInfo(state.artistQuery);
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
    updateArtistInfo(stats, timestamp);
  } else {
    uiElements.statsWrapper.classList.add('no-data');
  }
}

async function fetchArtistInfo(artistName: string) {
  const artistInfoResponse = await api.getArtistInfo({
    params: {
      username: state.userName,
      artist: artistName,
    },
    apiKey: config.lastfmApiKey || process.env.LASTFM_API_KEY as string,
  });

  const stats: ArtistStats = {
    playcount: 0,
    listeners: 0,
    userplaycount: null,
    url: '',
  };

  if (artistInfoResponse && !artistInfoResponse.error) {
    stats.playcount = +artistInfoResponse.artist.stats.playcount;
    stats.listeners = +artistInfoResponse.artist.stats.listeners;
    stats.userplaycount = artistInfoResponse.artist.stats.userplaycount ? +artistInfoResponse.artist.stats.userplaycount : null;
    stats.url = artistInfoResponse.artist.url;

    return stats;
  } else {
    return null;
  }
}

interface ArtistStats {
  playcount: number;
  listeners: number;
  userplaycount?: number | null;
  url: string;
}

function updateArtistInfo(stats: ArtistStats, timestamp: number) {
  populateArtistStats(stats, timestamp);
}

function updateDialogState() {
  if (!uiElements.artistNamesDialog) {
    return;
  }

  uiElements.artistNamesDialogListItems.forEach(item => {
    const itemArtistName = item.dataset.value;
    if (itemArtistName === state.artistQuery) {
      item.classList.add('is-selected');
    } else {
      item.classList.remove('is-selected');
    }
  });
}

function createArtistNamesDialogListItem(artistName: string) {
  return h('li', { className: 'list-dialog-item', dataset: { value: artistName } }, [
    h(
      'a',
      {
        href: utils.generateLastFMProfileUrl(artistName),
        className: 'list-dialog-item-link',
        onClick: async (e: MouseEvent) => {
          e.preventDefault();

          // SET VALUES
          state.artistQuery = artistName;

          // UPDATE VALUES IN CACHE
          storageSet({
            [state.artistQueryCacheKey]: state.artistQuery,
          }, 'local');

          // CLOSE DIALOG
          uiElements.artistNamesDialog.close();

          // UPDATE STATS
          uiElements.statsWrapper.classList.add('is-updating');
          await updateStats();
          uiElements.statsWrapper.classList.remove('is-updating');
        },
      },
      artistName,
    ),
  ]);
}

function populateSwitchArtistDialog() {
  if (!uiElements.artistNamesDialogList || !uiElements.artistNamesDialog) return;

  uiElements.artistNamesDialogList.replaceChildren();

  if (!state.artistNameOptions || state.artistNameOptions.length === 0) {
    const noResultsItem = h('li', { className: 'artist-name-item is-no-results' }, 'No results found');
    uiElements.artistNamesDialogList.appendChild(noResultsItem);
    return;
  }

  uiElements.artistNamesDialogListItems = state.artistNameOptions.map(createArtistNamesDialogListItem);
  uiElements.artistNamesDialogList.append(...uiElements.artistNamesDialogListItems);
}

function prepareArtistNamesDialog() {
  const { dialog, list } = createArtistNamesDialog();
  uiElements.artistNamesDialogList = list;
  uiElements.artistNamesDialog = dialog;

  document.body.appendChild(uiElements.artistNamesDialog);
}

function initUI() {
  uiElements.statsList = h('ul', { className: 'list-stats' }, [
    uiElements.listeners = h('li', { className: 'is-listeners' }, 'listeners'),
    uiElements.playcount = h('li', { className: 'is-playcount' }, 'plays'),
    uiElements.userplaycount = h('li', { className: 'is-user-playcount' })
  ]);

  uiElements.lastfmLink = h(
    'a',
    {
      className: [ 'lastfm-link', 'is-localized' ],
      target: '_blank',
    },
    createSvgUse('svg-lastfm-square-symbol')
  );

  uiElements.statsWrapper = h(
    'div',
    { className: ['list-stats-wrapper', 'is-loading'] },
    [
      uiElements.statsList,
      uiElements.lastfmLink,
    ]
  );

  if (uiElements.artistNamesDialog) {
    uiElements.artistNamesDialogOpener = uiElements.artistNamesDialog && h(
      'a',
      {
        className: 'incorrect-stats-link',
        onClick: (e: MouseEvent) => {
          e.preventDefault();
          uiElements.artistNamesDialog.showModal();
        },
      },
      'Switch artist'
    );

    uiElements.statsWrapper.append(uiElements.artistNamesDialogOpener);
  }

  uiElements.heading = h('div', {
    className: 'info_hdr',
    id: 'lastfm_label',
  }, 'Last.fm');

  uiElements.content = h('div', {
    className: 'info_content',
  }, uiElements.statsWrapper);

  uiElements.artistInfoMain = uiElements.parent.querySelector(ARTIST_INFO_SELECTOR)!;

  uiElements.artistInfoMain.append(uiElements.heading, uiElements.content);
}

function populateArtistStats(
  stats: ArtistStats,
  timestamp?: number | null,
) {
  const { playcount, listeners, userplaycount, url } = stats;

  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  if (listeners !== undefined) {
    uiElements.listeners.style.display = 'block';
    uiElements.listeners.dataset.value = utils.shortenNumber(Math.trunc(listeners));
    uiElements.listeners.title = `${listeners} listeners ${cacheTimeHint}`;
  } else {
    uiElements.listeners.style.display = 'none';
  }

  if (playcount !== undefined) {
    uiElements.playcount.style.display = 'block';
    uiElements.playcount.dataset.value = utils.shortenNumber(Math.trunc(playcount));
    uiElements.playcount.title = `${playcount}, ${Math.trunc(playcount / listeners)} per listener ${cacheTimeHint}`;
  } else {
    uiElements.playcount.style.display = 'none';
  }

  if (userplaycount !== undefined && userplaycount !== null) {
    uiElements.userplaycount.style.display = 'block';
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(Math.trunc(userplaycount || 0))}`;
  } else {
    uiElements.userplaycount.style.display = 'none';
  }

  if (url) {
    uiElements.lastfmLink.href = url;
    uiElements.lastfmLink.title = `View ${state.artistQuery} on Last.fm`;
  } else {
    uiElements.lastfmLink.href = '';
    uiElements.lastfmLink.title = '';
  }
}

async function render(_config: ProfileOptions) {
  // SET PARENT ELEMENT
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) return;
  uiElements.parent = parent;

  // SET CONFIG
  if (!_config) return;
  config = _config;

  // SET ARTIST ID
  state.artistId = getArtistId(uiElements.parent);
  if (!state.artistId) {
    console.warn('No artist ID found.');
    return;
  }

  // SET PAGE DATA
  const {
    artistName,
    artistNameLocalized,
    artistAkaNames,
    artistAdditionalNames,
  } = getArtistNames(uiElements.parent);
  state.artistName = artistName;
  state.artistNameLocalized = artistNameLocalized;
  state.artistAkaNames = artistAkaNames;
  state.artistAdditionalNames = artistAdditionalNames;

  // CHECK IF ARTIST NAME IS SET
  if (!state.artistName && !state.artistNameLocalized) {
    console.error('No artist found.');
    return;
  }

  // INIT QUERIES
  state.artistQuery = await storageGet(state.artistQueryCacheKey, 'local') || state.artistName;

  // SET USER NAME
  const userName = await getLastfmUserName();
  if (userName) state.userName = userName;

  // PREPARE ARTIST NAMES DIALOG
  if (state.artistNameOptions.length > 1) {
    prepareArtistNamesDialog();
  }

  // INIT UI
  initUI();

  // POPULATE ARTIST NAMES DIALOG
  populateSwitchArtistDialog();

  // FETCH AND POPULATE STATS
  await updateStats();
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};
