import { RecordsAPI } from '@/helpers/records-api';
import { formatDistanceToNow } from 'date-fns';
import * as utils from '@/helpers/utils';
import { createElement as h } from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import * as api from '@/api';
import lockSvg from '@/assets/icons/lock.svg?raw';
import unlockSvg from '@/assets/icons/unlock.svg?raw';
import './recentTracks.css';
import errorMessages from './errorMessages.json';
import type {
  UIPlayHistory,
  UIRecentTracks,
  TrackDataNormalized,
  PlayHistoryData,
} from './types';

let abortController = new AbortController();

const PROFILE_PANEL_CONTAINER_SELECTOR = '.profile_listening_container';

const PROFILE_LISTENING_SET_TO_SELECTOR = '.profile_set_listening_box';
const PROFILE_LISTENING_CURRENT_TRACK_SELECTOR = '#profile_play_history_container';
const PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR = '.profile_view_play_history_btn';
const PROFILE_LISTENING_PLAY_HISTORY_BTN = '.profile_view_play_history_btn a.btn[href^="/play-history/"]';

let volumeIcon: SVGElement;
let starIcon: SVGElement;
let config: ProfileOptions & { userName?: string };
let userName: string;
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastTick: number;
let progressLoopActive: boolean = false;
let failedToFetch = false;

