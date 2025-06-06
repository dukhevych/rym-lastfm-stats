import { RecordsAPI } from '@/helpers/records-api';
import { formatDistanceToNow } from 'date-fns';

import * as utils from '@/helpers/utils';
import { createElement as h } from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import * as api from '@/helpers/api';

import lockSvg from '@/assets/icons/lock.svg?raw';
import unlockSvg from '@/assets/icons/unlock.svg?raw';

import './recentTracks.css';

let abortController = new AbortController();

const PROFILE_LISTENING_SET_TO_SELECTOR = '.profile_set_listening_box';
const PROFILE_LISTENING_CURRENT_TRACK_SELECTOR = '#profile_play_history_container';
const PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR = '.profile_view_play_history_btn';
const PROFILE_LISTENING_PLAY_HISTORY_BTN = '.profile_view_play_history_btn a.btn[href^="/play-history/"]';

let volumeIcon: SVGElement;
let starIcon: SVGElement;

let config: ProfileOptions & { userName?: string };

const uiPlayHistory: Record<string,HTMLElement | HTMLLinkElement> = {};
const uiRecentTracks: Record<string, HTMLElement | HTMLLinkElement> = {};

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
      uiPlayHistory.img = h('img', {
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

interface PlayHistoryItemData {
  artistName: string;
  artistUrl: string;
  albumName: string;
  albumUrl: string;
  trackName: string;
  trackUrl: string;
  coverUrl: string;
  isNowPlaying: boolean;
  timestamp: number;
}

async function populatePlayHistoryItem(data: PlayHistoryItemData) {
  const {
    artistName,
    artistUrl,
    albumName,
    albumUrl,
    trackName,
    trackUrl,
    coverUrl,
    isNowPlaying,
    timestamp,
  } = data;

  if (isNowPlaying) {
    uiPlayHistory.item.classList.add('is-now-playing');
  } else {
    uiPlayHistory.item.classList.remove('is-now-playing');
  }

  (uiPlayHistory.artLink as HTMLLinkElement).href = albumUrl;
  uiPlayHistory.artLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;

  (uiPlayHistory.itemArt as HTMLImageElement).src = coverUrl;

  if (isNowPlaying) {
    uiPlayHistory.itemDate.dataset.label = 'Scrobbling now';
    uiPlayHistory.itemDate.title = '';
  } else {
    const date = new Date(timestamp * 1000);
    const dateFormatted = formatDistanceToNow(date, {
      addSuffix: true,
    });
    uiPlayHistory.itemDate.dataset.label = `Last scrobble (${dateFormatted})`;
    uiPlayHistory.itemDate.title = date.toLocaleString();
  }

  (uiPlayHistory.releaseLink as HTMLLinkElement).href = trackUrl;
  uiPlayHistory.releaseLink.title = `Search for "${artistName} - ${trackName}" on RateYourMusic`;
  uiPlayHistory.releaseLink.textContent = trackName;
  (uiPlayHistory.artistLink as HTMLLinkElement).href = artistUrl;
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
    let formats = new Set<ERYMFormats>();

    const albumsFromDBFullMatch: IRYMRecordDBMatch[] = [];
    const albumsFromDBPartialMatch: IRYMRecordDBMatch[] = [];

    // const hasOnlyPartialMatch = albumsFromDBFullMatch.length === 0;

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

    function getEarliestRating(albums: IRYMRecordDBMatch[]) {
      let earliestRating = 0;
      let minId = Infinity;
      albums.forEach((album) => {
        if (!album.rating) return;

        const id = +album.id;
        if (id && id < minId) {
          minId = id;
          earliestRating = album.rating;
        }
      });
      return earliestRating;
    }

    const earliestFullMatchRating = getEarliestRating(albumsFromDBFullMatch);
    const earliestPartialMatchRating = getEarliestRating(albumsFromDBPartialMatch);

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
  uiRecentTracks.tracksWrapper = h('div');

  uiRecentTracks.tracksWrapper.classList.add(
    'profile_listening_container',
    'lastfm-tracks-wrapper',
  );

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

  uiRecentTracks.panelContainer.classList.add(`bg-option-${config.recentTracksReplaceBackground}`)
  uiRecentTracks.panelContainer.dataset['element'] = 'rymstats-track-panel';

  const panelBgSwitcher = h('button', { class: 'btn-bg-switcher' }, [
    utils.createSvgUse('svg-brush-symbol')
  ]);

  const bgOptionsQty = 22;

  const bgName = constants.RECENT_TRACK_BACKGROUND_NAMES[config.recentTracksReplaceBackground] ||
    `${config.recentTracksReplaceBackground + 1} / ${bgOptionsQty}`;
  panelBgSwitcher.dataset.option = bgName;
  panelBgSwitcher.title = `Background option ${config.recentTracksReplaceBackground + 1} / ${bgOptionsQty}`;

  panelBgSwitcher.addEventListener('click', async () => {
    uiRecentTracks.panelContainer.classList.remove(`bg-option-${config.recentTracksReplaceBackground}`);
    let newBgOption;
    if (config.recentTracksReplaceBackground === (bgOptionsQty - 1)) newBgOption = 0;
    else newBgOption = config.recentTracksReplaceBackground + 1;
    config.recentTracksReplaceBackground = newBgOption;
    await utils.storageSet({
      recentTracksReplaceBackground: newBgOption,
    });
    uiRecentTracks.panelContainer.classList.add(`bg-option-${newBgOption}`);
    panelBgSwitcher.title = `Background option ${newBgOption + 1} / ${bgOptionsQty}`;
    const bgName = constants.RECENT_TRACK_BACKGROUND_NAMES[newBgOption + 1] || `${newBgOption + 1} / ${bgOptionsQty}`;
    panelBgSwitcher.dataset.option = bgName || `${newBgOption + 1} / ${bgOptionsQty}`;
  });

  uiRecentTracks.panelContainer.appendChild(panelBgSwitcher);

  if (config.recentTracksReplace) {
    const setToBtn: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_SET_TO_SELECTOR);
    if (setToBtn) setToBtn.style.display = 'none';

    const playHistoryBtn: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_PLAY_HISTORY_BTN);
    if (playHistoryBtn) playHistoryBtn.style.display = 'none';

    const currentTrackContainer: HTMLElement | null = uiRecentTracks.panelContainer.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);
    if (currentTrackContainer) {
      currentTrackContainer.classList.add('recent-tracks-current');
      createPlayHistoryItem();
      currentTrackContainer.replaceChildren(uiPlayHistory.item);
      const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
      icon.classList.add('loader');
      currentTrackContainer.appendChild(icon);
    }
  }
}

