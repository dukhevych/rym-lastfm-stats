import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { getTopAlbums } from '@/api/getTopAlbums';
import type { TopAlbumsPeriod, TopAlbum } from '@/api/getTopAlbums';
import { createElement as h } from '@/helpers/utils';
import './topAlbums.css';

interface UIElements {
  topAlbumsHeader: HTMLElement;
  topAlbumsHeaderLeft: HTMLElement;
  topAlbumsHeaderRight: HTMLElement;
  topAlbumsPeriodLabel: HTMLElement;
  topAlbumsPeriodSwitcher: HTMLSelectElement;
  topAlbumsPeriodSaveButton: HTMLButtonElement;
  topAlbumsContainer: HTMLElement;
}

interface State {
  userName: string;
}

let uiElements = {} as UIElements;
let state = {} as State;

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config: ProfileOptions & { userName?: string };

async function handlePeriodChange(
  value: TopAlbumsPeriod,
) {
  uiElements.topAlbumsContainer.classList.add('is-loading');

  const topAlbumsResponse = await getTopAlbums({
    params: {
      username: state.userName,
      period: value,
    },
    apiKey: config.lastfmApiKey,
  });

  const data = topAlbumsResponse.topalbums.album;

  uiElements.topAlbumsPeriodLabel.textContent = constants.PERIOD_LABELS_MAP[value];
  uiElements.topAlbumsPeriodLabel.title = constants.PERIOD_LABELS_MAP[value];

  populateTopAlbums(data);
  uiElements.topAlbumsContainer.classList.remove('is-loading');
}

