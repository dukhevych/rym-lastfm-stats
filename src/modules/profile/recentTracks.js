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

const gif = document.createElement('img');
gif.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';

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
  albumLink: 'album play_history_item_release',
}

function createPlayHistoryItem() {
  const item = document.createElement('div');
  item.className = PLAY_HISTORY_ITEM_CLASSES.item;
  item.classList.add('is-custom');

  const artbox = document.createElement('div');
  artbox.className = PLAY_HISTORY_ITEM_CLASSES.artbox;

  const artLink = document.createElement('a');

  const img = document.createElement('img');
  img.className = PLAY_HISTORY_ITEM_CLASSES.itemArt;

  artLink.appendChild(img);
  artbox.appendChild(artLink);

  const infobox = document.createElement('div');
  infobox.className = PLAY_HISTORY_ITEM_CLASSES.infobox;

  const itemDate = document.createElement('div');
  itemDate.className = PLAY_HISTORY_ITEM_CLASSES.itemDate;

  const statusSpan = document.createElement('span');
  statusSpan.id = 'current-track-status';

  const nowPlayingImg = gif.cloneNode();

  itemDate.appendChild(statusSpan);
  itemDate.appendChild(nowPlayingImg);

  const infoboxLower = document.createElement('div');
  infoboxLower.className = PLAY_HISTORY_ITEM_CLASSES.infoboxLower;

  const release = document.createElement('div');
  release.className = PLAY_HISTORY_ITEM_CLASSES.release;

  const artistSpan = document.createElement('span');
  artistSpan.className = PLAY_HISTORY_ITEM_CLASSES.artistSpan;

  const artistLink = document.createElement('a');
  artistLink.className = PLAY_HISTORY_ITEM_CLASSES.artistLink;

  artistSpan.appendChild(artistLink);

  const separator = document.createElement('span');
  separator.className = PLAY_HISTORY_ITEM_CLASSES.separator;
  separator.textContent = ' - ';

  const albumLink = document.createElement('a');
  albumLink.className = PLAY_HISTORY_ITEM_CLASSES.albumLink;

  release.appendChild(artistSpan);
  release.appendChild(separator);
  release.appendChild(albumLink);

  infoboxLower.appendChild(release);
  infobox.appendChild(itemDate);
  infobox.appendChild(infoboxLower);

  item.appendChild(artbox);
  item.appendChild(infobox);

  return item;
}

function populatePlayHistoryItem(
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

  if (config.recentTracksReplace) {
    const panelContainer = document.querySelector('.profile_listening_container');

    const setToBtn = panelContainer.querySelector(PROFILE_LISTENING_SET_TO_SELECTOR);
    if (setToBtn) setToBtn.style.display = 'none';

    const playHistoryBtn = panelContainer.querySelector(PROFILE_LISTENING_PLAY_HISTORY_BTN);
    if (playHistoryBtn) playHistoryBtn.style.display = 'none';

    const currentTrackContainer = panelContainer.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);

    playHistoryItem = createPlayHistoryItem();

    currentTrackContainer.replaceChildren(playHistoryItem);

    const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
    icon.classList.add('loader');
    currentTrackContainer.appendChild(icon);
  }

  return {
    button,
    lockButton,
    tracksWrapper,
    playHistoryItem,
  };
}

function createLastfmButton() {
  const button = document.createElement('button');
  button.classList.add('btn-lastfm');
  const playHistoryClasses = ['btn', 'blue_btn', 'btn_small'];
  button.classList.add(...playHistoryClasses);
  button.textContent = 'Last.fm Recent Tracks';

  button.prepend(gif.cloneNode());

  return button;
}

// function createRevertButton() {
//   const button = document.createElement('button');
//   const playHistoryClasses = ['btn', 'blue_btn', 'btn_small'];
//   button.classList.add(...playHistoryClasses);
//   button.textContent = 'Hide';

//   return button;
// }

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
    const icon = gif.cloneNode();
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

function addRecentTracksStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .${PLAY_HISTORY_ITEM_CLASSES.item}.is-custom {
      padding-top: 0;
      left: -9999px;
      right: -9999px;
      position: relative;
      align-items: center;
      opacity: 0;
      transform: translateX(-20px);
      transition: all .15s ease-in-out;
      transition-property: opacity, transform;

      &.is-loaded {
        left: auto;
        right: auto;
        opacity: 1;
        transform: translateX(0);
      }

      & + .loader {
        position: absolute;
        top: 50%;
        left: 15px;
        transform: translateY(-50%);
        width: 45px;
        height: 45px;
        color: var(--clr-lastfm);
      }

      &.is-loaded + .loader {
        display: none;
      }

      .${PLAY_HISTORY_ITEM_CLASSES.artbox} {
        a {
          position: relative;

          &:before {
            content: '';
            position: absolute;
            z-index: 1;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            width: 20%;
            height: 20%;
            border-radius: 50%;
            margin: auto;
            outline: 2px solid rgba(255, 255, 255, 0.5);
            opacity: 0;
            transition: opacity .15s ease-in-out, transform .15s ease-in-out;
          }

          img {
            transition: all .15s ease-in-out;
            transition-property: border-radius;
          }
        }
      }
      .${PLAY_HISTORY_ITEM_CLASSES.infobox} {
        padding: 0;
      }
      .${PLAY_HISTORY_ITEM_CLASSES.infoboxLower} {}
      .${PLAY_HISTORY_ITEM_CLASSES.itemDate} {
        &:before {
          content: attr(data-label);
        }
        img {
          display: none;
          opacity: 0.5;
          margin-left: 1rem;
        }
      }
      .${PLAY_HISTORY_ITEM_CLASSES.statusSpan} {}
      .${PLAY_HISTORY_ITEM_CLASSES.release} {}
      .${PLAY_HISTORY_ITEM_CLASSES.artistSpan} {}
      .${PLAY_HISTORY_ITEM_CLASSES.separator} {}
      .${PLAY_HISTORY_ITEM_CLASSES.albumLink} {}
      .${PLAY_HISTORY_ITEM_CLASSES.itemArt} {
        display: block;
        width: 45px;
        height: 45px;
        max-width: none;
      }

      &.is-now-playing {
        .${PLAY_HISTORY_ITEM_CLASSES.itemDate} img { display: inline; }

        .${PLAY_HISTORY_ITEM_CLASSES.artbox} a {
          img {
            animation: rotate 9s linear infinite;
            border-radius: 50%;
            outline: 2px solid rgba(255,255,255, 0.5);
            outline-offset: -2px;
          }

          &:before { opacity: 1; }

          &:hover {
            img {
              border-radius: 0;
              animation: none;
              transform: rotate(0);
            }

            &:before {
              opacity: 0;
              transform: scale(0);
            }
          }
        }
      }
    }

    html[data-scheme="light"] {
      .${PLAY_HISTORY_ITEM_CLASSES.item}.is-custom {
        .${PLAY_HISTORY_ITEM_CLASSES.artbox} {
          a::before {
            background-color: rgba(255, 255, 255, 0.95);
            outline-color: rgba(0, 0, 0, 0.5);
          }
        }
        &.is-now-playing {
          .${PLAY_HISTORY_ITEM_CLASSES.artbox} a {
            img {
              outline: 2px solid rgba(0, 0, 0, 0.5);
            }
          }
        }
      }
    }
  `;

  document.head.appendChild(style);
}

async function render(_config, _userName) {
  config = _config;

  if (!config) return;

  if (!config.lastfmApiKey) {
    console.info(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  let userName;

  if (_userName) {
    userName = _userName;
  } else {
    const userData = await utils.getSyncedUserData();
    userName = userData?.name;
  }

  if (!userName) {
    console.log('No Last.fm username found. Recent Tracks can\'t be displayed.');
    return;
  }

  addRecentTracksStyles();

  const { button, lockButton, tracksWrapper, playHistoryItem } = prepareRecentTracksUI();

  const buttonsContainer = document.querySelector(
    PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR,
  );

  if (buttonsContainer) {
    buttonsContainer.prepend(button);
    buttonsContainer.prepend(lockButton);
  }

  const populateRecentTracks = (data, timestamp) => {
    if (button) {
      if (data[0].c) {
        button.classList.add("is-now-playing");
      } else {
        button.classList.remove("is-now-playing");
      }
    }

    if (config.recentTracksReplace) {
      populatePlayHistoryItem(
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
          coverUrl: data[0].i,
          isNowPlaying: data[0].c,
          timestamp: data[0].d,
        },
      );
      playHistoryItem.classList.add('is-loaded');
    }

    const tracksList = createTracksList(data, userName);

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

      populateRecentTracks(normalizedData, timestamp);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Failed to fetch recent tracks:", err);
      }
    }
  };

  insertRecentTracksWrapperIntoDOM(tracksWrapper);

  let intervalId;

  const startInterval = () => {
    if (!intervalId) {
      intervalId = setInterval(
        updateAction,
        constants.RECENT_TRACKS_INTERVAL_MS,
      );
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
      populateRecentTracks(recentTracksCache.data);
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