function createLastfmButton() {
  return h('button', {
    class: 'btn-lastfm btn blue_btn btn_small',
    dataset: { element: 'rymstats-lastfm-button' },
  }, [ utils.createSvgUse('svg-playlist-symbol') ]);
};

function createProfileButton() {
  return h('a', {
    class: 'btn-profile btn blue_btn btn_small',
    target: '_blank',
  }, [
    'Profile',
    utils.createSvgUse('svg-lastfm-symbol'),
  ]);
}

function createTracksList(recentTracks) {
  const tracksList = h('ul');
  recentTracks.forEach((track) => {
    const trackItem = createTrackItem(track);
    trackItem.dataset.id = `${track.a}-${track.n}-${track.d || ''}`;
    tracksList.appendChild(trackItem);
  });
  return tracksList;
}

function createTrackItem(track) {
  return h('li', {
    class: track['@attr']?.nowplaying ? 'is-now-playing' : '',
  }, [
    createTrackCover(track),
    createTrackTitle(track),
    createTrackArtist(track),
    createTrackDate(track),
  ]);
}

function createTrackCover(track) {
  return h('div', {
    class: 'track-image',
  }, [
    h('a', {
      href: utils.generateSearchUrl({
        artist: track.a,
        releaseTitle: track.r || '',
        trackTitle: track.r ? '' : track.n,
      }),
      title: `Search for "${track.a} - ${track.r || track.n}" on RateYourMusic`,
    }, [
      track.i ? h('img', {
        src: track.i,
        alt: `${track.a} - ${track.r || track.n}`,
      }) : '',
    ])
  ]);
}

