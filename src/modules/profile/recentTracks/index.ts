import { RecordsAPI } from '@/helpers/records-api';
import { formatDistanceToNow } from 'date-fns';
import * as utils from '@/helpers/utils';
import { createElement as h } from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import * as api from '@/api';
import lockSvg from '@/assets/icons/lock.svg?raw';
import unlockSvg from '@/assets/icons/unlock.svg?raw';
import './recentTracks.css';
import RecentTracks from '@/components/svelte/RecentTracks.svelte';
import { mount } from 'svelte';
import errorMessages from './errorMessages.json';
import type {
  UIPlayHistory,
  UIRecentTracks,
  TrackDataNormalized,
  PlayHistoryData,
} from './types';

// SELECTORS
const PARENT_SELECTOR = '.profile_listening_container';
const PROFILE_LISTENING_SET_TO_SELECTOR = '.profile_set_listening_box';
const PROFILE_LISTENING_CURRENT_TRACK_SELECTOR = '#profile_play_history_container';
const PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR = '.profile_view_play_history_btn';
const PROFILE_LISTENING_PLAY_HISTORY_BTN = '.profile_view_play_history_btn a.btn[href^="/play-history/"]';

// CONFIG
interface RecentTracksConfig extends ProfileOptions {
  isMyProfile: boolean;
  userName?: string;
}
let config: RecentTracksConfig;

// TEMPLATES
interface Templates {
  volumeIcon: SVGElement,
  starIcon: SVGElement,
}
const templates = {} as Templates;

// STATE
interface State {
  userName: string,
  intervalId: ReturnType<typeof setInterval> | null,
  lastTick: number,
  abortController: AbortController,
  progressLoopActive: boolean,
  failedToFetch: boolean,
  rymSyncTimestamp: number | null,
}
const state = {
  abortController: new AbortController(),
  intervalId: null,
  failedToFetch: false,
  progressLoopActive: false,
} as State;

// UI ELEMENTS
interface UIElements {
  card: UIPlayHistory,
  list: UIRecentTracks,
}
const uiElements = {
  card: {} as UIPlayHistory,
  list: {} as UIRecentTracks,
} as UIElements;

const PLAY_HISTORY_ITEM_CLASSES = {
  item: 'play_history_item',
  artbox: 'play_history_artbox',
  infobox: 'play_history_infobox',
  itemArt: 'play_history_item_art',
  infoboxLower: 'play_history_infobox_lower',
  itemDate: 'play_history_item_date',
  statusSpan: 'current-track-status',
  release: 'play_history_item_release',
  artistSpan: 'play_history_item_artist',
  artistLink: 'artist',
  separator: 'play_history_separator',
  trackLink: 'album play_history_item_release',
  customMyRating: 'custom-my-rating',
  customFromAlbum: 'custom-from-album',
}