export async function render(_config: ProfileOptions & { userName?: string }) {
  config = _config;
  if (!config) return;
  if (!config.lastfmApiKey) {
    console.warn(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  state.userName = config.userName || await utils.getLastfmUserName();
  if (!state.userName) {
    console.warn("No Last.fm username found. Top Albums can't be displayed.");
    return;
  }

  initUI();

  let initialPeriod = config.topAlbumsPeriod;

  uiElements.topAlbumsPeriodSwitcher.addEventListener('change', async (event) => {
    const period: TopAlbumsPeriod = (event.target as HTMLSelectElement).value as TopAlbumsPeriod;

    uiElements.topAlbumsContainer.classList.add('is-loading');

    await handlePeriodChange(period);

    if (period !== initialPeriod) {
      uiElements.topAlbumsPeriodSaveButton.style.display = 'block';
    } else {
      uiElements.topAlbumsPeriodSaveButton.style.display = 'none';
    }
  });

  const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
  icon.classList.add('loader');

  uiElements.topAlbumsContainer.appendChild(icon);

  insertTopAlbumsIntoDOM();

  const updateAction = async () => {
    const topAlbumsResponse = await getTopAlbums({
      params: {
        username: state.userName,
        period: config.topAlbumsPeriod as TopAlbumsPeriod,
      },
      apiKey: config.lastfmApiKey,
    });

    const data = topAlbumsResponse.topalbums.album;

    populateTopAlbums(data);

    await utils.storageSet({
      topAlbumsCache: {
        data,
        timestamp: Date.now(),
        userName: state.userName,
        topAlbumsPeriod: config.topAlbumsPeriod,
      },
    }, 'local');
  }

  const { topAlbumsCache } = await utils.storageGet(['topAlbumsCache']);

  if (
    topAlbumsCache
    && topAlbumsCache.data
    && topAlbumsCache.timestamp
    && topAlbumsCache.userName === state.userName
  ) {
    if (
      ((Date.now() - topAlbumsCache.timestamp) > constants.TOP_ALBUMS_INTERVAL_MS)
      || topAlbumsCache.topAlbumsPeriod !== config.topAlbumsPeriod
    ) {
      await updateAction();
    } else {
      populateTopAlbums(topAlbumsCache.data);
    }
  } else {
    await updateAction();
  }
}

function initUI() {
  const periodLabel = constants.PERIOD_OPTIONS.find(
    (option) => option.value === config.topAlbumsPeriod,
  )?.label as string;

  uiElements.topAlbumsHeader = h('div', {
    className: ['bubble_header', 'top-albums-header'],
  });

  uiElements.topAlbumsHeaderLeft = h('div', {}, [
    'Top Albums',
    uiElements.topAlbumsPeriodLabel = h('span', {
      title: periodLabel,
      id: 'top-albums-period-label',
    }, periodLabel),
  ]);
  uiElements.topAlbumsHeaderRight = h('div', {}, [
    uiElements.topAlbumsPeriodSaveButton = h('button', {
      style: {
        display: 'none',
      },
      onClick: async () => {
        const selectedPeriod = uiElements.topAlbumsPeriodSwitcher.value;
        const selectedPeriodLabel = constants.PERIOD_LABELS_MAP[selectedPeriod];
        uiElements.topAlbumsPeriodLabel.textContent = selectedPeriodLabel;

        await utils.storageSet({
          topAlbumsPeriod: selectedPeriod,
        });

        config.topAlbumsPeriod = selectedPeriod;

        uiElements.topAlbumsPeriodSaveButton.style.display = 'none';
      }
    }, 'Save'),
    uiElements.topAlbumsPeriodSwitcher = utils.createSelect(
      constants.PERIOD_OPTIONS,
      config.topAlbumsPeriod,
    ),
  ]);

  uiElements.topAlbumsHeader.appendChild(uiElements.topAlbumsHeaderLeft);
  uiElements.topAlbumsHeader.appendChild(uiElements.topAlbumsHeaderRight);

  uiElements.topAlbumsContainer = h('div', {
    className: ['bubble_content', 'top-albums'],
  });
}

function populateTopAlbums(topAlbums: TopAlbum[]) {
  uiElements.topAlbumsContainer.replaceChildren();

  if (!topAlbums || !Array.isArray(topAlbums) || topAlbums.length === 0) {
    uiElements.topAlbumsContainer.classList.add('is-empty');
    return;
  } else {
    uiElements.topAlbumsContainer.classList.remove('is-empty');
  }

  topAlbums.forEach((album) => {
    const albumWrapper = createAlbumWrapper(album);
    uiElements.topAlbumsContainer.appendChild(albumWrapper);
  });
}

function createAlbumWrapper(album: TopAlbum) {
  return h('div', {
    className: ['album-wrapper'],
  }, [
    createAlbumCover(album),
    createAlbumInfo(album),
    createAlbumLink(album),
  ]);
}

function createAlbumCover(album: TopAlbum) {
  const cover = h('div', {
    className: ['album-image'],
  });

  const loader = h('div', {
    className: ['loader'],
  }, utils.createSvgUse('svg-loader-symbol', '0 0 300 150'));

  const img = h('img', {
    className: ['fade-in'],
    src: album.image[2]['#text'],
    onLoad: () => {
      loader.remove();
      img.classList.add('loaded');
    },
    onError: () => {
      loader.remove();
      img.classList.add('loaded');
      img.src = 'https://lastfm.freetls.fastly.net/i/u/avatar300s/c6f59c1e5e7240a4c0d427abd71f3dbb.jpg';
    },
  });

  cover.appendChild(loader);
  cover.appendChild(img);

  return cover;
}

function createAlbumInfo(album: TopAlbum) {
  return h('div', {
    className: ['album-details'],
  }, [
    createAlbumTitle(album),
    createAlbumArtist(album),
    createAlbumPlays(album),
  ]);
}

function createAlbumTitle(album: TopAlbum) {
  return h('a', {
    className: ['album-title'],
    href: utils.generateSearchUrl({
      artist: album.artist.name,
      releaseTitle: album.name,
    }),
    textContent: album.name,
    title: album.name,
  });
}

function createAlbumArtist(album: TopAlbum) {
  return h('a', {
    className: ['album-artist'],
    href: utils.generateSearchUrl({
      artist: album.artist.name,
    }),
    textContent: album.artist.name,
    title: album.artist.name,
  });
}

function createAlbumPlays(album: TopAlbum) {
  return h('span', {}, `${utils.formatNumber(album.playcount)} plays`);
}

function createAlbumLink(album: TopAlbum) {
  return h('a', {
    className: ['album-link'],
    href: utils.generateSearchUrl({
      artist: album.artist.name,
      releaseTitle: album.name,
    }),
  });
}

function insertTopAlbumsIntoDOM() {
  const profileContainer = document.querySelector(PROFILE_CONTAINER_SELECTOR)!;
  profileContainer.insertAdjacentElement('afterend', uiElements.topAlbumsContainer);
  uiElements.topAlbumsContainer.insertAdjacentElement('beforebegin', uiElements.topAlbumsHeader);
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
