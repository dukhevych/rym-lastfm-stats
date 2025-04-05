import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

import './topAlbums.css';

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

  let userName;

  if (config.userName) {
    userName = config.userName;
  } else {
    const userData = await utils.getSyncedUserData();
    userName = userData?.name;
  }

  if (!userName) {
    console.log("No Last.fm username found. Top Albums can't be displayed.");
    return;
  }

  const {
    topAlbumsHeader,
    topAlbumsContainer,
    topAlbumsPeriodSwitcher,
    topAlbumsPeriodSaveButton,
    topAlbumsPeriodLabel,
  } = createTopAlbumsUI();

  topAlbumsPeriodSaveButton.addEventListener('click', async () => {
    const selectedPeriod = topAlbumsPeriodSwitcher.value;
    const selectedPeriodLabel = constants.PERIOD_LABELS_MAP[selectedPeriod];
    topAlbumsPeriodLabel.textContent = selectedPeriodLabel;

    await utils.storageSet({
      topAlbumsPeriod: selectedPeriod,
    });

    topAlbumsPeriodSaveButton.style.display = 'none';
  });

  let initialPeriod = config.topAlbumsPeriod;

  topAlbumsPeriodSwitcher.addEventListener('change', async (event) => {
    const period = event.target.value;

    topAlbumsContainer.classList.add('is-loading');

    await handlePeriodChange(
      event.target.value,
      userName,
      config.lastfmApiKey,
      topAlbumsContainer,
      topAlbumsPeriodLabel,
    );

    if (period !== initialPeriod) {
      topAlbumsPeriodSaveButton.style.display = 'block';
    } else {
      topAlbumsPeriodSaveButton.style.display = 'none';
    }
  });

  const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
  icon.classList.add('loader');

  topAlbumsContainer.appendChild(icon);

  insertTopAlbumsIntoDOM(topAlbumsHeader, topAlbumsContainer);

  const updateAction = async () => {
    const topAlbums = await api.fetchUserTopAlbums(
      userName,
      config.lastfmApiKey,
      {
        period: config.topAlbumsPeriod,
      },
    );

    populateTopAlbums(topAlbumsContainer, topAlbums, userName);

    await utils.storageSet({
      topAlbumsCache: {
        data: topAlbums,
        timestamp: Date.now(),
        userName,
      },
    });
  }

  const { topAlbumsCache } = await utils.storageGet(['topAlbumsCache']);

  if (
    topAlbumsCache
    && topAlbumsCache.data
    && topAlbumsCache.timestamp
    && topAlbumsCache.userName === userName
  ) {
    if (
      Date.now() - topAlbumsCache.timestamp >
      constants.TOP_ALBUMS_INTERVAL_MS
    ) {
      await updateAction();
    } else {
      populateTopAlbums(topAlbumsContainer, topAlbumsCache.data, userName);
    }
  } else {
    await updateAction();
  }
}

function createTopAlbumsUI() {
  const periodLabel = constants.PERIOD_OPTIONS.find(
    (option) => option.value === config.topAlbumsPeriod,
  )?.label;
  const topAlbumsHeader = document.createElement('div');
  topAlbumsHeader.classList.add('bubble_header');
  topAlbumsHeader.classList.add('top-albums-header');

  const topAlbumsHeaderLeft = document.createElement('div');
  const topAlbumsHeaderRight = document.createElement('div');

  topAlbumsHeaderLeft.textContent = 'Top Albums';

  const topAlbumsPeriodLabel = utils.createSpan(periodLabel, periodLabel);
  topAlbumsPeriodLabel.id = 'top-albums-period-label';

  topAlbumsHeaderLeft.appendChild(topAlbumsPeriodLabel);

  const topAlbumsPeriodSaveButton = document.createElement('button');
  topAlbumsPeriodSaveButton.textContent = 'Save';

  topAlbumsHeaderRight.appendChild(topAlbumsPeriodSaveButton);
  topAlbumsPeriodSaveButton.style.display = 'none';

  const topAlbumsPeriodSwitcher = utils.createSelect(
    constants.PERIOD_OPTIONS,
    config.topAlbumsPeriod,
  );

  topAlbumsHeaderRight.appendChild(topAlbumsPeriodSwitcher);

  topAlbumsHeader.appendChild(topAlbumsHeaderLeft);
  topAlbumsHeader.appendChild(topAlbumsHeaderRight);

  const topAlbumsContainer = document.createElement('div');
  topAlbumsContainer.classList.add('bubble_content', 'top-albums');

  return {
    topAlbumsHeader,
    topAlbumsContainer,
    topAlbumsPeriodSwitcher,
    topAlbumsPeriodSaveButton,
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

  const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
  loader.appendChild(icon);

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