function createPlayHistoryItem() {
  templates.volumeIcon = utils.createSvgUse('svg-volume-symbol', '0 0 40 40');
  templates.starIcon = utils.createSvgUse('svg-star-symbol');

  uiElements.card.item = h('div', {
    class: PLAY_HISTORY_ITEM_CLASSES.item,
    dataset: { element: 'rymstats-track-item' },
  });

  uiElements.card.artbox = h('div', {
    class: PLAY_HISTORY_ITEM_CLASSES.artbox,
    dataset: { element: 'rymstats-track-artbox' },
  }, [
    uiElements.card.artLink = h('a', {}, [
      uiElements.card.itemArt = h('img', {
        class: PLAY_HISTORY_ITEM_CLASSES.itemArt,
        dataset: { element: 'rymstats-track-item-art' },
      }),
    ]),
  ]);

  uiElements.card.infobox = h('div', {
    class: PLAY_HISTORY_ITEM_CLASSES.infobox,
    dataset: { element: 'rymstats-track-infobox' },
  }, [
    uiElements.card.customMyRating = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.customMyRating,
      dataset: { element: 'rymstats-track-rating' },
    }, config.isMyProfile ? [
      uiElements.card.starsWrapper = h('div', {
        dataset: { element: 'rymstats-track-rating-stars' },
      }, [
        uiElements.card.starsFilled = h('div', {
          class: 'stars-filled',
          dataset: { element: 'rymstats-track-rating-stars-filled' },
        }),
        uiElements.card.starsEmpty = h('div', {
          class: 'stars-empty',
          dataset: { element: 'rymstats-track-rating-stars-empty' },
        }),
      ]),
      uiElements.card.format = h('div', {
        class: 'rymstats-track-format',
        dataset: { element: 'rymstats-track-format' },
      }),
    ] : config.userName),
    uiElements.card.itemDate = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.itemDate,
      dataset: { element: 'rymstats-track-item-date' },
    }, [
      uiElements.card.statusSpan = h('span'),
      templates.volumeIcon.cloneNode(true),
    ]),
    uiElements.card.infoboxLower = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.infoboxLower,
      dataset: { element: 'rymstats-track-infobox-lower' },
    }, [
      uiElements.card.release = h('div', {
        class: PLAY_HISTORY_ITEM_CLASSES.release,
        dataset: { element: 'rymstats-track-release' },
      }, [
        uiElements.card.artistSpan = h('span', {
          class: PLAY_HISTORY_ITEM_CLASSES.artistSpan,
          dataset: { element: 'rymstats-track-artist' },
        }, [
          uiElements.card.artistLink = h('a', {
            dataset: { element: 'rymstats-track-artist-link' },
          }),
        ]),
        uiElements.card.separator = h('span', {
          class: PLAY_HISTORY_ITEM_CLASSES.separator,
        }, ' - '),
        uiElements.card.trackLink = h('a', {
          class: PLAY_HISTORY_ITEM_CLASSES.trackLink,
          dataset: { element: 'rymstats-track-link' },
        }),
      ]),
    ]),
    uiElements.card.customFromAlbum = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.customFromAlbum,
      dataset: { element: 'rymstats-from-album' },
    }),
  ]);

  if (config.isMyProfile) {
    for (let i = 0; i < 5; i++) {
      uiElements.card.starsFilled.appendChild(templates.starIcon.cloneNode(true));
      uiElements.card.starsEmpty.appendChild(templates.starIcon.cloneNode(true));
    }
  }

  uiElements.card.item.appendChild(uiElements.card.artbox);
  uiElements.card.item.appendChild(uiElements.card.infobox);
}

async function populateRecentTrackCard(data: PlayHistoryData) {
  const {
    artistName,
    artistUrl,
    albumName,
    albumUrl,
    trackName,
    trackUrl,
    coverLargeUrl,
    nowPlaying,
    timestamp,
  } = data;

  if (nowPlaying) {
    uiElements.card.item.classList.add('is-now-playing');
  } else {
    uiElements.card.item.classList.remove('is-now-playing');
  }

  uiElements.card.artLink.href = albumUrl;
  uiElements.card.artLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;

  uiElements.card.itemArt.src = coverLargeUrl;

  if (nowPlaying) {
    uiElements.card.itemDate.dataset.label = 'Scrobbling now';
    uiElements.card.itemDate.title = '';
  } else {
    const date = new Date((timestamp as number) * 1000);
    const dateFormatted = formatDistanceToNow(date, { addSuffix: true });
    uiElements.card.itemDate.dataset.label = `Last scrobble (${dateFormatted})`;
    uiElements.card.itemDate.title = date.toLocaleString();
  }

  uiElements.card.trackLink.href = trackUrl;
  uiElements.card.trackLink.title = `Search for "${artistName} - ${trackName}" on RateYourMusic`;
  uiElements.card.trackLink.textContent = trackName;
  uiElements.card.artistLink.href = artistUrl;
  uiElements.card.artistLink.title = `Search for "${artistName}" on RateYourMusic`;
  uiElements.card.artistLink.textContent = artistName;

  if (config.isMyProfile) {
    const albumNameFallback = utils.cleanupReleaseEdition(albumName);

    const albumsFromDB = await RecordsAPI.getByArtistAndTitle(
      artistName,
      albumName,
      albumNameFallback,
      true,
    );

    if (constants.isDev) console.log('Albums from DB:', albumsFromDB);

    uiElements.card.customMyRating.classList.remove('no-rating');
    uiElements.card.customMyRating.classList.remove('has-ownership');
    uiElements.card.customMyRating.title = '';

    if (Array.isArray(albumsFromDB) && albumsFromDB.length > 0) {
      let formats = new Set<ERYMFormat>();

      const albumsFromDBFullMatch: IRYMRecordDBMatch[] = [];
      const albumsFromDBPartialMatch: IRYMRecordDBMatch[] = [];

      albumsFromDB.forEach((album) => {
        if (album.ownership === 'o' && album.format) {
          formats.add(album.format);
        }

        if (album._match === 'full') {
          albumsFromDBFullMatch.push(album);
        } else if (album._match === 'partial') {
          albumsFromDBPartialMatch.push(album);
        } else {
          albumsFromDBPartialMatch.push(album);
        }
      });

      const earliestFullMatchRating = utils.getEarliestRating(albumsFromDBFullMatch);
      const earliestPartialMatchRating = utils.getEarliestRating(albumsFromDBPartialMatch);

      let rating = earliestFullMatchRating || earliestPartialMatchRating;

      if (rating > 0) {
        uiElements.card.starsFilled.style.width = `${rating * 10}%`;
        uiElements.card.starsWrapper.title = `${rating / 2} / 5`;
      }

      if (rating === 0) {
        uiElements.card.starsFilled.style.width = '';
        uiElements.card.starsWrapper.title = '';
        uiElements.card.customMyRating.classList.add('no-rating');
      }

      uiElements.card.format.textContent = Array.from(formats).map(key => constants.RYMFormatsLabels[key] || key).join(', ');

      if (formats.size > 0) {
        uiElements.card.customMyRating.classList.add('has-ownership');
      }
    } else {
      uiElements.card.starsFilled.style.width = '';
      uiElements.card.starsWrapper.title = '';
      uiElements.card.customMyRating.classList.add('no-rating');
    }
  }

  if (albumName && albumUrl) {
    uiElements.card.customFromAlbum.textContent = '';
    const albumLink = h('a', {
      href: albumUrl,
      title: `Search for "${artistName} - ${albumName}" on RateYourMusic`,
    }, albumName);
    uiElements.card.customFromAlbum.appendChild(albumLink);
  } else {
    uiElements.card.customFromAlbum.textContent = '';
  }
}