const uiPlayHistory = {} as UIPlayHistory;
const uiRecentTracks = {} as UIRecentTracks;

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
  volumeIcon = utils.createSvgUse('svg-volume-symbol', '0 0 40 40');
  starIcon = utils.createSvgUse('svg-star-symbol');

  uiPlayHistory.item = h('div', {
    class: PLAY_HISTORY_ITEM_CLASSES.item,
    dataset: { element: 'rymstats-track-item' },
  });

  uiPlayHistory.artbox = h('div', {
    class: PLAY_HISTORY_ITEM_CLASSES.artbox,
    dataset: { element: 'rymstats-track-artbox' },
  }, [
    uiPlayHistory.artLink = h('a', {}, [
      uiPlayHistory.itemArt = h('img', {
        class: PLAY_HISTORY_ITEM_CLASSES.itemArt,
        dataset: { element: 'rymstats-track-item-art' },
      }),
    ]),
  ]);

  uiPlayHistory.infobox = h('div', {
    class: PLAY_HISTORY_ITEM_CLASSES.infobox,
    dataset: { element: 'rymstats-track-infobox' },
  }, [
    uiPlayHistory.customMyRating = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.customMyRating,
      dataset: { element: 'rymstats-track-rating' },
    }, [
      uiPlayHistory.starsWrapper = h('div', {
        dataset: { element: 'rymstats-track-rating-stars' },
      }, [
        uiPlayHistory.starsFilled = h('div', {
          class: 'stars-filled',
          dataset: { element: 'rymstats-track-rating-stars-filled' },
        }),
        uiPlayHistory.starsEmpty = h('div', {
          class: 'stars-empty',
          dataset: { element: 'rymstats-track-rating-stars-empty' },
        }),
      ]),
      uiPlayHistory.format = h('div', {
        class: 'rymstats-track-format',
        dataset: { element: 'rymstats-track-format' },
      }),
    ]),
    uiPlayHistory.itemDate = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.itemDate,
      dataset: { element: 'rymstats-track-item-date' },
    }, [
      uiPlayHistory.statusSpan = h('span'),
      volumeIcon.cloneNode(true),
    ]),
    uiPlayHistory.infoboxLower = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.infoboxLower,
      dataset: { element: 'rymstats-track-infobox-lower' },
    }, [
      uiPlayHistory.release = h('div', {
        class: PLAY_HISTORY_ITEM_CLASSES.release,
        dataset: { element: 'rymstats-track-release' },
      }, [
        uiPlayHistory.artistSpan = h('span', {
          class: PLAY_HISTORY_ITEM_CLASSES.artistSpan,
          dataset: { element: 'rymstats-track-artist' },
        }, [
          uiPlayHistory.artistLink = h('a', {
            class: PLAY_HISTORY_ITEM_CLASSES.artistLink,
            dataset: { element: 'rymstats-track-artist-link' },
          }),
        ]),
        uiPlayHistory.separator = h('span', {
          class: PLAY_HISTORY_ITEM_CLASSES.separator,
        }, ' - '),
        uiPlayHistory.trackLink = h('a', {
          class: PLAY_HISTORY_ITEM_CLASSES.trackLink,
          dataset: { element: 'rymstats-track-link' },
        }),
      ]),
    ]),
    uiPlayHistory.customFromAlbum = h('div', {
      class: PLAY_HISTORY_ITEM_CLASSES.customFromAlbum,
      dataset: { element: 'rymstats-from-album' },
    }),
  ]);

  for (let i = 0; i < 5; i++) {
    uiPlayHistory.starsFilled.appendChild(starIcon.cloneNode(true));
    uiPlayHistory.starsEmpty.appendChild(starIcon.cloneNode(true));
  }

  uiPlayHistory.item.appendChild(uiPlayHistory.artbox);
  uiPlayHistory.item.appendChild(uiPlayHistory.infobox);
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
    uiPlayHistory.item.classList.add('is-now-playing');
  } else {
    uiPlayHistory.item.classList.remove('is-now-playing');
  }

  uiPlayHistory.artLink.href = albumUrl;
  uiPlayHistory.artLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;

  uiPlayHistory.itemArt.src = coverLargeUrl;

  if (nowPlaying) {
    uiPlayHistory.itemDate.dataset.label = 'Scrobbling now';
    uiPlayHistory.itemDate.title = '';
  } else {
    const date = new Date((timestamp as number) * 1000);
    const dateFormatted = formatDistanceToNow(date, { addSuffix: true });
    uiPlayHistory.itemDate.dataset.label = `Last scrobble (${dateFormatted})`;
    uiPlayHistory.itemDate.title = date.toLocaleString();
  }

  uiPlayHistory.trackLink.href = trackUrl;
  uiPlayHistory.trackLink.title = `Search for "${artistName} - ${trackName}" on RateYourMusic`;
  uiPlayHistory.trackLink.textContent = trackName;
  uiPlayHistory.artistLink.href = artistUrl;
  uiPlayHistory.artistLink.title = `Search for "${artistName}" on RateYourMusic`;
  uiPlayHistory.artistLink.textContent = artistName;

  const albumNameFallback = utils.cleanupReleaseEdition(albumName);

  const albumsFromDB = await RecordsAPI.getByArtistAndTitle(
    artistName,
    albumName,
    albumNameFallback,
    true,
  );

  if (constants.isDev) console.log('Albums from DB:', albumsFromDB);

  uiPlayHistory.customMyRating.classList.remove('no-rating');
  uiPlayHistory.customMyRating.classList.remove('has-ownership');
  uiPlayHistory.customMyRating.title = '';

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
      uiPlayHistory.starsFilled.style.width = `${rating * 10}%`;
      uiPlayHistory.starsWrapper.title = `${rating / 2} / 5`;
    }

    if (rating === 0) {
      uiPlayHistory.starsFilled.style.width = '';
      uiPlayHistory.starsWrapper.title = '';
      uiPlayHistory.customMyRating.classList.add('no-rating');
    }

    uiPlayHistory.format.textContent = Array.from(formats).map(key => constants.RYMFormatsLabels[key] || key).join(', ');

    if (formats.size > 0) {
      uiPlayHistory.customMyRating.classList.add('has-ownership');
    }
  } else {
    uiPlayHistory.starsFilled.style.width = '';
    uiPlayHistory.starsWrapper.title = '';
    uiPlayHistory.customMyRating.classList.add('no-rating');
  }

  if (albumName && albumUrl) {
    uiPlayHistory.customFromAlbum.textContent = '';
    const albumLink = h('a', {
      href: albumUrl,
      title: `Search for "${artistName} - ${albumName}" on RateYourMusic`,
    }, albumName);
    uiPlayHistory.customFromAlbum.appendChild(albumLink);
  } else {
    uiPlayHistory.customFromAlbum.textContent = '';
  }
}

function createLockButton() {
  return h('button', { class: 'btn-lastfm-lock' }, [
    new DOMParser().parseFromString(unlockSvg, 'image/svg+xml').documentElement,
    new DOMParser().parseFromString(lockSvg, 'image/svg+xml').documentElement
  ]);
}

