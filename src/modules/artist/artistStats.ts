import * as utils from '@/helpers/utils';
import * as api from '@/api';
import { createElement as h } from '@/helpers/utils';

import '@/modules/release/releaseStats.css';

const PARENT_SELECTOR = '.artist_left_col';
const ARTIST_INFO_SELECTOR = '.artist_info_main';
const ARTIST_ID_SELECTOR = 'input.rym_shortcut';

function getArtistId(parent: HTMLElement) {
  const artistIdInput: HTMLInputElement = parent.querySelector(ARTIST_ID_SELECTOR)!;
  return utils.extractIdFromTitle(artistIdInput.value);
}

function getArtistNames(parent: HTMLElement) {
  let artistAkaNames: string[] = [];

  const artistNameHeader = parent.querySelector('.artist_name_hdr');
  const artistName = utils.getNodeDirectTextContent(artistNameHeader);
  const artistNameHeaderSpan = artistNameHeader?.querySelector('span');
  const artistNameLocalized = artistNameHeaderSpan?.textContent;

  const artistAkaNamesElementHeader = Array.from(parent.querySelectorAll(ARTIST_INFO_SELECTOR + ' .info_hdr')).find(element => {
    return element.textContent?.toLowerCase().includes('also known as');
  });

  if (artistAkaNamesElementHeader) {
    const artistAkaNamesElement = artistAkaNamesElementHeader.nextElementSibling;
    const artistAkaNamesText = artistAkaNamesElement?.querySelector('span')?.textContent;
    if (artistAkaNamesText) {
      artistAkaNamesText.split(', ').forEach(name => {
        const nameCleaned = name.replace(/\s*\[birth name\]$/i, '').trim(); // Check for other patterns to remove
        artistAkaNames.push(nameCleaned);
      });
    }
  }

  return {
    artistName,
    artistNameLocalized,
    artistAkaNames,
  };
}

interface UIElements {
  parent: HTMLElement;
  artistInfoMain: HTMLElement;
  statsList: HTMLElement;
  listeners: HTMLElement;
  playcount: HTMLElement;
  userplaycount: HTMLElement;
  lastfmLinksContainer: HTMLElement;
  lastfmLink: HTMLAnchorElement;
  // lastfmLink2: HTMLAnchorElement;
  statsWrapper: HTMLElement;
  heading: HTMLElement;
  content: HTMLElement;
}

interface State {
  artistQuery: string;
  artistQueryCacheKey: string;
  artistNameOptions: string[];
  notFound: boolean;
  userName: string;
  storageKey: string;
}

let config: ProfileOptions;
const uiElements = {} as UIElements;
const state = {} as State;

function prepareArtistStatsUI() {
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
    utils.createSvgUse('svg-lastfm-square-symbol')
  );

  uiElements.statsWrapper = h(
    'div',
    { className: ['list-stats-wrapper', 'is-loading'] },
    [uiElements.statsList, uiElements.lastfmLink]
  );

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

interface ArtistStats {
  playcount: number;
  listeners: number;
  userplaycount?: number;
  url: string;
  notFound: boolean;
}

function populateArtistStats(
  { playcount, listeners, userplaycount, url, notFound }: ArtistStats,
  timestamp?: number,
) {
  uiElements.statsWrapper.classList.remove('is-loading');

  if (notFound) {
    uiElements.statsWrapper.classList.add('not-found');
    return;
  }

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

  if (userplaycount !== undefined) {
    uiElements.userplaycount.style.display = 'block';
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(Math.trunc(userplaycount))}`;
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
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) return;
  uiElements.parent = parent;

  if (!_config) return;

  config = _config;

  const { artistName, artistNameLocalized, artistAkaNames } = getArtistNames(uiElements.parent);
  const artistId = getArtistId(uiElements.parent);

  if (!artistName && !artistNameLocalized) {
    console.error('No artist found.');
    return;
  }

  state.artistNameOptions = [artistName];
  if (artistNameLocalized) state.artistNameOptions.unshift(artistNameLocalized);
  if (artistAkaNames.length > 0) state.artistNameOptions.push(...artistAkaNames);

  state.artistQueryCacheKey = `artistQuery_${artistId}`;
  state.artistQuery = await utils.storageGet(state.artistQueryCacheKey, 'local');

  if (!state.artistQuery) {
    state.artistQuery = state.artistNameOptions[0];
  }

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;
  if (userName) state.userName = userName;

  state.storageKey = `artistStats_${state.artistQuery}`;

  prepareArtistStatsUI();

  if (!config.lastfmApiKey) {
    const cachedData = await utils.storageGet(state.storageKey, 'local');

    if (cachedData) {
      const { timestamp, data } = cachedData;
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        console.log('Inserting cached lastfm data:', data);
        populateArtistStats(data, timestamp);
        return;
      }
    }
  }

  const artistInfoResponse = await api.getArtistInfo({
    params: {
      username: userName,
      artist: state.artistQuery,
    },
    apiKey: config.lastfmApiKey || process.env.LASTFM_API_KEY as string,
  });

  let playcount = 0;
  let listeners = 0;
  let userplaycount;
  let url = null;
  let notFound = false;

  if (artistInfoResponse && !artistInfoResponse.error) {
    playcount += +artistInfoResponse.artist.stats.playcount;
    listeners += +artistInfoResponse.artist.stats.listeners;

    if (artistInfoResponse.artist.stats.userplaycount) {
      userplaycount = 0;
      userplaycount += +artistInfoResponse.artist.stats.userplaycount;
    }

    url = artistInfoResponse.artist.url;
  } else {
    notFound = true;
  }

  const stats: ArtistStats = {
    playcount,
    listeners,
    userplaycount,
    url,
    notFound,
  };

  if (!config.lastfmApiKey) {
    await utils.storageSet({
      [state.storageKey]: {
        timestamp: Date.now(),
        data: stats,
      },
    }, 'local');
  }

  populateArtistStats(stats);
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};