function prepareRecentTracksUI() {
  uiElements.list.button = h('button', {
    class: 'btn-lastfm btn blue_btn btn_small',
    dataset: { element: 'rymstats-lastfm-button' },
  }, [ utils.createSvgUse('svg-playlist-symbol') ]);
  uiElements.list.lockButton = h('button', { class: 'btn-lastfm-lock' }, [
    new DOMParser().parseFromString(unlockSvg, 'image/svg+xml').documentElement,
    new DOMParser().parseFromString(lockSvg, 'image/svg+xml').documentElement
  ]);
  uiElements.list.profileButton = h('a', {
    class: 'btn-profile btn blue_btn btn_small',
    target: '_blank',
  }, [
    'Profile',
    utils.createSvgUse('svg-lastfm-symbol'),
  ]);
  uiElements.list.tracksWrapper = h('div', {
    className: [
      'profile_listening_container',
      'lastfm-tracks-wrapper',
    ],
  });

  if (config.recentTracksShowOnLoad) {
    uiElements.list.tracksWrapper.classList.add('is-active');
    uiElements.list.tracksWrapper.classList.add('is-loading');
    uiElements.list.lockButton.classList.add('is-locked');
  }

  uiElements.list.button.addEventListener('click', () => {
    uiElements.list.tracksWrapper.classList.toggle('is-active');
  });

  uiElements.list.lockButton.addEventListener('click', async () => {
    if (uiElements.list.lockButton.classList.contains('is-locked')) {
      await utils.storageSet({ recentTracksShowOnLoad: false });
      uiElements.list.lockButton.classList.remove('is-locked');
    } else {
      await utils.storageSet({ recentTracksShowOnLoad: true });
      uiElements.list.lockButton.classList.add('is-locked');
      uiElements.list.tracksWrapper.classList.add('is-active');
    }
  });

  uiElements.list.panelContainer.classList.add(`bg-option-${config.recentTracksBackground}`)
  uiElements.list.panelContainer.dataset['element'] = 'rymstats-track-panel';

  const panelBgSwitcher = h('button', { class: 'btn-bg-switcher' }, [
    utils.createSvgUse('svg-brush-symbol')
  ]);

  const bgOptionsQty = 22;

  const bgName = constants.RECENT_TRACK_BACKGROUND_NAMES[config.recentTracksBackground] ||
    `${config.recentTracksBackground + 1} / ${bgOptionsQty}`;
  panelBgSwitcher.dataset.option = bgName;
  panelBgSwitcher.title = `Background option ${config.recentTracksBackground + 1} / ${bgOptionsQty}`;

  panelBgSwitcher.addEventListener('click', async () => {
    uiElements.list.panelContainer.classList.remove(`bg-option-${config.recentTracksBackground}`);
    let newBgOption;
    if (config.recentTracksBackground === (bgOptionsQty - 1)) newBgOption = 0;
    else newBgOption = config.recentTracksBackground + 1;
    config.recentTracksBackground = newBgOption;
    await utils.storageSet({
      recentTracksBackground: newBgOption,
    });
    uiElements.list.panelContainer.classList.add(`bg-option-${newBgOption}`);
    panelBgSwitcher.title = `Background option ${newBgOption + 1} / ${bgOptionsQty}`;
    const bgName = constants.RECENT_TRACK_BACKGROUND_NAMES[newBgOption + 1] || `${newBgOption + 1} / ${bgOptionsQty}`;
    panelBgSwitcher.dataset.option = bgName || `${newBgOption + 1} / ${bgOptionsQty}`;
  });

  uiElements.list.panelContainer.appendChild(panelBgSwitcher);

  const setToBtn: HTMLElement | null = uiElements.list.panelContainer.querySelector(PROFILE_LISTENING_SET_TO_SELECTOR);
  if (setToBtn) setToBtn.remove();

  const playHistoryBtn: HTMLElement | null = uiElements.list.panelContainer.querySelector(PROFILE_LISTENING_PLAY_HISTORY_BTN);
  if (playHistoryBtn) playHistoryBtn.remove();

  const currentTrackContainer: HTMLElement | null = uiElements.list.panelContainer.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);
  if (currentTrackContainer) {
    currentTrackContainer.classList.add('recent-tracks-current');
    createPlayHistoryItem();
    currentTrackContainer.replaceChildren(uiElements.card.item);
    const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
    icon.classList.add('loader');
    currentTrackContainer.appendChild(icon);
  }

  const buttonsContainer: HTMLElement | null = uiElements.list.panelContainer.querySelector(PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR);

  if (buttonsContainer) {
    buttonsContainer.prepend(uiElements.list.profileButton);
    buttonsContainer.prepend(uiElements.list.button);
    buttonsContainer.prepend(uiElements.list.lockButton);
  }
}

