import { formatDistanceToNow } from 'date-fns';

import * as utils from "@/helpers/utils.js";
import * as constants from '@/helpers/constants.js';
import * as api from '@/helpers/api.js';

const PROFILE_LISTENING_CONTAINER_SELECTOR = '.profile_listening_container';
const PLAY_HISTORY_BUTTON_SELECTOR = 'a[href^="/play-history/"]';

function createRecentTracksUI() {
  const button = createLastfmButton();
  const tracksWrapper = document.createElement('div');
  tracksWrapper.classList.add('profile_listening_container', 'lastfm-tracks-wrapper');

  button.addEventListener('click', () => {
    tracksWrapper.classList.toggle('is-active');
  });

  return { button, tracksWrapper };
}

function createLastfmButton() {
  const button = document.createElement('button');
  button.classList.add('btn-lastfm');
  const playHistoryButton = document.querySelector(PLAY_HISTORY_BUTTON_SELECTOR);
  const playHistoryClasses = Array.from(playHistoryButton.classList);
  button.classList.add(...playHistoryClasses);
  button.textContent = 'Last.fm Recent Tracks';
  button.style.backgroundColor = '#f71414';
  button.style.color = 'white';
  button.style.marginRight = '2rem';
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
  const cover = document.createElement('a');
  cover.classList.add('track-image');
  cover.href = `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(track.artist['#text'])} ${encodeURIComponent(track.album['#text'])}&searchtype=`;
  cover.title = `Search for "${track.artist['#text']} - ${track.album['#text']}" on Rate Your Music`;
  const img = document.createElement('img');
  img.src = track.image[0]['#text'];
  cover.appendChild(img);
  return cover;
}

function createTrackTitle(track) {
  const title = document.createElement('strong');
  title.classList.add('track-title');
  title.textContent = track.name;
  return title;
}

function createTrackArtist(track) {
  const artist = document.createElement('div');
  artist.classList.add('track-artist');
  const artistLink = document.createElement('a');
  artistLink.textContent = track.artist['#text'];
  artistLink.title = `Search for "${track.artist['#text']}" on Rate Your Music`;
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
    icon.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';
    date.prepend(icon);
  } else {
    date.textContent = formatDistanceToNow(new Date(track.date.uts * 1000), { addSuffix: true });
    date.title = new Date(track.date.uts * 1000).toLocaleString();
  }
  return date;
}

function insertRecentTracksWrapperIntoDOM(tracksWrapper) {
  const listeningContainer = document.querySelector(PROFILE_LISTENING_CONTAINER_SELECTOR);
  listeningContainer.insertAdjacentElement('afterend', tracksWrapper);
}

function insertRecentTracksButtonIntoDOM(button) {
  const playHistoryButton = document.querySelector(PLAY_HISTORY_BUTTON_SELECTOR);
  playHistoryButton.parentNode.insertBefore(button, playHistoryButton);
}

function addRecentTracksStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Common styles */
    .btn-lastfm img {
      margin-right: 0.5em;
    }

    /* Recent Tracks styles */
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

    .lastfm-tracks-wrapper .track-image img {
      display: block;
      width: 34px;
      height: 34px;
    }

    .lastfm-tracks-wrapper .track-title {
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

    .lastfm-tracks-wrapper li.is-now-playing {
      background: rgba(0, 0, 0, 0.1);
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
    console.error("Last.fm credentials not set. Please set Last.fm API Key in the extension options.");
    return;
  }

  const userName = utils.getUserName(config);

  if (!userName) {
    console.log("No Last.fm username found. Recent Tracks can't be displayed.");
    return;
  }

  const { button, tracksWrapper } = createRecentTracksUI();

  insertRecentTracksButtonIntoDOM(button);

  const recentTracks = await api.fetchUserRecentTracks(userName, config.lastfmApiKey, { limit: config.recentTracksLimit });
  const tracksList = createTracksList(recentTracks, userName);

  tracksWrapper.appendChild(tracksList);
  insertRecentTracksWrapperIntoDOM(tracksWrapper);
  addRecentTracksStyles();
}

export default {
  render,
  targetSelectors: [
    PROFILE_LISTENING_CONTAINER_SELECTOR,
    PLAY_HISTORY_BUTTON_SELECTOR,
  ],
};
