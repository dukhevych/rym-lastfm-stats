const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

import { formatDistanceToNow } from 'date-fns';

import * as utils from "./helpers/utils.js";

const lightThemeClasses = [
  'theme_light',
  'theme_lightgray',
  'theme_pink',
  'theme_classic',
];

const darkThemeClasses = [
  'theme_eve',
  'theme_night',
  'theme_darkgray',
];

function isDarkMode() {
  const htmlClasses = document.querySelector('html').classList;
  return darkThemeClasses.some((darkThemeClass) => htmlClasses.contains(darkThemeClass));
}

function isMyProfile() {
  const headerProfileUsername = document.querySelector('#header_profile_username');
  const profileName = document.querySelector('#profilename');

  if (headerProfileUsername && profileName) {
    return headerProfileUsername.textContent.trim() === profileName.textContent.trim();
  }

  return false;
};

browserAPI.storage.sync.get(["lastfmUsername", "lastfmApiKey", 'lastfmLimit'], async function (items) {
  if (items && items.lastfmLimit === 0) return;

  if (items && items.lastfmApiKey) {
    let userName;

    if (isMyProfile()) userName = items.lastfmUsername;

    if (!userName) {
      const firstLastFmLink = document.querySelector('a[href*="last.fm"][href*="/user/"]');


      if (firstLastFmLink) {
        const parts = firstLastFmLink.href.replace(/^\/|\/$/g, '').split('/');
        userName = parts[parts.length - 1].trim();

        if (isMyProfile()) {
          browserAPI.storage.sync.set({ lastfmUsername: userName });
        }
      } else {
        console.log("No Last.fm links found.");
        return;
      }
    }

    if (userName) {
      const button = document.createElement('button');
      button.classList.add('btn-lastfm');
      const playHistoryButton = document.querySelector('a[href^="/play-history/"]');

      const listeningContainer = document.querySelector('.profile_listening_container');

      const tracksWrapper = document.createElement('div');
      tracksWrapper.classList.add('profile_listening_container', 'lastfm-tracks-wrapper');

      button.addEventListener('click', () => {
        tracksWrapper.classList.toggle('is-active');
      });

      const playHistoryClasses = Array.from(playHistoryButton.classList);
      button.classList.add(...playHistoryClasses);
      button.textContent = 'Last.fm Recent Tracks';

      button.style.backgroundColor = '#f71414';
      button.style.color = 'white';
      button.style.marginRight = '2rem';

      playHistoryButton.parentNode.insertBefore(button, playHistoryButton);

      const [recentTracks, topAlbums] = await Promise.all([
        fetchUserRecentTracks(userName, items.lastfmApiKey, items.lastfmLimit),
        fetchUserTopAlbums(userName, items.lastfmApiKey),
      ]);

      const topAlbumsHeader = document.createElement('div');
      topAlbumsHeader.classList.add('bubble_header');
      topAlbumsHeader.textContent = 'Top Albums (Last 30 days)';

      const topAlbumsContainer = document.createElement('div');
      topAlbumsContainer.classList.add('bubble_content', 'top-albums');
      topAlbumsContainer.style.padding = '14px';

      topAlbums.forEach((album) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('album-wrapper');

        const cover = document.createElement('div');
        cover.classList.add('album-image');
        const img = document.createElement('img');
        img.src = album.image[3]['#text'];
        cover.appendChild(img);

        const infoWrapper = document.createElement('div');
        infoWrapper.classList.add('album-details');

        const title = document.createElement('a');
        title.href = album.url;
        title.target = '_blank';
        title.textContent = album.name
        title.classList.add('album-title');

        const artist = document.createElement('a');
        artist.href = album.artist.url;
        artist.target = '_blank';
        artist.textContent = album.artist.name;
        artist.classList.add('album-artist');

        const plays = document.createElement('a');
        plays.href = `https://www.last.fm/user/${userName}/library/music/${encodeURIComponent(album.artist.name)}/${encodeURIComponent(album.name)}?date_preset=LAST_30_DAYS`;
        plays.target = '_blank';
        plays.textContent = `${utils.formatNumber(album.playcount)} plays`;

        const link = document.createElement('a');
        link.href = album.url;
        link.target = '_blank';
        link.classList.add('album-link');

        wrapper.appendChild(cover);
        infoWrapper.appendChild(title);
        infoWrapper.appendChild(artist);
        infoWrapper.appendChild(plays);
        wrapper.appendChild(infoWrapper);
        wrapper.appendChild(link);

        topAlbumsContainer.appendChild(wrapper);
      });

      const profileContainer = document.querySelector('.bubble_header.profile_header + .bubble_content');

      profileContainer.insertAdjacentElement('afterend', topAlbumsContainer);

      console.log('Recent tracks', recentTracks);
      console.log('Top albums', topAlbums);

      const style = document.createElement('style');
      style.textContent = `
        .btn-lastfm img {
          margin-right: 0.5em;
        }

        .lastfm-tracks-wrapper.is-active {
          opacity: 1;
          transform: translateY(0);
          position: static;
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

        .lastfm-tracks-wrapper .track-image {
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

        .lastfm-tracks-wrapper .track-date img { margin-right: 0.5em;}

        .lastfm-tracks-wrapper li + li {
          border-top: 1px solid;
        }

        ${lightThemeClasses.map((themeClass) => '.' + themeClass + ' .lastfm-tracks-wrapper li + li').join(',')} {
          border-color: rgba(0, 0, 0, 0.1);
        }

        ${darkThemeClasses.map((themeClass) => '.' + themeClass + ' .lastfm-tracks-wrapper li + li').join(',')} {
          border-color: rgba(255, 255, 255, 0.1);
        }

        .lastfm-tracks-wrapper li.is-now-playing {
          ${isDarkMode() ? 'background: rgba(255, 255, 255, 0.1);' : 'background: rgba(0, 0, 0, 0.1);'}
        }

        .top-albums {
          display: flex;
        }

        .top-albums > * {
          flex: 1;
          position: relative;
        }

        .top-albums .album-image {
          position: relative;
        }

        .top-albums a { color: white; }

        .top-albums .album-image img {
          display: block;
          width: 100%;
        }

        .top-albums .album-image::after {
          background-image: linear-gradient(180deg,transparent 0,rgba(0,0,0,.45) 70%,rgba(0,0,0,.8));
          content: "";
          height: 100%;
          left: 0;
          position: absolute;
          top: 0;
          width: 100%;
        }

        .top-albums .album-details a:hover {
          text-decoration: underline;
        }

        .top-albums .album-details {
          bottom: 15px;
          font-size: 14px;
          line-height: 1.5;
          left: 15px;
          line-height: 18px;
          margin: 0;
          position: absolute;
          right: 15px;
          text-shadow: 0 0 10px rgba(0,0,0,.7);
          display: flex;
          flex-direction: column;
        }

        .album-wrapper .album-details a {
          position: relative;
          z-index: 1;
          display: block;
          max-width: 100%;
          font-size: 14px;
          padding: 1px 0;
          line-height: 1.4;
          white-space: nowrap;
          overflow-x: hidden;
          text-overflow: ellipsis;
        }

        .album-wrapper .album-details .album-title {
          font-weight: bold;
          font-size: 18px;
        }

        .top-albums .album-wrapper:has(.album-link:hover) .album-title {
          text-decoration: underline;
        }

        .top-albums .album-wrapper {
          position: relative;
        }

        .top-albums .album-link {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }
      `;
      document.head.appendChild(style);

      const tracksList = document.createElement('ul');

      recentTracks.forEach((track) => {
        const line = document.createElement('li');

        const cover = document.createElement('a');
        cover.classList.add('track-image');
        cover.href = `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(track.artist['#text'])} ${encodeURIComponent(track.album['#text'])}&searchtype=`;
        cover.title = `Search for "${track.artist['#text']} - ${track.album['#text']}" on Rate Your Music`;
        const img = document.createElement('img');
        img.src = track.image[0]['#text'];

        cover.appendChild(img);

        const title = document.createElement('strong');
        title.classList.add('track-title');
        title.textContent = track.name;

        const artist = document.createElement('div');
        artist.classList.add('track-artist');
        const artistLink = document.createElement('a');
        artistLink.textContent = track.artist['#text'];
        artistLink.title = `Search for "${track.artist['#text']}" on Rate Your Music`;
        artistLink.href = `https://rateyourmusic.com/search?searchterm=${encodeURIComponent(track.artist['#text'].toLowerCase())}&searchtype=a`;
        artist.appendChild(artistLink);

        const date = document.createElement('span');
        date.classList.add('track-date');

        if (track['@attr']?.nowplaying) {
          line.classList.add('is-now-playing');
          date.textContent = 'Scrobbling now';
          const icon = document.createElement('img');
          icon.src = 'https://www.last.fm/static/images/icons/now_playing_grey_12.b4158f8790d0.gif';
          date.prepend(icon);
          button.prepend(icon.cloneNode());
        } else {
          date.textContent = formatDistanceToNow(new Date(track.date.uts * 1000), { addSuffix: true });
          date.title = new Date(track.date.uts * 1000).toLocaleString();
        }

        line.appendChild(cover);
        line.appendChild(title);
        line.appendChild(artist);
        line.appendChild(date);

        tracksList.appendChild(line);
      });

      tracksWrapper.appendChild(tracksList);
      listeningContainer.insertAdjacentElement('afterend', tracksWrapper);
    }
  } else {
    console.log(
      "Last.fm credentials not set. Please set them in the extension options."
    );
  }
});

function fetchUserRecentTracks(username, apiKey, limit = 10) {
  const baseUrl = "https://ws.audioscrobbler.com/2.0/";

  const _params = {
    method: "user.getrecenttracks",
    user: username,
    api_key: apiKey,
    format: "json",
    limit,
    nowplaying: true,
  };

  const params = new URLSearchParams(_params);

  const url = `${baseUrl}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data.recenttracks.track;
    })
    .catch((error) => console.error("Error:", error));
}

function fetchUserTopAlbums(username, apiKey) {
  const baseUrl = "https://ws.audioscrobbler.com/2.0/";

  const _params = {
    method: "user.gettopalbums",
    user: username,
    api_key: apiKey,
    format: "json",
    period: "1month",
    limit: 6,
  };

  const params = new URLSearchParams(_params);

  const url = `${baseUrl}?${params.toString()}`;

  return fetch(url)
    .then((response) => response.json())
    .then((data) => {
      return data.topalbums.album;
    })
    .catch((error) => console.error("Error:", error));
}
