import { formatDistanceToNow } from 'date-fns';

import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import * as api from '@/helpers/api.js';

const PROFILE_LISTENING_CONTAINER_SELECTOR = '.profile_listening_container';
const PLAY_HISTORY_BUTTON_SELECTOR = 'a[href^="/play-history/"]';

function createRecentTracksUI() {
  const button = createLastfmButton();
  const tracksWrapper = document.createElement('div');
  tracksWrapper.classList.add(
    'profile_listening_container',
    'lastfm-tracks-wrapper',
  );

  button.addEventListener('click', () => {
    tracksWrapper.classList.toggle('is-active');
  });

  return { button, tracksWrapper };
}

function createLastfmButton() {
  const button = document.createElement('button');
  button.classList.add('btn-lastfm');
  const playHistoryButton = document.querySelector(
    PLAY_HISTORY_BUTTON_SELECTOR,
  );
  const playHistoryClasses = Array.from(playHistoryButton.classList);
  button.classList.add(...playHistoryClasses);
  button.textContent = 'Last.fm Recent Tracks';

  const gif = document.createElement('img');
  gif.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';
  button.prepend(gif);

  return button;
}

function createTracksList(recentTracks, userName) {
  const tracksList = document.createElement('ul');
  recentTracks.forEach((track) => {
    const trackItem = createTrackItem(track, userName);
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
  link.href = `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(track.artist['#text'])} ${encodeURIComponent(track.album['#text'] || track.name)}&searchtype=`;
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
  const title = document.createElement('a');
  title.classList.add('track-title');
  title.href = `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(track.artist['#text'])} ${encodeURIComponent(track.album['#text'] || track.name)}&searchtype=`;
  title.title = `Search for "${track.artist['#text']} - ${track.album['#text'] || track.name}" on RateYourMusic`;
  title.textContent = track.name;
  return title;
}

function createTrackArtist(track) {
  const artist = document.createElement('div');
  artist.classList.add('track-artist');
  const artistLink = document.createElement('a');
  artistLink.textContent = track.artist['#text'];
  artistLink.title = `Search for "${track.artist['#text']}" on RateYourMusic`;
  artistLink.href = `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(track.artist['#text'].toLowerCase())}&searchtype=a`;
  artist.appendChild(artistLink);
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
    PROFILE_LISTENING_CONTAINER_SELECTOR,
  );
  listeningContainer.insertAdjacentElement('afterend', tracksWrapper);
}

function insertRecentTracksButtonIntoDOM(button) {
  const playHistoryButton = document.querySelector(
    PLAY_HISTORY_BUTTON_SELECTOR,
  );
  playHistoryButton.parentNode.insertBefore(button, playHistoryButton);
}

function addRecentTracksStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --clr-lastfm: ${constants.LASTFM_COLOR};
      --clr-lastfm-darker: color-mix(in lab, var(--clr-lastfm) 80%, black);
      --clr-lastfm-lighter: color-mix(in lab, var(--clr-lastfm) 80%, white);
    }

    .btn.btn-lastfm {
      background-color: var(--clr-lastfm);
      color: white;
      margin-right: 2rem;
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
      transition: all .3s ease-in-out;
      opacity: 0;
      transform: translateY(-10px);
      margin-top: 0;
    }

    .lastfm-tracks-wrapper.is-active {
      opacity: 1;
      transform: translateY(0);
      position: static;
    }

    .lastfm-tracks-wrapper ul {
      display: table;
      width: 100%;
    }

    .lastfm-tracks-wrapper li {
      display: table-row;
    }

    .lastfm-tracks-wrapper li > * {
      display: table-cell;
      vertical-align: middle;
      padding: 9px;
    }

    .lastfm-tracks-wrapper li > *:first-child {
      padding-left: 15px;
    }

    .lastfm-tracks-wrapper li > *:last-child {
      padding-right: 15px;
      white-space: nowrap;
    }

    .lastfm-tracks-wrapper .track-image a {
      display: block;
      position: relative;
      width: 34px;
      height: 34px;
      ${utils.isDarkMode() ? 'background: rgba(255, 255, 255, 0.1);' : 'background: rgba(0, 0, 0, 0.1);'}
    }

    .lastfm-tracks-wrapper .track-image a:empty::after {
      content: '?';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .lastfm-tracks-wrapper .track-image img {
      display: block;
      width: 100%;
      height: 100%;
    }

    .lastfm-tracks-wrapper .track-title {
      font-weight: bold;
      width: 60%;
    }

    .lastfm-tracks-wrapper .track-artist {
      width: 40%;
      font-weight: bold;
    }

    .lastfm-tracks-wrapper .track-date {
      text-align: right;
    }

    .lastfm-tracks-wrapper .track-date img {
      margin-right: 0.5em;
    }

    .lastfm-tracks-wrapper li + li {
      border-top: 1px solid;
    }

    /* Theme-specific styles */
    ${constants.LIGHT_THEME_CLASSES.map((themeClass) => '.' + themeClass + ' .lastfm-tracks-wrapper li + li').join(',')} {
      border-color: rgba(0, 0, 0, 0.1);
    }

    ${constants.DARK_THEME_CLASSES.map((themeClass) => '.' + themeClass + ' .lastfm-tracks-wrapper li + li').join(',')} {
      border-color: rgba(255, 255, 255, 0.1);
    }

    .lastfm-tracks-wrapper li.is-now-playing {
      ${utils.isDarkMode() ? 'background: rgba(255, 255, 255, 0.1);' : 'background: rgba(0, 0, 0, 0.1);'}
    }
  `;
  document.head.appendChild(style);
}

async function render(config) {
  if (!config) return;

  if (!config.lastfmApiKey) {
    console.error(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userName = utils.getUserName(config);

  if (!userName) {
    console.log("No Last.fm username found. Recent Tracks can't be displayed.");
    return;
  }

  addRecentTracksStyles();

  const { button, tracksWrapper } = createRecentTracksUI();

  insertRecentTracksButtonIntoDOM(button);

  const recentTracks = await api.fetchUserRecentTracks(
    userName,
    config.lastfmApiKey,
    { limit: config.recentTracksLimit },
  );

  console.log(recentTracks);

  if (recentTracks[0]['@attr']?.nowplaying) {
    button.classList.add('is-now-playing');
  }

  const tracksList = createTracksList(recentTracks, userName);

  tracksWrapper.appendChild(tracksList);
  insertRecentTracksWrapperIntoDOM(tracksWrapper);
}

export default {
  render,
  targetSelectors: [
    PROFILE_LISTENING_CONTAINER_SELECTOR,
    PLAY_HISTORY_BUTTON_SELECTOR,
  ],
};