function createTracksList(recentTracks: TrackDataNormalized[]) {
  const tracksList = h('ul');
  recentTracks.forEach((track) => {
    const trackItem = createTrackItem(track);
    trackItem.dataset.id = `${track.artistName}-${track.trackName}-${track.timestamp || ''}`;
    tracksList.appendChild(trackItem);
  });
  return tracksList;
}

function createTrackItem(track: TrackDataNormalized) {
  return h('li', {
    class: track.nowPlaying ? 'is-now-playing' : '',
  }, [
    createTrackCover(track),
    createTrackTitle(track),
    createTrackArtist(track),
    createTrackDate(track),
  ]);
}

function createTrackCover(track: TrackDataNormalized) {
  return h('div', {
    class: 'track-image',
  }, [
    h('a', {
      href: utils.generateSearchUrl({
        artist: track.artistName,
        releaseTitle: track.albumName || '',
        trackTitle: track.albumName ? '' : track.trackName,
      }),
      title: `Search for "${track.artistName} - ${track.albumName || track.trackName}" on RateYourMusic`,
    }, [
      track.coverUrl ? h('img', {
        src: track.coverUrl,
        alt: `${track.artistName} - ${track.albumName || track.trackName}`,
      }) : '',
    ])
  ]);
}

function createTrackTitle(track: TrackDataNormalized) {
  return h('a', {
    class: 'track-title',
    href: utils.generateSearchUrl({
      artist: track.artistName,
      trackTitle: track.trackName,
    }),
    title: `Search for "${track.artistName} - ${track.albumName || track.trackName}" on RateYourMusic`,
  }, track.trackName);
}

function createTrackArtist(track: TrackDataNormalized) {
  return h('div', {
    class: 'track-artist',
  }, [
    h('a', {
      href: utils.generateSearchUrl({
        artist: track.artistName,
      }),
      title: `Search for "${track.artistName}" on RateYourMusic`,
    }, track.artistName),
  ])
}

function createTrackDate(track: TrackDataNormalized) {
  return h('span', {
    class: 'track-date',
    title: track.nowPlaying ? 'Scrobbling now' : new Date((track.timestamp as number) * 1000).toLocaleString(),
  }, [
    track.nowPlaying ? templates.volumeIcon.cloneNode(true) : '',
    track.nowPlaying ? 'Scrobbling now' : formatDistanceToNow(new Date((track.timestamp as number) * 1000), {
      addSuffix: true,
    }),
  ]);
}