function createTrackTitle(track) {
  return h('a', {
    class: 'track-title',
    href: utils.generateSearchUrl({
      artist: track.a,
      trackTitle: track.n,
    }),
    title: `Search for "${track.a} - ${track.r || track.n}" on RateYourMusic`,
  }, track.n);
}

function createTrackArtist(track) {
  return h('div', {
    class: 'track-artist',
  }, [
    h('a', {
      href: utils.generateSearchUrl({
        artist: track.a,
      }),
      title: `Search for "${track.a}" on RateYourMusic`,
    }, track.a),
  ])
}

function createTrackDate(track) {
  return h('span', {
    class: 'track-date',
    title: track.c ? 'Scrobbling now' : new Date(track.d * 1000).toLocaleString(),
  }, [
    track.c ? volumeIcon.cloneNode(true) : '',
    track.c ? 'Scrobbling now' : formatDistanceToNow(new Date(track.d * 1000), {
      addSuffix: true,
    }),
  ]);
}

async function render(_config: ProfileOptions & { userName?: string }) {
  if (!_config) return;

  config = _config;

  if (!config.lastfmApiKey) {
    console.warn('Last.fm credentials not set. Please set Last.fm API Key in the extension options.');
    return;
  }

  const userName = config.userName || await utils.getUserName();

  if (!userName) {
    console.warn('No Last.fm username found. Recent Tracks can\'t be displayed.');
    return;
  }

  const panelContainer: HTMLElement | null = document.querySelector('.profile_listening_container');

  if (!panelContainer) {
    console.warn('Profile listening container not found. Recent Tracks will not be displayed.');
    return;
  }

  uiRecentTracks.panelContainer = panelContainer;

  prepareRecentTracksUI();

  const buttonsContainer = document.querySelector(
    PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR,
  );

  if (buttonsContainer) {
    (uiRecentTracks.profileButton as HTMLLinkElement).href = `https://www.last.fm/user/${userName}`;
    buttonsContainer.prepend(uiRecentTracks.profileButton);
    buttonsContainer.prepend(uiRecentTracks.button);
    buttonsContainer.prepend(uiRecentTracks.lockButton);
  }

  const populateRecentTracks = async ({ data, timestamp }: { timestamp: number }) => {
    let colors;

    try {
      colors = await utils.getImageColors(data[0].il);
    } catch {
      console.warn('Failed to get image colors, using cached data without colors');
    }

    if (data[0].c) {
      panelContainer.classList.add("is-now-playing");
    } else {
      panelContainer.classList.remove("is-now-playing");
    }

    if (config.recentTracksReplace) {
      await populatePlayHistoryItem({
        artistName: data[0].a,
        artistUrl: utils.generateSearchUrl({
          artist: data[0].a,
        }),
        albumName: data[0].r,
        albumUrl: utils.generateSearchUrl({
          artist: data[0].a,
          releaseTitle: data[0].r,
        }),
        trackUrl: utils.generateSearchUrl({
          artist: data[0].a,
          trackTitle: data[0].n,
        }),
        trackName: data[0].n,
        coverUrl: data[0].il,
        isNowPlaying: data[0].c,
        timestamp: data[0].d,
      });
      uiPlayHistory.item.classList.add('is-loaded');
      panelContainer.style.setProperty('--bg-image', `url(${data[0].ixl})`);

      if (colors) {
        const documentRoot = document.documentElement;

        documentRoot.style.setProperty('--clr-light-bg', colors.light.bgColor);
        documentRoot.style.setProperty('--clr-light-bg-contrast', colors.light.bgColorContrast);
        documentRoot.style.setProperty('--clr-light-accent', colors.light.accentColor);
        documentRoot.style.setProperty('--clr-light-accent-contrast', colors.light.accentColorContrast);

        documentRoot.style.setProperty('--clr-dark-bg', colors.dark.bgColor);
        documentRoot.style.setProperty('--clr-dark-bg-contrast', colors.dark.bgColorContrast);
        documentRoot.style.setProperty('--clr-dark-accent', colors.dark.accentColor);
        documentRoot.style.setProperty('--clr-dark-accent-contrast', colors.dark.accentColorContrast);

        documentRoot.style.setProperty('--clr-light-accent-hue', String(Math.trunc(colors.light.accentColorHSL[0] * 360)));
        documentRoot.style.setProperty(
          '--clr-light-accent-saturation',
          (colors.light.accentColorHSL[1] * 100).toFixed(2),
        );
        documentRoot.style.setProperty(
          '--clr-light-accent-lightness',
          (colors.light.accentColorHSL[2] * 100).toFixed(2),
        );

        documentRoot.style.setProperty('--clr-dark-accent-hue', String(Math.trunc(colors.dark.accentColorHSL[0] * 360)));
        documentRoot.style.setProperty(
          '--clr-dark-accent-saturation',
          (colors.dark.accentColorHSL[1] * 100).toFixed(2),
        );
        documentRoot.style.setProperty('--clr-dark-accent-lightness', (colors.dark.accentColorHSL[2] * 100).toFixed(2));

        Object.keys(colors.palette).forEach((key) => {
          if (colors.palette[key]?.hex) {
            documentRoot.style.setProperty(`--clr-palette-${key.toLowerCase()}`, colors.palette[key].hex);
          }
        });
      }
    }

    const tracklistData = data[0].c ? data.slice(1) : data;
    const tracksList = createTracksList(tracklistData);

    uiRecentTracks.tracksWrapper.replaceChildren(tracksList);
    uiRecentTracks.tracksWrapper.dataset.timestamp = `Updated at ${new Date(timestamp).toLocaleString()}`;
    uiRecentTracks.tracksWrapper.classList.remove('is-loading');
  }

  const updateAction = async () => {
    abortController.abort();
    abortController = new AbortController();

    try {
      const data = await api.fetchUserRecentTracks(
        userName,
        config.lastfmApiKey,
        { limit: config.recentTracksLimit },
        abortController.signal,
      );

      if (data.error) {
        throw new Error(`Last.fm API error: ${data.message}`);
      }

      const timestamp = Date.now();

      const normalizedData = data.map((item) => ({
        c: item["@attr"]?.nowplaying ?? null,
        i: item.image[0]['#text'],
        il: item.image[3]['#text'],
        ixl: item.image[item.image.length - 1]['#text'],
        n: item.name,
        d: item.date?.uts ?? null,
        r: item.album['#text'],
        a: item.artist['#text'],
      }));

      await utils.storageSet({
        recentTracksCache: {
          data: normalizedData,
          timestamp,
          userName,
        }
      });

      await populateRecentTracks({
        data: normalizedData,
        timestamp,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        failedToFetch = true;
        stopInterval();
      }
    }
  };

  uiRecentTracks.panelContainer.insertAdjacentElement('afterend', uiRecentTracks.tracksWrapper);

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastTick: number;
  let progressLoopActive: boolean = false;

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
        await updateAction();
        lastTick = Date.now();
      }, constants.RECENT_TRACKS_INTERVAL_MS);

      startProgressLoop();
    }
  };

  const { recentTracksCache } = await utils.storageGet(['recentTracksCache']);
  let failedToFetch = false;

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
      await updateAction();
    } else {
      await populateRecentTracks({ data: recentTracksCache.data });
      uiRecentTracks.tracksWrapper.dataset.timestamp = `Updated at ${new Date(recentTracksCache.timestamp).toLocaleString()}`;
    }
  } else {
    // No cache available for this user, fetch new data
    if (document.visibilityState === 'visible') {
      await updateAction();
    }
  }

  if (failedToFetch) {
    tracksWrapper.style.display = 'none';
    panelContainer.style.display = 'none';
    return;
  }

  if (document.visibilityState === 'visible') {
    startInterval();
  }

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  async function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      await updateAction();
      startInterval();
    } else {
      stopInterval();
    }
  };

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
  targetSelectors: [
    '.profile_listening_container',
  ],
};
