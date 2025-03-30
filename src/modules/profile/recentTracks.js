import { formatDistanceToNow } from 'date-fns';
import throttle from 'lodash/throttle';

import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import * as api from '@/helpers/api.js';

let abortController = new AbortController();

const PROFILE_LISTENING_SET_TO_SELECTOR = '.profile_set_listening_box';

const PROFILE_LISTENING_CURRENT_TRACK_SELECTOR = '#profile_play_history_container';
const PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR = '.profile_view_play_history_btn';
const PROFILE_LISTENING_PLAY_HISTORY_BTN = '.profile_view_play_history_btn a.btn[href^="/play-history/"]';

const LISTENING_LABEL_SELECTOR = '.profile_listening_container' + ' .play_history_item_date';
const LISTENING_ARTIST_SELECTOR = '.profile_listening_container' + ' .play_history_item_artist a.artist';
const LISTENING_TITLE_SELECTOR =
  '.profile_listening_container' + ' .play_history_item_release a.play_history_item_release';
const LISTENING_COVER_SELECTOR = '.profile_listening_container' + ' .play_history_artbox a';
const LISTENING_COVER_IMG_SELECTOR = '.profile_listening_container' + ' img.play_history_item_art';

const gif = document.createElement('img');
gif.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';

let config = null;

const PLAY_HISTORY_ITEM_CLASSES = {
  item: 'play_history_item',
  artbox: 'play_history_artbox',
  infobox: 'play_history_infobox',
  infoboxLower: 'play_history_infobox_lower',
  itemDate: 'play_history_item_date',
  statusSpan: 'current-track-status',
  release: 'play_history_item_release',
  artistSpan: 'play_history_item_artist',
  separator: 'play_history_separator',
  albumLink: 'album play_history_item_release',
  coverImg: 'play_history_item_art',
}

function createPlayHistoryItem() {
  const item = document.createElement('div');
  item.className = PLAY_HISTORY_ITEM_CLASSES.item;

  const artbox = document.createElement('div');
  artbox.className = PLAY_HISTORY_ITEM_CLASSES.artbox;

  const artLink = document.createElement('a');
  // artLink.className = 'is-now-playing';
  // artLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;

  const img = document.createElement('img');
  img.className = PLAY_HISTORY_ITEM_CLASSES.coverImg;

  artLink.appendChild(img);
  artbox.appendChild(artLink);

  const infobox = document.createElement('div');
  infobox.className = PLAY_HISTORY_ITEM_CLASSES.infobox;

  const itemDate = document.createElement('div');
  // itemDate.className = 'is-now-playing';
  itemDate.className = PLAY_HISTORY_ITEM_CLASSES.itemDate;

  const statusSpan = document.createElement('span');
  statusSpan.id = 'current-track-status';
  // statusSpan.textContent = 'Scrobbling now';

  const nowPlayingImg = document.createElement('img');
  nowPlayingImg.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';

  itemDate.appendChild(statusSpan);
  itemDate.appendChild(nowPlayingImg);

  const infoboxLower = document.createElement('div');
  infoboxLower.className = PLAY_HISTORY_ITEM_CLASSES.infoboxLower;

  const release = document.createElement('div');
  release.className = 'play_history_item_release';

  const artistSpan = document.createElement('span');
  artistSpan.className = 'play_history_item_artist';

  const artistLink = document.createElement('a');
  artistLink.className = 'artist';
  // artistLink.href = artistUrl;
  // artistLink.title = `Search for "${artistName}" on RateYourMusic`;
  // artistLink.textContent = artistName;

  artistSpan.appendChild(artistLink);

  const separator = document.createElement('span');
  separator.className = 'play_history_separator';
  separator.textContent = ' - ';

  const albumLink = document.createElement('a');
  albumLink.className = 'album play_history_item_release';
  // albumLink.href = albumUrl;
  // albumLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;
  // albumLink.textContent = albumName;

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
    coverUrl,
    isNowPlaying,
  },
) {
  const img = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.coverImg}`);

  if (isNowPlaying) {
    item.classList.add('is-now-playing');
  } else {
    item.classList.remove('is-now-playing');
  }

  if (img) {
    img.src = coverUrl;
  }

  const artLink = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.artbox} a`);
  if (artLink) {
    artLink.href = albumUrl;
    artLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;
  }
  const artistLink = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.artistSpan} a`);
  if (artistLink) {
    artistLink.href = artistUrl;
    artistLink.title = `Search for "${artistName}" on RateYourMusic`;
    artistLink.textContent = artistName;
  }
  const albumLink = item.querySelector(`.${PLAY_HISTORY_ITEM_CLASSES.albumLink}`);
  albumLink.href = albumUrl;
  albumLink.title = `Search for "${artistName} - ${albumName}" on RateYourMusic`;
  albumLink.textContent = albumName;
  const statusSpan = item.querySelector(`#${PLAY_HISTORY_ITEM_CLASSES.statusSpan}`);
  if (statusSpan) {
    statusSpan.textContent = 'Scrobbling now';
  }
  const nowPlayingImg = item.querySelector(`#${PLAY_HISTORY_ITEM_CLASSES.statusSpan} img`);
  if (nowPlayingImg) {
    nowPlayingImg.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';
  }
  item.classList.add('is-now-playing');
}