function initializeColors(colors: utils.VibrantUiColors) {
  utils.setColorVar('--clr-light-bg', colors.light.bgColor);
  utils.setColorVar('--clr-light-bg-contrast', colors.light.bgColorContrast);
  utils.setColorVar('--clr-light-accent', colors.light.accentColor);
  utils.setColorVar('--clr-light-accent-contrast', colors.light.accentColorContrast);
  utils.setColorVar('--clr-dark-bg', colors.dark.bgColor);
  utils.setColorVar('--clr-dark-bg-contrast', colors.dark.bgColorContrast);
  utils.setColorVar('--clr-dark-accent', colors.dark.accentColor);
  utils.setColorVar('--clr-dark-accent-contrast', colors.dark.accentColorContrast);

  utils.setColorVar('--clr-light-accent-hue', String(Math.trunc(colors.light.accentColorHSL[0] * 360)));
  utils.setColorVar(
    '--clr-light-accent-saturation',
    (colors.light.accentColorHSL[1] * 100).toFixed(2),
  );
  utils.setColorVar(
    '--clr-light-accent-lightness',
    (colors.light.accentColorHSL[2] * 100).toFixed(2),
  );

  utils.setColorVar('--clr-dark-accent-hue', String(Math.trunc(colors.dark.accentColorHSL[0] * 360)));
  utils.setColorVar(
    '--clr-dark-accent-saturation',
    (colors.dark.accentColorHSL[1] * 100).toFixed(2),
  );
  utils.setColorVar('--clr-dark-accent-lightness', (colors.dark.accentColorHSL[2] * 100).toFixed(2));

  Object.keys(colors.palette).forEach((key) => {
    if (colors.palette[key]?.hex) {
      utils.setColorVar(`--clr-palette-${key.toLowerCase()}`, colors.palette[key].hex);
    }
  });
}

async function populateRecentTracks (data: TrackDataNormalized[], timestamp: number) {
  let colors;

  const recentTrack = data[0];

  try {
    colors = await utils.getImageColors(recentTrack.coverExtraLargeUrl);
  } catch {
    console.warn(errorMessages.failedToFetchColors);
  }

  if (recentTrack.nowPlaying) {
    uiElements.list.panelContainer.classList.add('is-now-playing');
  } else {
    uiElements.list.panelContainer.classList.remove('is-now-playing');
  }

  const artistUrl = utils.generateSearchUrl({
    artist: recentTrack.artistName,
  });
  const albumUrl = utils.generateSearchUrl({
    artist: recentTrack.artistName,
    releaseTitle: recentTrack.albumName,
  });
  const trackUrl = utils.generateSearchUrl({
    artist: recentTrack.artistName,
    trackTitle: recentTrack.trackName,
  });

  await populateRecentTrackCard({
    ...recentTrack,
    artistUrl,
    albumUrl,
    trackUrl,
  });

  uiElements.card.item.classList.add('is-loaded');

  uiElements.list.panelContainer.style.setProperty('--bg-image', `url(${recentTrack.coverExtraLargeUrl})`);

  if (colors) initializeColors(colors);

  const tracklistData = data[0].nowPlaying ? data.slice(1) : data;
  const tracksList = createTracksList(tracklistData);

  uiElements.list.tracksWrapper.replaceChildren(tracksList);
  uiElements.list.tracksWrapper.dataset.timestamp = `Updated at ${new Date(timestamp).toLocaleString()}`;
  uiElements.list.tracksWrapper.classList.remove('is-loading');
}

async function fetchAndRenderRecentTracks() {
  state.abortController?.abort();
  state.abortController = new AbortController();

  try {
    const recentTracksResponse = await api.getRecentTracks({
      apiKey: config.lastfmApiKey,
      params: {
        username: state.userName,
        limit: config.recentTracksLimit,
      },
      signal: state.abortController.signal,
    });

    const { recenttracks: { track: data } } = recentTracksResponse;

    const timestamp = Date.now();

    const normalizedData = data.map((item): TrackDataNormalized => ({
      nowPlaying: item["@attr"]?.nowplaying === 'true',
      coverUrl: item.image[0]['#text'],
      coverLargeUrl: item.image[3]['#text'],
      coverExtraLargeUrl: item.image[item.image.length - 1]['#text'],
      trackName: item.name,
      timestamp: item.date?.uts ? Number(item.date.uts) : null,
      albumName: item.album['#text'],
      artistName: item.artist['#text'],
    }));

    await utils.storageSet({
      recentTracksCache: {
        data: normalizedData,
        timestamp,
        userName: state.userName,
      }
    }, 'local');

    await populateRecentTracks(
      normalizedData,
      timestamp,
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      state.failedToFetch = true;
      stopInterval();
    }
  }
};

