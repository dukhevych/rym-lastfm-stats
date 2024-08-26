import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

export async function render(config) {
  if (!config) return;

  if (!config.lastfmApiKey) {
    console.error(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userName = utils.getUserName(config);

  if (!userName) {
    console.log("No Last.fm username found. Top Albums can't be displayed.");
    return;
  }

  addTopAlbumsStyles();

  const topAlbums = await api.fetchUserTopAlbums(
    userName,
    config.lastfmApiKey,
    {
      limit: config.topAlbumsLimit,
      period: config.topAlbumsPeriod,
    },
  );

  const { topAlbumsHeader, topAlbumsContainer } = createTopAlbumsUI(config);
  populateTopAlbums(topAlbumsContainer, topAlbums, userName);

  insertTopAlbumsIntoDOM(topAlbumsHeader, topAlbumsContainer);
}

function addTopAlbumsStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .top-albums {
      display: flex;
      flex-wrap: wrap;
    }

    .top-albums .album-wrapper {
      position: relative;
      width: 182px;
    }

    @media screen and (max-width: 1024px) {
      .top-albums .album-wrapper {
        width: 25%;
      }
    }

    .top-albums .album-image {
      position: relative;
      aspect-ratio: 1 / 1;
    }

    .top-albums a { color: white; }

    .top-albums .album-image img {
      display: block;
      width: 100%;
      height: auto;
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
      font-size: 12px;
      padding: 1px 0;
      line-height: 1.4;
      white-space: nowrap;
      overflow-x: hidden;
      text-overflow: ellipsis;
    }

    .album-wrapper .album-details .album-title {
      font-weight: bold;
      font-size: 16px;
    }

    .top-albums .album-wrapper:has(.album-link:hover) .album-title {
      text-decoration: underline;
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
}

function createTopAlbumsUI(config) {
  const periodLabel = constants.TOP_ALBUMS_PERIOD_OPTIONS.find(
    (option) => option.value === config.topAlbumsPeriod,
  )?.label;
  const topAlbumsHeader = document.createElement('div');
  topAlbumsHeader.classList.add('bubble_header');

  let headerText = 'Top Albums';

  if (periodLabel) {
    headerText += ` (${periodLabel})`;
  }

  topAlbumsHeader.textContent = headerText;

  const topAlbumsContainer = document.createElement('div');
  topAlbumsContainer.classList.add('bubble_content', 'top-albums');
  topAlbumsContainer.style.padding = '14px';

  return { topAlbumsHeader, topAlbumsContainer };
}

function populateTopAlbums(container, topAlbums, userName) {
  topAlbums.forEach((album) => {
    const albumWrapper = createAlbumWrapper(album, userName);
    container.appendChild(albumWrapper);
  });
}

function createAlbumWrapper(album, userName) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('album-wrapper');

  wrapper.appendChild(createAlbumCover(album));
  wrapper.appendChild(createAlbumInfo(album, userName));
  wrapper.appendChild(createAlbumLink(album));

  return wrapper;
}

function createAlbumCover(album) {
  const cover = document.createElement('div');
  cover.classList.add('album-image');
  const img = document.createElement('img');
  img.src = album.image[2]['#text'];
  cover.appendChild(img);
  return cover;
}

function createAlbumInfo(album, userName) {
  const infoWrapper = document.createElement('div');
  infoWrapper.classList.add('album-details');

  infoWrapper.appendChild(createAlbumTitle(album));
  infoWrapper.appendChild(createAlbumArtist(album));
  infoWrapper.appendChild(createAlbumPlays(album, userName));

  return infoWrapper;
}

function createAlbumTitle(album) {
  const title = document.createElement('a');
  title.href = album.url;
  title.target = '_blank';
  title.textContent = album.name;
  title.title = album.name;
  title.classList.add('album-title');
  return title;
}

function createAlbumArtist(album) {
  const artist = document.createElement('a');
  artist.href = album.artist.url;
  artist.target = '_blank';
  artist.textContent = album.artist.name;
  artist.title = album.artist.name;
  artist.classList.add('album-artist');
  return artist;
}

function createAlbumPlays(album, userName) {
  const plays = document.createElement('a');
  plays.href = `https://www.last.fm/user/${userName}/library/music/${encodeURIComponent(album.artist.name)}/${encodeURIComponent(album.name)}?date_preset=LAST_30_DAYS`;
  plays.target = '_blank';
  plays.textContent = `${utils.formatNumber(album.playcount)} plays`;
  return plays;
}

function createAlbumLink(album) {
  const link = document.createElement('a');
  link.href = album.url;
  link.target = '_blank';
  link.classList.add('album-link');
  return link;
}

function insertTopAlbumsIntoDOM(topAlbumsHeader, topAlbumsContainer) {
  const profileContainer = document.querySelector(PROFILE_CONTAINER_SELECTOR);
  profileContainer.insertAdjacentElement('afterend', topAlbumsContainer);
  topAlbumsContainer.insertAdjacentElement('beforebegin', topAlbumsHeader);
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
