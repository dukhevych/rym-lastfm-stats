import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config = null;

export async function render(_config) {
  config = _config;

  if (!config) return;

  const apiKey = config.lastfmApiKey || window.LASTFM_API_KEY;

  if (!apiKey) {
    console.error(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userName = utils.getUserName(config);

  if (!userName) {
    console.log("No Last.fm username found. Top Artists can't be displayed.");
    return;
  }

  addTopArtistsStyles();

  const topArtists = await api.fetchUserTopArtists(
    userName,
    apiKey,
    {
      limit: config.topArtistsLimit,
      period: config.topArtistsPeriod,
    },
  );

  const {
    topArtistsHeader,
    topArtistsContainer,
    topArtistsPeriodSwitcher,
    topArtistsPeriodLabel,
  } = createTopArtistsUI();

  topArtistsPeriodSwitcher.addEventListener('change', async (event) => {
    const period = event.target.value;

    topArtistsContainer.classList.add('is-loading');

    const data = await api.fetchUserTopArtists(
      userName,
      apiKey,
      {
        limit: config.topArtistsLimit,
        period: period,
      },
    );

    topArtistsPeriodLabel.textContent =
      constants.PERIOD_LABELS_MAP[period];
    topArtistsPeriodLabel.title = constants.PERIOD_LABELS_MAP[period];

    populateTopArtists(topArtistsContainer, data, userName);

    topArtistsContainer.classList.remove('is-loading');
  });

  populateTopArtists(topArtistsContainer, topArtists, userName);

  insertTopArtistsIntoDOM(topArtistsHeader, topArtistsContainer);
}

function addTopArtistsStyles() {
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

function createTopArtistsUI() {
  const periodLabel = constants.PERIOD_OPTIONS.find(
    (option) => option.value === config.topArtistsPeriod,
  )?.label;
  const topArtistsHeader = document.createElement('div');
  topArtistsHeader.classList.add('bubble_header');
  topArtistsHeader.classList.add('top-artists-header');

  let headerText = 'Top Artists';

  const topArtistsPeriodLabel = utils.createSpan(periodLabel, periodLabel);
  topArtistsPeriodLabel.id = 'top-artists-period-label';

  topArtistsHeader.textContent = headerText;

  topArtistsHeader.appendChild(topArtistsPeriodLabel);

  const topArtistsPeriodSwitcher = utils.createSelect(
    constants.TOP_ARTISTS_PERIOD_OPTIONS,
    config.topArtistsPeriod,
  );

  topArtistsHeader.appendChild(topArtistsPeriodSwitcher);

  const topArtistsContainer = document.createElement('div');
  topArtistsContainer.classList.add('bubble_content', 'top-artists');
  topArtistsContainer.style.padding = '14px';

  return {
    topArtistsHeader,
    topArtistsContainer,
    topArtistsPeriodSwitcher,
    topArtistsPeriodLabel,
  };
}

function populateTopArtists(container, topArtists, userName) {
  container.replaceChildren();
  topArtists.forEach((album) => {
    const albumWrapper = createArtistWrapper(album, userName);
    container.appendChild(albumWrapper);
  });
}

function createArtistWrapper(album, userName) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('album-wrapper');

  wrapper.appendChild(createArtistCover(album));
  wrapper.appendChild(createArtistInfo(album, userName));
  wrapper.appendChild(createArtistLink(album));

  return wrapper;
}

function createArtistCover(album) {
  const cover = document.createElement('div');
  cover.classList.add('album-image');
  const img = document.createElement('img');
  img.src = album.image[2]['#text'];
  cover.appendChild(img);
  return cover;
}

function createArtistInfo(album, userName) {
  const infoWrapper = document.createElement('div');
  infoWrapper.classList.add('album-details');

  infoWrapper.appendChild(createArtistTitle(album));
  infoWrapper.appendChild(createArtistArtist(album));
  infoWrapper.appendChild(createArtistPlays(album, userName));

  return infoWrapper;
}

function createArtistTitle(album) {
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

function createArtistArtist(album) {
  const artist = document.createElement('a');
  artist.href = utils.generateSearchUrl({
    artist: album.artist.name,
  }, config);
  artist.textContent = album.artist.name;
  artist.title = album.artist.name;
  artist.classList.add('album-artist');
  return artist;
}

function createArtistPlays(album) {
  const plays = document.createElement('span');
  plays.textContent = `${utils.formatNumber(album.playcount)} plays`;
  return plays;
}

function createArtistLink(album) {
  const link = document.createElement('a');
  link.href = utils.generateSearchUrl({
    artist: album.artist.name,
    releaseTitle: album.name,
  }, config);
  link.classList.add('album-link');
  return link;
}

function insertTopArtistsIntoDOM(topArtistsHeader, topArtistsContainer) {
  const profileContainer = document.querySelector(PROFILE_CONTAINER_SELECTOR);
  profileContainer.insertAdjacentElement('afterend', topArtistsContainer);
  topArtistsContainer.insertAdjacentElement('beforebegin', topArtistsHeader);
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