function getPollingProgress() {
  if (!state.lastTick) return 0;
  const elapsed = Date.now() - state.lastTick;
  return Math.min(elapsed / constants.RECENT_TRACKS_INTERVAL_MS, 1);
}

function updateProgressVisual() {
  const progress = getPollingProgress();
  const angle = Math.trunc(progress * 360);
  uiElements.list.button.style.setProperty('--progress', `${angle}deg`);

  if (progress >= 1) {
    uiElements.list.button.classList.add('is-fetching');
  } else {
    uiElements.list.button.classList.remove('is-fetching');
  }
}

function startProgressLoop() {
  if (state.progressLoopActive) return;
  state.progressLoopActive = true;

  const loop = () => {
    if (!state.progressLoopActive) return;
    updateProgressVisual();
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

const startInterval = () => {
  if (!state.intervalId) {
    state.lastTick = Date.now();
    state.intervalId = setInterval(async () => {
      await fetchAndRenderRecentTracks();
      state.lastTick = Date.now();
    }, constants.RECENT_TRACKS_INTERVAL_MS);

    startProgressLoop();
  }
};

function stopInterval() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
};

async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    await fetchAndRenderRecentTracks();
    startInterval();
  } else {
    stopInterval();
  }
};

async function render(_config: RecentTracksConfig) {
  // SET CONFIG
  if (!_config) return;
  config = _config;
  if (!config.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  // SET USER NAME
  state.userName = config.userName || await utils.getLastfmUserName();
  if (!state.userName) {
    console.warn(errorMessages.noUserName);
    return;
  }

  // SET PARENT CONTAINER
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn(errorMessages.noPanelContainer);
    return;
  }

  uiElements.list.panelContainer = parent.cloneNode(true) as HTMLElement;
  parent.insertAdjacentElement('afterend', uiElements.list.panelContainer);

  // SVELTE START
  const mountPoint = document.createElement('div');
  parent.insertAdjacentElement('afterend', mountPoint);

  mount(RecentTracks, {
    target: mountPoint,
    props: {
      config,
      userName: state.userName,
      rymSyncTimestamp: state.rymSyncTimestamp,
    },
  });
  // SVELTE END

  state.rymSyncTimestamp = await utils.storageGet('rymSyncTimestamp', 'local');

  if (config.rymPlayHistoryHide) {
    parent.style.display = 'none';
  }

  prepareRecentTracksUI();

  uiElements.list.profileButton.href = `https://www.last.fm/user/${state.userName}`;
  uiElements.list.panelContainer.insertAdjacentElement('afterend', uiElements.list.tracksWrapper);

  const { recentTracksCache } = await utils.storageGet(['recentTracksCache']);

  if (
    recentTracksCache
    && recentTracksCache.data
    && recentTracksCache.timestamp
    && recentTracksCache.userName === state.userName
  ) {
    if (
      Date.now() - recentTracksCache.timestamp >
      constants.RECENT_TRACKS_INTERVAL_MS
    ) {
      // Cache is outdated, fetch new data
      await fetchAndRenderRecentTracks();
    } else {
      await populateRecentTracks(recentTracksCache.data, recentTracksCache.timestamp);
      uiElements.list.tracksWrapper.dataset.timestamp = `Updated at ${new Date(recentTracksCache.timestamp).toLocaleString()}`;
    }
  } else {
    // No cache available for this user, fetch new data
    if (document.visibilityState === 'visible') {
      await fetchAndRenderRecentTracks();
    }
  }

  if (state.failedToFetch) {
    uiElements.list.tracksWrapper.style.display = 'none';
    uiElements.list.panelContainer.style.display = 'none';
    return;
  }

  if (document.visibilityState === 'visible') {
    startInterval();
  }

  const throttledHandleVisibilityChange = utils.throttle(
    handleVisibilityChange,
    constants.RECENT_TRACKS_INTERVAL_MS_THROTTLED,
  );

  document.addEventListener(
    'visibilitychange',
    throttledHandleVisibilityChange,
  );
}

export default {
  render,
  targetSelectors: [ PARENT_SELECTOR ],
};