function prepareRecentTracksUI() {
  uiRecentTracks.button = createLastfmButton();
  uiRecentTracks.lockButton = createLockButton();
  uiRecentTracks.profileButton = createProfileButton();
  uiRecentTracks.tracksWrapper = h('div', {
    className: [
      'profile_listening_container',
      'lastfm-tracks-wrapper',
    ],
  });

  if (config.recentTracksShowOnLoad) {
    uiRecentTracks.tracksWrapper.classList.add('is-active');
    uiRecentTracks.tracksWrapper.classList.add('is-loading');
    uiRecentTracks.lockButton.classList.add('is-locked');
  }

  uiRecentTracks.button.addEventListener('click', () => {
    uiRecentTracks.tracksWrapper.classList.toggle('is-active');
  });

  uiRecentTracks.lockButton.addEventListener('click', async () => {
    if (uiRecentTracks.lockButton.classList.contains('is-locked')) {
      await utils.storageSet({ recentTracksShowOnLoad: false });
      uiRecentTracks.lockButton.classList.remove('is-locked');
    } else {
      await utils.storageSet({ recentTracksShowOnLoad: true });
      uiRecentTracks.lockButton.classList.add('is-locked');
      uiRecentTracks.tracksWrapper.classList.add('is-active');
    }
  });

  uiRecentTracks.panelContainer.classList.add(`bg-option-${config.recentTracksBackground}`)
  uiRecentTracks.panelContainer.dataset['element'] = 'rymstats-track-panel';

  const panelBgSwitcher = h('button', { class: 'btn-bg-switcher' }, [
    utils.createSvgUse('svg-brush-symbol')
  ]);

  const bgOptionsQty = 22;

  const bgName = constants.RECENT_TRACK_BACKGROUND_NAMES[config.recentTracksBackground] ||
    `${config.recentTracksBackground + 1} / ${bgOptionsQty}`;
  panelBgSwitcher.dataset.option = bgName;
  panelBgSwitcher.title = `Background option ${config.recentTracksBackground + 1} / ${bgOptionsQty}`;

  panelBgSwitcher.addEventListener('click', async () => {
    uiRecentTracks.panelContainer.classList.remove(`bg-option-${config.recentTracksBackground}`);
    let newBgOption;
    if (config.recentTracksBackground === (bgOptionsQty - 1)) newBgOption = 0;
    else newBgOption = config.recentTracksBackground + 1;
    config.recentTracksBackground = newBgOption;
    await utils.storageSet({
      recentTracksBackground: newBgOption,
    });
    uiRecentTracks.panelContainer.classList.add(`bg-option-${newBgOption}`);
    panelBgSwitcher.title = `Background option ${newBgOption + 1} / ${bgOptionsQty}`;
    const bgName = constants.RECENT_TRACK_BACKGROUND_NAMES[newBgOption + 1] || `${newBgOption + 1} / ${bgOptionsQty}`;
    panelBgSwitcher.dataset.option = bgName || `${newBgOption + 1} / ${bgOptionsQty}`;
  });

  uiRecentTracks.panelContainer.appendChild(panelBgSwitcher);

  const setToBtn: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_SET_TO_SELECTOR);
  if (setToBtn) setToBtn.remove();

  const playHistoryBtn: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_PLAY_HISTORY_BTN);
  if (playHistoryBtn) playHistoryBtn.remove();

  const currentTrackContainer: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);
  if (currentTrackContainer) {
    currentTrackContainer.classList.add('recent-tracks-current');
    createPlayHistoryItem();
    currentTrackContainer.replaceChildren(uiPlayHistory.item);
    const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
    icon.classList.add('loader');
    currentTrackContainer.appendChild(icon);
  }

  const buttonsContainer: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR);

  if (buttonsContainer) {
    buttonsContainer.prepend(uiRecentTracks.profileButton);
    buttonsContainer.prepend(uiRecentTracks.button);
    buttonsContainer.prepend(uiRecentTracks.lockButton);
  }
}

function createLastfmButton() {
  return h('button', {
    class: 'btn-lastfm btn blue_btn btn_small',
    dataset: { element: 'rymstats-lastfm-button' },
  }, [ utils.createSvgUse('svg-playlist-symbol') ]);
};

