import { RecordsAPI } from '@/helpers/records-api';
import { formatDistanceToNow } from 'date-fns';

import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import * as api from '@/helpers/api.js';

import lockSvg from '@/assets/icons/lock.svg?raw';
import unlockSvg from '@/assets/icons/unlock.svg?raw';

import './recentTracks.css';

let abortController = new AbortController();

const PROFILE_LISTENING_SET_TO_SELECTOR = '.profile_set_listening_box';
const PROFILE_LISTENING_CURRENT_TRACK_SELECTOR = '#profile_play_history_container';
const PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR = '.profile_view_play_history_btn';
const PROFILE_LISTENING_PLAY_HISTORY_BTN = '.profile_view_play_history_btn a.btn[href^="/play-history/"]';

let volumeIcon;

let config = null;

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
  const item = document.createElement('div');
  item.className = PLAY_HISTORY_ITEM_CLASSES.item;
  item.dataset.element = 'rymstats-track-item';

  const artbox = document.createElement('div');
  artbox.className = PLAY_HISTORY_ITEM_CLASSES.artbox;
  artbox.dataset.element = 'rymstats-track-artbox';

  const artLink = document.createElement('a');

  const img = document.createElement('img');
  img.className = PLAY_HISTORY_ITEM_CLASSES.itemArt;
  img.dataset.element = 'rymstats-track-item-art';

  artLink.appendChild(img);
  artbox.appendChild(artLink);

  const infobox = document.createElement('div');
  infobox.className = PLAY_HISTORY_ITEM_CLASSES.infobox;
  infobox.dataset.element = 'rymstats-track-infobox';

  // RATING WRAPPER
  const customMyRating = document.createElement('div');
  customMyRating.className = PLAY_HISTORY_ITEM_CLASSES.customMyRating;
  customMyRating.dataset.element = 'rymstats-track-rating';

  // NO RATING
  const noRating = document.createElement('div');
  noRating.dataset.element = 'rymstats-track-no-rating';
  noRating.textContent = 'No rating available';

  // OWNERSHIP + MEDIA TYPE
  const mediaType = document.createElement('div');
  mediaType.dataset.element = 'rymstats-track-mediatype';
  mediaType.textContent = '';

  // NO RATING HELP ICON
  const noRatingHelpIcon = document.createElement('span');
  noRatingHelpIcon.className = 'help-icon';
  noRatingHelpIcon.dataset.element = 'rymstats-track-no-rating-help-icon';
  noRatingHelpIcon.textContent = '?';
  noRatingHelpIcon.title = 'Rating may be not available due to RYM and Last.fm metadata mismatch';
  noRating.appendChild(noRatingHelpIcon);

  // STARS WRAPPER
  const starsWrapper = document.createElement('div');
  starsWrapper.dataset.element = 'rymstats-track-rating-stars';

  // STARS FILLED
  const starsFilled = document.createElement('div');
  starsFilled.className = 'stars-filled';
  starsFilled.dataset.element = 'rymstats-track-rating-stars-filled';

  // STARS EMPTY
  const starsEmpty = document.createElement('div');
  starsEmpty.className = 'stars-empty';
  starsEmpty.dataset.element = 'rymstats-track-rating-stars-empty';

  starsWrapper.appendChild(starsEmpty);
  starsWrapper.appendChild(starsFilled);
  customMyRating.appendChild(noRating);
  customMyRating.appendChild(starsWrapper);
  customMyRating.appendChild(mediaType);

  const starIcon = utils.createSvgUse('svg-star-symbol');
  for (let i = 0; i < 5; i++) {
    starsFilled.appendChild(starIcon.cloneNode(true));
    starsEmpty.appendChild(starIcon.cloneNode(true));
  }

  const itemDate = document.createElement('div');
  itemDate.className = PLAY_HISTORY_ITEM_CLASSES.itemDate;
  itemDate.dataset.element = 'rymstats-track-item-date';

  const statusSpan = document.createElement('span');

  volumeIcon = utils.createSvgUse('svg-volume-symbol', '0 0 40 40');

  itemDate.appendChild(statusSpan);
  itemDate.appendChild(volumeIcon.cloneNode(true));

  const infoboxLower = document.createElement('div');
  infoboxLower.className = PLAY_HISTORY_ITEM_CLASSES.infoboxLower;
  infoboxLower.dataset.element = 'rymstats-track-infobox-lower';

  const release = document.createElement('div');
  release.className = PLAY_HISTORY_ITEM_CLASSES.release;
  release.dataset.element = 'rymstats-track-release';

  const artistSpan = document.createElement('span');
  artistSpan.className = PLAY_HISTORY_ITEM_CLASSES.artistSpan;
  artistSpan.dataset.element = 'rymstats-track-artist';

  const artistLink = document.createElement('a');
  artistLink.className = PLAY_HISTORY_ITEM_CLASSES.artistLink;
  artistLink.dataset.element = 'rymstats-track-artist-link';

  artistSpan.appendChild(artistLink);

  const separator = document.createElement('span');
  separator.className = PLAY_HISTORY_ITEM_CLASSES.separator;
  separator.textContent = ' - ';

  const trackLink = document.createElement('a');
  trackLink.className = PLAY_HISTORY_ITEM_CLASSES.trackLink;
  trackLink.dataset.element = 'rymstats-track-link';

  const customFromAlbum = document.createElement('div');
  customFromAlbum.className = PLAY_HISTORY_ITEM_CLASSES.customFromAlbum;
  customFromAlbum.dataset.element = 'rymstats-from-album';

  release.appendChild(artistSpan);
  release.appendChild(separator);
  release.appendChild(trackLink);

  infoboxLower.appendChild(release);
  infobox.appendChild(customMyRating);
  infobox.appendChild(itemDate);
  infobox.appendChild(infoboxLower);
  infobox.appendChild(customFromAlbum);

  item.appendChild(artbox);
  item.appendChild(infobox);

  return item;
}

