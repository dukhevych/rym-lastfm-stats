import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import svgLoader from '@/assets/icons/loader.svg?raw';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config = null;

async function handlePeriodChange(period, userName, apiKey, container, label) {
  container.classList.add('is-loading');

  const data = await api.fetchUserTopAlbums(
    userName,
    apiKey,
    {
      limit: config.topAlbumsLimit,
      period: period,
    },
  );

  label.textContent = constants.PERIOD_LABELS_MAP[period];
  label.title = constants.PERIOD_LABELS_MAP[period];

  populateTopAlbums(container, data);
  container.classList.remove('is-loading');
}

export async function render(_config) {
  config = _config;
  if (!config) return;

  if (!config.lastfmApiKey) return;

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;

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

  const {
    topAlbumsHeader,
    topAlbumsContainer,
    topAlbumsPeriodSwitcher,
    topAlbumsPeriodLabel,
  } = createTopAlbumsUI();

  topAlbumsPeriodSwitcher.addEventListener('change', async (event) => {
    await browserAPI.storage.sync.set({
      topAlbumsPeriod: event.target.value,
    });

    await handlePeriodChange(
      event.target.value,
      userName,
      config.lastfmApiKey,
      topAlbumsContainer,
      topAlbumsPeriodLabel,
    );
  });

  populateTopAlbums(topAlbumsContainer, topAlbums, userName);

  insertTopAlbumsIntoDOM(topAlbumsHeader, topAlbumsContainer);
}

function addTopAlbumsStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .top-albums {
      display: flex;
      flex-wrap: wrap;
      position: relative;
    }

    .top-albums::after {
      content: '';
      inset: 0;
      display: none;
      background: rgba(0,0,0,.5);
      position: absolute;
    }

    .top-albums.is-loading::after { display: block; }

    .top-albums-header {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .top-albums-header select { margin-left: auto; }

    #top-albums-period-label::before { content: '('; }
    #top-albums-period-label::after { content: ')'; }

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

    .top-albums .album-image {
      position: relative;

      img {
        display: block;
        width: 100%;
        height: auto;
      }

      .loader {
        position: absolute;
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;

        svg {
          height: 50px;
          width: 50px;
        }
      }
    }

    .fade-in {
      opacity: 0;
      transition: opacity 1s ease-in-out;
    }

    .fade-in.loaded {
      opacity: 1;
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

function createTopAlbumsUI() {
  const periodLabel = constants.PERIOD_OPTIONS.find(
    (option) => option.value === config.topAlbumsPeriod,
  )?.label;
  const topAlbumsHeader = document.createElement('div');
  topAlbumsHeader.classList.add('bubble_header');
  topAlbumsHeader.classList.add('top-albums-header');

  let headerText = 'Top Albums';

  const topAlbumsPeriodLabel = utils.createSpan(periodLabel, periodLabel);
  topAlbumsPeriodLabel.id = 'top-albums-period-label';

  topAlbumsHeader.textContent = headerText;

  topAlbumsHeader.appendChild(topAlbumsPeriodLabel);

  const topAlbumsPeriodSwitcher = utils.createSelect(
    constants.PERIOD_OPTIONS,
    config.topAlbumsPeriod,
  );

  topAlbumsHeader.appendChild(topAlbumsPeriodSwitcher);

  const topAlbumsContainer = document.createElement('div');
  topAlbumsContainer.classList.add('bubble_content', 'top-albums');
  topAlbumsContainer.style.padding = '14px';

  return {
    topAlbumsHeader,
    topAlbumsContainer,
    topAlbumsPeriodSwitcher,
    topAlbumsPeriodLabel,
  };
}

function populateTopAlbums(container, topAlbums) {
  container.replaceChildren();
  topAlbums.forEach((album) => {
    const albumWrapper = createAlbumWrapper(album);
    container.appendChild(albumWrapper);
  });
}

function createAlbumWrapper(album) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('album-wrapper');

  wrapper.appendChild(createAlbumCover(album));
  wrapper.appendChild(createAlbumInfo(album));
  wrapper.appendChild(createAlbumLink(album));

  return wrapper;
}

function createAlbumCover(album) {
  const cover = document.createElement('div');
  cover.classList.add('album-image');

  const img = document.createElement('img');
  img.classList.add('fade-in');

  const loader = document.createElement('div');
  loader.classList.add('loader');

  if (!document.getElementById('svg-loader-symbol')) {
    const svgSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgSymbol.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgSymbol.setAttribute('style', 'display:none;');

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgLoader, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;
    const symbolElement = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    symbolElement.setAttribute('id', 'svg-loader-symbol');
    symbolElement.setAttribute('viewBox', svgElement.getAttribute('viewBox'));
    symbolElement.innerHTML = svgElement.innerHTML;

    svgSymbol.appendChild(symbolElement);
    document.body.appendChild(svgSymbol);
  }

  const svgLoaderElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgLoaderElement.setAttribute('viewBox', '0 0 300 150');
  const useElement = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  useElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#svg-loader-symbol');
  svgLoaderElement.appendChild(useElement);
  loader.appendChild(svgLoaderElement);

  img.src = album.image[2]['#text'];
  img.onload = () => {
    loader.remove();
    img.classList.add('loaded');
  };

  img.onerror = () => {
    loader.remove();
    img.classList.add('loaded');
    img.src = 'https://lastfm.freetls.fastly.net/i/u/avatar300s/c6f59c1e5e7240a4c0d427abd71f3dbb.jpg';
  };

  cover.appendChild(loader);
  cover.appendChild(img);

  return cover;
}

function createAlbumInfo(album) {
  const infoWrapper = document.createElement('div');
  infoWrapper.classList.add('album-details');

  infoWrapper.appendChild(createAlbumTitle(album));
  infoWrapper.appendChild(createAlbumArtist(album));
  infoWrapper.appendChild(createAlbumPlays(album));

  return infoWrapper;
}

function createAlbumTitle(album) {
  const title = document.createElement('a');
  title.href = utils.generateSearchUrl({
    artist: album.artist.name,
    releaseTitle: album.name,
  }, config);
  title.textContent = album.name;
  title.title = album.name;
  title.classList.add('album-title');
  return title;
}

function createAlbumArtist(album) {
  const artist = document.createElement('a');
  artist.href = utils.generateSearchUrl({
    artist: album.artist.name,
  }, config);
  artist.textContent = album.artist.name;
  artist.title = album.artist.name;
  artist.classList.add('album-artist');
  return artist;
}

function createAlbumPlays(album) {
  const plays = document.createElement('span');
  plays.textContent = `${utils.formatNumber(album.playcount)} plays`;
  return plays;
}

function createAlbumLink(album) {
  const link = document.createElement('a');
  link.href = utils.generateSearchUrl({
    artist: album.artist.name,
    releaseTitle: album.name,
  }, config);
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