function createProfileButton(): HTMLAnchorElement {
  return h('a', {
    class: 'btn-profile btn blue_btn btn_small',
    target: '_blank',
  }, [
    'Profile',
    utils.createSvgUse('svg-lastfm-symbol'),
  ]);
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
    track.nowPlaying ? volumeIcon.cloneNode(true) : '',
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

  console.log(recentTrack);

  try {
    colors = await utils.getImageColors(recentTrack.coverExtraLargeUrl);
  } catch {
    console.warn(errorMessages.failedToFetchColors);
  }

  if (recentTrack.nowPlaying) {
    uiRecentTracks.panelContainer.classList.add('is-now-playing');
  } else {
    uiRecentTracks.panelContainer.classList.remove('is-now-playing');
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

  uiPlayHistory.item.classList.add('is-loaded');

  uiRecentTracks.panelContainer.style.setProperty('--bg-image', `url(${recentTrack.coverExtraLargeUrl})`);

  if (colors) initializeColors(colors);

  const tracklistData = data[0].nowPlaying ? data.slice(1) : data;
  const tracksList = createTracksList(tracklistData);

  uiRecentTracks.tracksWrapper.replaceChildren(tracksList);
  uiRecentTracks.tracksWrapper.dataset.timestamp = `Updated at ${new Date(timestamp).toLocaleString()}`;
  uiRecentTracks.tracksWrapper.classList.remove('is-loading');
}

async function fetchAndRenderRecentTracks() {
  abortController?.abort();
  abortController = new AbortController();

  try {
    const recentTracksResponse = await api.getRecentTracks({
      username: userName as string,
      apiKey: config.lastfmApiKey,
      limit: config.recentTracksLimit,
    }, abortController.signal);

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
        userName,
      }
    }, 'local');

    console.log('Recent tracks fetched:', normalizedData);

    await populateRecentTracks(
      normalizedData,
      timestamp,
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      console.log('asdasd', error);
      failedToFetch = true;
      stopInterval();
    }
  }
};

function getPollingProgress() {
  if (!lastTick) return 0;
  const elapsed = Date.now() - lastTick;
  return Math.min(elapsed / constants.RECENT_TRACKS_INTERVAL_MS, 1);
}

function updateProgressVisual() {
  const progress = getPollingProgress();
  const angle = Math.trunc(progress * 360);
  uiRecentTracks.button.style.setProperty('--progress', `${angle}deg`);

  if (progress >= 1) {
    uiRecentTracks.button.classList.add('is-fetching');
  } else {
    uiRecentTracks.button.classList.remove('is-fetching');
  }
}

function startProgressLoop() {
  if (progressLoopActive) return;
  progressLoopActive = true;

  const loop = () => {
    if (!progressLoopActive) return;
    updateProgressVisual();
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

const startInterval = () => {
  if (!intervalId) {
    lastTick = Date.now();
    intervalId = setInterval(async () => {
      await fetchAndRenderRecentTracks();
      lastTick = Date.now();
    }, constants.RECENT_TRACKS_INTERVAL_MS);

    startProgressLoop();
  }
};

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
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

async function render(_config: ProfileOptions & { userName?: string }) {
  if (!_config) return;

  config = _config;

  if (!config.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  userName = config.userName || await utils.getUserName();

  if (!userName) {
    console.warn(errorMessages.noUserName);
    return;
  }

  const rymPlayHistoryContainer: HTMLElement | null = document.querySelector(PROFILE_PANEL_CONTAINER_SELECTOR);

  if (!rymPlayHistoryContainer) {
    console.warn(errorMessages.noPanelContainer);
    return;
  }

  uiRecentTracks.panelContainer = rymPlayHistoryContainer.cloneNode(true) as HTMLElement;
  rymPlayHistoryContainer.insertAdjacentElement('afterend', uiRecentTracks.panelContainer);

  if (config.rymPlayHistoryHide) {
    rymPlayHistoryContainer.style.display = 'none';
  }

  prepareRecentTracksUI();

  uiRecentTracks.profileButton.href = `https://www.last.fm/user/${userName}`;

  uiRecentTracks.panelContainer.insertAdjacentElement('afterend', uiRecentTracks.tracksWrapper);

  const { recentTracksCache } = await utils.storageGet(['recentTracksCache']);

  if (
    recentTracksCache
    && recentTracksCache.data
    && recentTracksCache.timestamp
    && recentTracksCache.userName === userName
  ) {
    if (
      Date.now() - recentTracksCache.timestamp >
      constants.RECENT_TRACKS_INTERVAL_MS
    ) {
      // Cache is outdated, fetch new data
      await fetchAndRenderRecentTracks();
    } else {
      await populateRecentTracks(recentTracksCache.data, recentTracksCache.timestamp);
      uiRecentTracks.tracksWrapper.dataset.timestamp = `Updated at ${new Date(recentTracksCache.timestamp).toLocaleString()}`;
    }
  } else {
    // No cache available for this user, fetch new data
    if (document.visibilityState === 'visible') {
      await fetchAndRenderRecentTracks();
    }
  }

  console.log(failedToFetch);

  if (failedToFetch) {
    uiRecentTracks.tracksWrapper.style.display = 'none';
    uiRecentTracks.panelContainer.style.display = 'none';
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
  targetSelectors: [ PROFILE_PANEL_CONTAINER_SELECTOR ],
};