async function populatePlayHistoryItem(
  item,
  {
    artistName,
    artistUrl,
    albumName,
    albumUrl,
    trackName,
    trackUrl,
    coverUrl,
    isNowPlaying,
    timestamp,
  },
) {
  if (isNowPlaying) {
    item.classList.add('is-now-playing');
  } else {
    item.classList.remove('is-now-playing');
  }

  const artbox = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.artbox}`);

  if (artbox) {
    const artLink = artbox.querySelector('a');
    if (artLink) {
      artLink.href = albumUrl;
      artLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;

      const itemArt = artLink.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.itemArt}`);

      if (itemArt) {
        itemArt.src = coverUrl;
      }
    }
  }

  const infobox = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.infobox}`);

  if (infobox) {
    const itemDate = infobox.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.itemDate}`);
    if (itemDate) {
      if (isNowPlaying) {
        itemDate.dataset.label = 'Scrobbling now';
        itemDate.title = '';
      } else {
        const date = new Date(timestamp * 1000);
        const dateFormatted = formatDistanceToNow(date, {
          addSuffix: true,
        });
        itemDate.dataset.label = `Last scrobble (${dateFormatted})`;
        itemDate.title = date.toLocaleString();
      }
    }

    const infoboxLower = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.infoboxLower}`);
    if (infoboxLower) {
      const release = infoboxLower.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.release}`);
      if (release) {
        const releaseLink = release.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.release}`);
        if (releaseLink) {
          releaseLink.href = trackUrl;
          releaseLink.title = `Search for "${artistName} - ${trackName}" on RateYourMusic`;
          releaseLink.textContent = trackName;
        }

        const artistSpan = infoboxLower.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.artistSpan}`);
        if (artistSpan) {
          const artistLink = artistSpan.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.artistSpan} a`);
          if (artistLink) {
            artistLink.href = artistUrl;
            artistLink.title = `Search for "${artistName}" on RateYourMusic`;
            artistLink.textContent = artistName;
          }
        }
      }
    }

    const customMyRating = infobox.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.customMyRating}`);
    const starsFilled = customMyRating.querySelector('.stars-filled');
    const starsWrapper = customMyRating.querySelector('[data-element="rymstats-track-rating-stars"]');
    const mediaType = customMyRating.querySelector(`[data-element="rymstats-track-mediatype"]`);

    if (customMyRating) {
      const albumNameFallback = albumName.replace(constants.KEYWORDS_REPLACE_PATTERN, '').trim();

      const albumsFromDB = await RecordsAPI.getByArtistAndTitle(
        artistName,
        albumName,
        albumNameFallback,
        true,
      );

      if (constants.isDev) console.log('Albums from DB:', albumsFromDB);

      customMyRating.classList.remove('no-rating');
      customMyRating.classList.remove('has-ownership');
      customMyRating.title = '';

      if (albumsFromDB.length > 0) {
        let masterRelease;

        let minId = Infinity;

        albumsFromDB.forEach((album) => {
          const id = +album.id;

          if (id && id < minId) {
            minId = id;
            masterRelease = album;
          }
        });

        let rating = masterRelease.rating;

        // if (!rating) {
        //   rating = Math.max(albumsFromDB.map((item) => item.rating || 0));
        // }

        let mediaTypes = [];

        albumsFromDB.forEach((item) => {
          if (item.ownership === 'o' && item.mediaType) {
            mediaTypes.push(item.mediaType);
          }
        });

        if (rating > 0) {
          starsFilled.style.width = `${rating * 10}%`;
          starsWrapper.title = `${rating / 2} / 5`;
        }

        mediaType.textContent = mediaTypes.join(', ');

        if (mediaTypes.length > 0) {
          customMyRating.classList.add('has-ownership');
        }
      } else {
        customMyRating.classList.add('no-rating');
        customMyRating.title = 'Rating may be not available due to RYM and Last.fm metadata mismatch';
      }
    }

    const customFromAlbum = infobox.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.customFromAlbum}`);

    if (customFromAlbum) {
      if (albumName && albumUrl) {
        customFromAlbum.textContent = 'Album: ';
        const albumLink = document.createElement('a');
        albumLink.href = albumUrl;
        albumLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;
        albumLink.textContent = albumName;
        customFromAlbum.appendChild(albumLink);
      } else {
        customFromAlbum.textContent = '';
      }
    }
  }
}

function createLockButton() {
  const button = document.createElement('button');
  button.classList.add('btn-lastfm-lock');

  const unlockIcon = new DOMParser().parseFromString(unlockSvg, 'image/svg+xml').documentElement;
  const lockIcon = new DOMParser().parseFromString(lockSvg, 'image/svg+xml').documentElement;

  button.appendChild(unlockIcon);
  button.appendChild(lockIcon);

  return button;
}

function prepareRecentTracksUI() {
  const button = createLastfmButton();
  const lockButton = createLockButton();
  const profileButton = createProfileButton();
  const tracksWrapper = document.createElement('div');

  let playHistoryItem;

  tracksWrapper.classList.add(
    'profile_listening_container',
    'lastfm-tracks-wrapper',
  );

  if (config.recentTracksShowOnLoad) {
    tracksWrapper.classList.add('is-active');
    lockButton.classList.add('is-locked');
  }

  button.addEventListener('click', () => {
    tracksWrapper.classList.toggle('is-active');
  });

  lockButton.addEventListener('click', async () => {
    if (lockButton.classList.contains('is-locked')) {
      await utils.storageSet({ recentTracksShowOnLoad: false });
      lockButton.classList.remove('is-locked');
    } else {
      await utils.storageSet({ recentTracksShowOnLoad: true });
      lockButton.classList.add('is-locked');
      tracksWrapper.classList.add('is-active');
    }
  });

  const panelContainer = document.querySelector('.profile_listening_container');
  panelContainer.classList.add(`bg-option-${config.recentTracksReplaceBackground}`)
  panelContainer.dataset['element'] = 'rymstats-track-panel';
  const panelBgSwitcher = document.createElement('button');
  const playlistIcon = utils.createSvgUse('svg-brush-symbol');
  panelBgSwitcher.appendChild(playlistIcon);
  panelBgSwitcher.classList.add('btn-bg-switcher');

  const bgOptionsQty = 23;

  panelBgSwitcher.dataset.option = `${config.recentTracksReplaceBackground + 1} / ${bgOptionsQty}`;
  panelBgSwitcher.title = `Background option ${config.recentTracksReplaceBackground + 1} / ${bgOptionsQty}`;

  panelBgSwitcher.addEventListener('click', async () => {
    panelContainer.classList.remove(`bg-option-${config.recentTracksReplaceBackground}`);
    let newBgOption;
    if (config.recentTracksReplaceBackground === (bgOptionsQty - 1)) newBgOption = 0;
    else newBgOption = config.recentTracksReplaceBackground + 1;
    config.recentTracksReplaceBackground = newBgOption;
    await utils.storageSet({
      recentTracksReplaceBackground: newBgOption,
    });
    panelContainer.classList.add(`bg-option-${newBgOption}`);
    panelBgSwitcher.title = `Background option ${newBgOption + 1} / ${bgOptionsQty}`;
    panelBgSwitcher.dataset.option = `${newBgOption + 1} / ${bgOptionsQty}`;
  });
  panelContainer.appendChild(panelBgSwitcher);

  if (config.recentTracksReplace) {
    const setToBtn = panelContainer.querySelector(PROFILE_LISTENING_SET_TO_SELECTOR);
    if (setToBtn) setToBtn.style.display = 'none';

    const playHistoryBtn = panelContainer.querySelector(PROFILE_LISTENING_PLAY_HISTORY_BTN);
    if (playHistoryBtn) playHistoryBtn.style.display = 'none';

    const currentTrackContainer = panelContainer.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);
    currentTrackContainer.classList.add('recent-tracks-current');

    playHistoryItem = createPlayHistoryItem();

    currentTrackContainer.replaceChildren(playHistoryItem);

    const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
    icon.classList.add('loader');
    currentTrackContainer.appendChild(icon);
  }

  return {
    button,
    lockButton,
    profileButton,
    panelContainer,
    tracksWrapper,
    playHistoryItem,
  };
}

function createLastfmButton() {
  const button = document.createElement('button');
  button.classList.add('btn-lastfm');
  const playHistoryClasses = ['btn', 'blue_btn', 'btn_small'];
  button.classList.add(...playHistoryClasses);

  const playlistIcon = utils.createSvgUse('svg-playlist-symbol');
  button.appendChild(playlistIcon);

  return button;
}

function createProfileButton() {
  const button = document.createElement('a');
  button.classList.add('btn-profile');
  button.target = '_blank';
  const playHistoryClasses = ['btn', 'blue_btn', 'btn_small'];
  button.classList.add(...playHistoryClasses);
  button.textContent = 'Profile';

  const lastfmIcon = utils.createSvgUse('svg-lastfm-symbol');
  button.appendChild(lastfmIcon);

  return button;
}

function createTracksList(recentTracks, userName) {
  const tracksList = document.createElement('ul');
  recentTracks.forEach((track) => {
    const trackItem = createTrackItem(track, userName);
    trackItem.dataset.id = `${track.a}-${track.n}-${track.d || ''}`;
    tracksList.appendChild(trackItem);
  });
  return tracksList;
}

function createTrackItem(track) {
  const line = document.createElement('li');
  line.appendChild(createTrackCover(track));
  line.appendChild(createTrackTitle(track));
  line.appendChild(createTrackArtist(track));
  line.appendChild(createTrackDate(track));

  if (track['@attr']?.nowplaying) {
    line.classList.add('is-now-playing');
  }

  return line;
}

function createTrackCover(track) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('track-image');
  const link = document.createElement('a');
  link.classList.add('track-image');

  link.href = utils.generateSearchUrl({
    artist: track.a,
    releaseTitle: track.r || '',
    trackTitle: track.r ? '' : track.n,
  }, config);

  link.title = `Search for "${track.a} - ${track.r || track.n}" on RateYourMusic`;
  wrapper.appendChild(link);
  if (track.i) {
    const img = document.createElement('img');
    img.src = track.i;
    link.appendChild(img);
  }
  return wrapper;
}

function createTrackTitle(track) {
  const link = document.createElement('a');
  link.classList.add('track-title');
  link.href = utils.generateSearchUrl({
    artist: track.a,
    trackTitle: track.n,
  }, config);
  link.title = `Search for "${track.a} - ${track.r || track.n}" on RateYourMusic`;
  link.textContent = track.n;
  return link;
}

function createTrackArtist(track) {
  const artist = document.createElement('div');
  artist.classList.add('track-artist');
  const link = document.createElement('a');
  link.textContent = track.a;
  link.title = `Search for "${track.a}" on RateYourMusic`;
  link.href = utils.generateSearchUrl({
    artist: track.a,
  }, config);
  artist.appendChild(link);
  return artist;
}

function createTrackDate(track) {
  const date = document.createElement('span');
  date.classList.add('track-date');
  if (track.c) {
    date.textContent = 'Scrobbling now';
    const icon = volumeIcon.cloneNode(true);
    date.prepend(icon);
  } else {
    date.textContent = formatDistanceToNow(new Date(track.d * 1000), {
      addSuffix: true,
    });
    date.title = new Date(track.d * 1000).toLocaleString();
  }
  return date;
}

function insertRecentTracksWrapperIntoDOM(tracksWrapper) {
  const listeningContainer = document.querySelector(
    '.profile_listening_container',
  );
  listeningContainer.insertAdjacentElement('afterend', tracksWrapper);
}

async function render(_config) {
  config = _config;

  if (!config) return;

  if (!config.lastfmApiKey) {
    console.info(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  let userName;

  if (config.userName) {
    userName = config.userName;
  } else {
    const userData = await utils.getSyncedUserData();
    userName = userData?.name;
  }

  if (!userName) {
    console.log('No Last.fm username found. Recent Tracks can\'t be displayed.');
    return;
  }

  const {
    button,
    lockButton,
    profileButton,
    tracksWrapper,
    playHistoryItem,
    panelContainer,
  } = prepareRecentTracksUI();

  const buttonsContainer = document.querySelector(
    PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR,
  );

  if (buttonsContainer) {
    profileButton.href = `https://www.last.fm/user/${userName}`;
    buttonsContainer.prepend(profileButton);
    buttonsContainer.prepend(button);
    buttonsContainer.prepend(lockButton);
  }

  const populateRecentTracks = async ({
    data,
    timestamp,
    colors,
  }) => {
    if (data[0].c) {
      panelContainer.classList.add("is-now-playing");
    } else {
      panelContainer.classList.remove("is-now-playing");
    }

    if (config.recentTracksReplace) {
      await populatePlayHistoryItem(
        playHistoryItem,
        {
          artistName: data[0].a,
          artistUrl: utils.generateSearchUrl({
            artist: data[0].a,
          }, config),
          albumName: data[0].r,
          albumUrl: utils.generateSearchUrl({
            artist: data[0].a,
            releaseTitle: data[0].r,
          }, config),
          trackUrl: utils.generateSearchUrl({
            artist: data[0].a,
            trackTitle: data[0].n,
          }, config),
          trackName: data[0].n,
          coverUrl: data[0].il,
          isNowPlaying: data[0].c,
          timestamp: data[0].d,
        },
      );
      playHistoryItem.classList.add('is-loaded');
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

        documentRoot.style.setProperty('--clr-light-accent-hue', parseInt(colors.light.accentColorHSL[0] * 360));
        documentRoot.style.setProperty(
          '--clr-light-accent-saturation',
          (colors.light.accentColorHSL[1] * 100).toFixed(2),
        );
        documentRoot.style.setProperty(
          '--clr-light-accent-lightness',
          (colors.light.accentColorHSL[2] * 100).toFixed(2),
        );

        documentRoot.style.setProperty('--clr-dark-accent-hue', parseInt(colors.dark.accentColorHSL[0] * 360));
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
    const tracksList = createTracksList(tracklistData, userName);

    tracksWrapper.replaceChildren(tracksList);

    tracksWrapper.dataset.timestamp = `Updated at ${new Date(timestamp).toLocaleString()}`;
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

      let colors = null;

      try {
        colors = await utils.getImageColors(normalizedData[0].il);
      } catch {
        console.warn('Failed to get image colors, using cached data without colors');
      }

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
        colors,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Failed to fetch recent tracks:", err);
      }
    }
  };

  insertRecentTracksWrapperIntoDOM(tracksWrapper);

  let intervalId = null;
  let lastTick = null;
  let progressLoopActive = false;

  function getPollingProgress() {
    if (!lastTick) return 0;
    const elapsed = Date.now() - lastTick;
    return Math.min(elapsed / constants.RECENT_TRACKS_INTERVAL_MS, 1);
  }

  function updateProgressVisual() {
    const progress = getPollingProgress();
    const angle = parseInt(progress * 360);
    button.style.setProperty('--progress', `${angle}deg`);
    if (progress >= 1) {
      button.classList.add('is-fetching');
    } else {
      button.classList.remove('is-fetching');
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
      await updateAction();
    } else {
      let colors = null;

      try {
        colors = await utils.getImageColors(recentTracksCache.data[0].il);
      } catch {
        console.warn('Failed to get image colors, using cached data without colors');
      }

      await populateRecentTracks({
        data: recentTracksCache.data,
        colors,
      });
      tracksWrapper.dataset.timestamp = `Updated at ${new Date(recentTracksCache.timestamp).toLocaleString()}`;
    }
  } else {
    if (document.visibilityState === 'visible') {
      await updateAction();
    }
  }

  if (document.visibilityState === 'visible') {
    startInterval();
  }

  const stopInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const handleVisibilityChange = async () => {
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