function prepareRecentTracksUI() {
  const button = createLastfmButton();
  const tracksWrapper = document.createElement('div');
  let currentTrackCoverImg;
  let currentTrackTitle;
  let currentTrackArtist;

  tracksWrapper.classList.add(
    'profile_listening_container',
    'lastfm-tracks-wrapper',
  );

  button.addEventListener('click', () => {
    tracksWrapper.classList.toggle('is-active');
  });

  if (config.recentTracksReplace) {
    const panelContainer = document.querySelector('.profile_listening_container');

    const setToBtn = panelContainer.querySelector(PROFILE_LISTENING_SET_TO_SELECTOR);
    if (setToBtn) setToBtn.style.display = 'none';

    const playHistoryBtn = panelContainer.querySelector(PROFILE_LISTENING_PLAY_HISTORY_BTN);
    if (playHistoryBtn) playHistoryBtn.style.display = 'none';

    const currentTrackContainer = panelContainer.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);

    if (currentTrackContainer.children.length === 0) {
      // create UI from scratch
    } else {
      // fix broken UI (replace completely too?)
    }

    const label = panelContainer.querySelector(LISTENING_LABEL_SELECTOR);
    if (label) {
      label.textContent = 'Scrobbling now';
      label.append(gif.cloneNode());
    }

    const coverImg = document.querySelector(LISTENING_COVER_IMG_SELECTOR);
    if (coverImg) coverImg.src = '';

    const artist = document.querySelector(LISTENING_ARTIST_SELECTOR);
    if (artist) artist.textContent = 'Artist';

    const title = document.querySelector(LISTENING_TITLE_SELECTOR);
    if (title) title.textContent = 'Title';
  }

  return {
    button,
    tracksWrapper,
    currentTrackCoverImg,
    currentTrackTitle,
    currentTrackArtist,
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

function createTracksList(recentTracks, userName) {
  const tracksList = document.createElement('ul');
  recentTracks.forEach((track) => {
    const trackItem = createTrackItem(track, userName);
    trackItem.dataset.id = track.mbid || `${track.artist["#text"]}-${track.name}-${track.date?.uts || ''}`;
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
    artist: track.artist['#text'],
    releaseTitle: track.album['#text'] || '',
    trackTitle: track.album['#text'] ? '' : track.name,
  }, config);

  link.title = `Search for "${track.artist['#text']} - ${track.album['#text'] || track.name}" on RateYourMusic`;
  wrapper.appendChild(link);
  if (track.image[0]['#text']) {
    const img = document.createElement('img');
    img.src = track.image[0]['#text'];
    link.appendChild(img);
  }
  return wrapper;
}

function createTrackTitle(track) {
  const link = document.createElement('a');
  link.classList.add('track-title');
  link.href = utils.generateSearchUrl({
    artist: track.artist['#text'],
    trackTitle: track.name,
  }, config);
  link.title = `Search for "${track.artist['#text']} - ${track.album['#text'] || track.name}" on RateYourMusic`;
  link.textContent = track.name;
  return link;
}

function createTrackArtist(track) {
  const artist = document.createElement('div');
  artist.classList.add('track-artist');
  const link = document.createElement('a');
  link.textContent = track.artist['#text'];
  link.title = `Search for "${track.artist['#text']}" on RateYourMusic`;
  link.href = utils.generateSearchUrl({
    artist: track.artist['#text'],
  }, config);
  artist.appendChild(link);
  return artist;
}

function createTrackDate(track) {
  const date = document.createElement('span');
  date.classList.add('track-date');
  if (track['@attr']?.nowplaying) {
    date.textContent = 'Scrobbling now';
    const icon = document.createElement('img');
    icon.src =
      'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';
    date.prepend(icon);
  } else {
    date.textContent = formatDistanceToNow(new Date(track.date.uts * 1000), {
      addSuffix: true,
    });
    date.title = new Date(track.date.uts * 1000).toLocaleString();
  }
  return date;
}

function insertRecentTracksWrapperIntoDOM(tracksWrapper) {
  const listeningContainer = document.querySelector(
    '.profile_listening_container',
  );
  listeningContainer.insertAdjacentElement('afterend', tracksWrapper);
}

function insertRecentTracksButtonIntoDOM(button) {
  const buttonsContainer = document.querySelector(
    PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR,
  );

  if (buttonsContainer) {
    buttonsContainer.prepend(button);
  }
}

function addRecentTracksStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --clr-lastfm: ${constants.LASTFM_COLOR};
      --clr-lastfm-darker: color-mix(in lab, var(--clr-lastfm) 80%, black);
      --clr-lastfm-lighter: color-mix(in lab, var(--clr-lastfm) 80%, white);
    }

    ${PROFILE_LISTENING_CURRENT_TRACK_SELECTOR} {
      transition: opacity .3s ease-in-out;
      left: auto;
      right: auto;
      position: relative;
      opacity: 1;

      &.is-loading {
        opacity: 0;
        left: -9999px;
        right: 9999px;
        position: absolute;
      }
    }

    .${PLAY_HISTORY_ITEM_CLASSES.item} {
      padding-top: 0;
      align-items: center;

      .${PLAY_HISTORY_ITEM_CLASSES.artbox} {
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        a {
          overflow: hidden;
          position: relative;
          transition: border-radius .15s ease-in-out;

          &.is-now-playing {
            border-radius: 50%;
            animation: rotate 9s linear infinite;
            &:after { opacity: 1; }

            &:hover {
              border-radius: 0;
              animation: none;
              transform: rotate(0);
              &:after {
                opacity: 0;
                transform: scale(0);
              }
            }
          }

          &:after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            width: 33.33%;
            height: 33.33%;
            border-radius: 50%;
            margin: auto;
            opacity: 0;
            transition: opacity .15s ease-in-out, transform .15s ease-in-out;
          }
        }
      }
      .${PLAY_HISTORY_ITEM_CLASSES.infobox} {
        padding: 0;
      }
      .${PLAY_HISTORY_ITEM_CLASSES.infoboxLower} {}
      .${PLAY_HISTORY_ITEM_CLASSES.itemDate} {
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
      .${PLAY_HISTORY_ITEM_CLASSES.coverImg} {
        display: block;
        width: 45px;
        height: 45px;
        max-width: none;
      }

      &.is-now-playing {
        .${PLAY_HISTORY_ITEM_CLASSES.itemDate} img { display: inline; }
      }
    }

    .profile_listening_container {
      padding: 1.25rem;
    }

    .profile_view_play_history_btn {
      gap: 2rem;
      min-height: 45px;
      flex: 1 0 auto;
    }

    .btn.btn-lastfm {
      background-color: var(--clr-lastfm) !important;
      color: white !important;
      margin-right: 0;
    }

    .btn.btn-lastfm:hover {
      background-color: var(--clr-lastfm-darker);
    }

    .btn.btn-lastfm img {
      display: none;
      margin-right: 0.5em;
    }

    .btn.btn-lastfm.is-now-playing img {
      display: inline;
    }

    .lastfm-tracks-wrapper {
      display: block;
      position: absolute;
      left: -9999px;
      right: 9999px;
      transition: all .15s ease-out;
      opacity: 0;
      transform: translateY(-10px);
      margin-top: 0;
      padding-bottom: 30px;

      &:before,
      &:after {
        position: absolute;
        opacity: 0.75;
        bottom: 0;
        height: 30px;
        padding: 0 15px;
        font-size: 0.75em;
        line-height: 29px;
      }

      &:before {
        content: attr(data-timestamp);
        right: 0;
      }

      &:after {
        content: 'Powered by RYM Last.fm Stats';
        left: 0;
      }

      &.is-active {
        opacity: 1;
        transform: translateY(0);
        position: relative;
        left: auto;
        right: auto;
      }

      ul {
        display: table;
        width: 100%;
      }

      li {
        display: table-row;

        & + li { border-top: 1px solid; }

        & > * {
          display: table-cell;
          vertical-align: middle;
          padding: 9px;

          &:first-child {
            padding-left: 15px;
          }

          &:last-child {
            padding-right: 15px;
            white-space: nowrap;
          }
        }
      }

      .track-image {
        a {
          display: block;
          position: relative;
          width: 34px;
          height: 34px;

          &:empty::after {
            content: '?';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          }
        }

        img {
          display: block;
          width: 100%;
          height: 100%;
        }
      }

      .track-title {
        font-weight: bold;
        width: 60%;
      }

      .track-artist {
        width: 40%;
        font-weight: bold;
      }

      .track-date {
        text-align: right;

        img {
          margin-right: 0.5em;
        }
      }
    }

    html[data-scheme="light"] {
      .lastfm-tracks-wrapper {
        .track-image a { background: rgba(0, 0, 0, 0.1); }
        li {
          & + li {
            border-color: rgba(0, 0, 0, 0.1);
          }
          &.is-now-playing {
            background: rgba(0, 0, 0, 0.1);
          }
        }
      }
    }

    html[data-scheme="dark"] {
      .lastfm-tracks-wrapper {
      .track-image a { background: rgba(255, 255, 255, 0.1); }
        li {
          & + li {
            border-color: rgba(255, 255, 255, 0.1);
          }
          &.is-now-playing {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }
  `;

  document.head.appendChild(style);
}

function replaceListeningTo(latestTrack) {
  const label = document.querySelector(LISTENING_LABEL_SELECTOR);
  const isNowPlaying = latestTrack['@attr']?.nowplaying;

  if (label) {
    if (isNowPlaying) {
      label.classList.add('is-now-playing');
      label.textContent = 'Scrobbling now';
      label.append(gif.cloneNode());
    } else {
      const date = formatDistanceToNow(new Date(latestTrack.date.uts * 1000), {
        addSuffix: true,
      });
      label.classList.remove('is-now-playing');
      label.textContent = `Last scrobble (${date})`;
    }
  }

  const cover = document.querySelector(LISTENING_COVER_SELECTOR);
  if (cover) {
    if (isNowPlaying) {
      cover.classList.add('is-now-playing');
    }
    cover.href = utils.generateSearchUrl({
      artist: latestTrack.artist['#text'],
      releaseTitle: latestTrack.album['#text'] || '',
      trackTitle: latestTrack.album['#text'] ? '' : latestTrack.name,
    }, config);
    const searchQuery = `${latestTrack.artist['#text']} - ${latestTrack.album['#text'] || latestTrack.name}`;
    cover.title = `Search for "${searchQuery}" on RateYourMusic`;
  }

  const coverImg = document.querySelector(LISTENING_COVER_IMG_SELECTOR);
  if (coverImg) coverImg.src = latestTrack.image[1]['#text'];

  const artist = document.querySelector(LISTENING_ARTIST_SELECTOR);
  if (artist) {
    artist.textContent = latestTrack.artist['#text'];
    artist.href = utils.generateSearchUrl({
      artist: latestTrack.artist['#text'],
    }, config);
    artist.title = `Search for "${latestTrack.artist['#text']}" on RateYourMusic`;
  }

  const title = document.querySelector(LISTENING_TITLE_SELECTOR);
  if (title) {
    title.textContent = latestTrack.name;
    title.href = utils.generateSearchUrl({
      artist: latestTrack.artist['#text'],
      trackTitle: latestTrack.name,
    }, config);
    title.title = `Search for "${latestTrack.artist['#text']} - ${latestTrack.name}" on RateYourMusic`;
  }
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

  const currentTrack = document.querySelector(PROFILE_LISTENING_CURRENT_TRACK_SELECTOR);

  if (currentTrack && config.recentTracksReplace) {
    currentTrack.classList.add('is-loading');
  }

  const { button, tracksWrapper } = prepareRecentTracksUI();

  insertRecentTracksButtonIntoDOM(button);

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

      if (data[0]["@attr"]?.nowplaying) {
        button.classList.add("is-now-playing");
      } else {
        button.classList.remove("is-now-playing");
      }

      if (config.recentTracksReplace) {
        replaceListeningTo(data[0]);
      }

      const tracksList = createTracksList(data, userName);

      const timestamp = new Date();

      tracksWrapper.replaceChildren(tracksList);

      tracksWrapper.dataset.timestamp = `Updated at ${timestamp.toLocaleString()}`;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Failed to fetch recent tracks:", err);
      }
    }
  };

  await updateAction();

  insertRecentTracksWrapperIntoDOM(tracksWrapper);

  if (currentTrack && config.recentTracksReplace) {
    currentTrack.classList.remove('is-loading');
  }

  let intervalId;

  const startInterval = () => {
    if (!intervalId) {
      intervalId = setInterval(
        updateAction,
        constants.RECENT_TRACKS_INTERVAL_MS,
      );
    }
  };

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

  const throttledHandleVisibilityChange = throttle(
    handleVisibilityChange,
    constants.RECENT_TRACKS_INTERVAL_MS_THROTTLED,
  );

  document.addEventListener(
    'visibilitychange',
    throttledHandleVisibilityChange,
  );

  if (document.visibilityState === 'visible') {
    await updateAction();
    startInterval();
  }
}

export default {
  render,
  targetSelectors: [
    '.profile_listening_container',
    // PROFILE_LISTENING_SET_TO_SELECTOR,
    // PROFILE_LISTENING_BUTTONS_CONTAINER_SELECTOR,
    // PROFILE_LISTENING_PLAY_HISTORY_BTN,
    // PROFILE_LISTENING_CURRENT_TRACK_SELECTOR,
  ],
};
