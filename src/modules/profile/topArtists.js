import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

import './topArtists.css';

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config = null;

export async function render(_config, _userName) {
  config = _config;

  if (!config) return;

  if (!config.lastfmApiKey) {
    console.error(
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
    console.log("No Last.fm username found. Top Artists can't be displayed.");
    return;
  }

  const {
    topArtistsHeader,
    topArtistsContainer,
    topArtistsPeriodSwitcher,
    topArtistsPeriodSaveButton,
    topArtistsPeriodLabel,
  } = createTopArtistsUI();

  topArtistsPeriodSaveButton.addEventListener('click', async () => {
    const selectedPeriod = topArtistsPeriodSwitcher.value;
    const selectedPeriodLabel = constants.PERIOD_LABELS_MAP[selectedPeriod];
    topArtistsPeriodLabel.textContent = selectedPeriodLabel;

    await utils.storageSet({
      topArtistsPeriod: selectedPeriod,
    });

    topArtistsPeriodSaveButton.style.display = 'none';
  });

  let initialPeriod = config.topArtistsPeriod;

  topArtistsPeriodSwitcher.addEventListener('change', async (event) => {
    const period = event.target.value;

    topArtistsContainer.classList.add('is-loading');

    const data = await api.fetchUserTopArtists(
      userName,
      config.lastfmApiKey,
      {
        limit: config.topArtistsLimit,
        period: period,
      },
    );

    topArtistsPeriodLabel.textContent =
      constants.PERIOD_LABELS_MAP[period];
    topArtistsPeriodLabel.title = constants.PERIOD_LABELS_MAP[period];

    populateTopArtists(topArtistsContainer, data);

    topArtistsContainer.classList.remove('is-loading');

    if (period !== initialPeriod) {
      topArtistsPeriodSaveButton.style.display = 'block';
    } else {
      topArtistsPeriodSaveButton.style.display = 'none';
    }
  });

  const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
  icon.classList.add('loader');

  topArtistsContainer.appendChild(icon);

  insertTopArtistsIntoDOM(topArtistsHeader, topArtistsContainer);

  const updateAction = async () => {
    const topArtists = await api.fetchUserTopArtists(
      userName,
      config.lastfmApiKey,
      {
        limit: config.topArtistsLimit,
        period: config.topArtistsPeriod,
      },
    );

    populateTopArtists(topArtistsContainer, topArtists);

    await utils.storageSet({
      topArtistsCache: {
        data: topArtists,
        timestamp: Date.now(),
        userName,
      },
    });
  }

  const { topArtistsCache } = await utils.storageGet(['topArtistsCache']);

  if (
    topArtistsCache
    && topArtistsCache.data
    && topArtistsCache.timestamp
    && topArtistsCache.userName === userName
  ) {
    if (
      Date.now() - topArtistsCache.timestamp >
      constants.TOP_ARTISTS_INTERVAL_MS
    ) {
      await updateAction();
    } else {
      populateTopArtists(topArtistsContainer, topArtistsCache.data, userName);
    }
  } else {
    await updateAction();
  }
}

function createTopArtistsUI() {
  const periodLabel = constants.PERIOD_OPTIONS.find(
    (option) => option.value === config.topArtistsPeriod,
  )?.label;
  const topArtistsHeader = document.createElement('div');
  topArtistsHeader.classList.add('bubble_header');
  topArtistsHeader.classList.add('top-artists-header');

  const topArtistsHeaderLeft = document.createElement('div');
  const topArtistsHeaderRight = document.createElement('div');

  topArtistsHeaderLeft.textContent = 'Top Artists';

  const topArtistsPeriodLabel = utils.createSpan(periodLabel, periodLabel);
  topArtistsPeriodLabel.id = 'top-artists-period-label';

  topArtistsHeaderLeft.appendChild(topArtistsPeriodLabel);

  const topArtistsPeriodSaveButton = document.createElement('button');
  topArtistsPeriodSaveButton.textContent = 'Save';

  topArtistsHeaderRight.appendChild(topArtistsPeriodSaveButton);
  topArtistsPeriodSaveButton.style.display = 'none';

  const topArtistsPeriodSwitcher = utils.createSelect(
    constants.PERIOD_OPTIONS,
    config.topArtistsPeriod,
  );

  topArtistsHeaderRight.appendChild(topArtistsPeriodSwitcher);

  topArtistsHeader.appendChild(topArtistsHeaderLeft);
  topArtistsHeader.appendChild(topArtistsHeaderRight);

  const topArtistsContainer = document.createElement('div');
  topArtistsContainer.classList.add('bubble_content', 'top-artists');
  topArtistsContainer.style.setProperty('--config-top-artists-limit', config.topArtistsLimit);

  return {
    topArtistsHeader,
    topArtistsContainer,
    topArtistsPeriodSwitcher,
    topArtistsPeriodSaveButton,
    topArtistsPeriodLabel,
  };
}

function populateTopArtists(container, topArtists) {
  container.replaceChildren();
  const maxPlaycount = Math.max(...topArtists.map(artist => artist.playcount));
  const minPlaycount = Math.min(...topArtists.map(artist => artist.playcount));
  const playcountRange = maxPlaycount - minPlaycount;

  const topArtistsWithPercentage = topArtists.map(artist => ({
    ...artist,
    playcountPercentage: (artist.playcount / maxPlaycount) * 100,
    playcountPercentageAbsolute: playcountRange ? ((artist.playcount - minPlaycount) / playcountRange) * 100 : 0,
  }));

  topArtistsWithPercentage.forEach((artist, index) => {
    const artistLink = createArtistLink(artist);
    artistLink.classList.add('top-artists-fade-in');
    artistLink.style.animationDelay = `${index * 0.07}s`;
    container.appendChild(artistLink);
  });
}

// TODO - add theme-based color range
const hueStart = 0;
const hueEnd = 240;

function createArtistTemplate() {
  const wrapper = document.createElement('a');
  wrapper.classList.add('top-artist');

  const artistName = document.createElement('span');
  artistName.classList.add('artist-name');
  wrapper.appendChild(artistName);

  const playcount = document.createElement('span');
  playcount.classList.add('artist-scrobbles');
  wrapper.appendChild(playcount);

  return wrapper;
}

function populateArtistTemplate(artist, artistElement) {
  artistElement.querySelector('.artist-name').textContent = artist.name;

  const playsText = artist.playcount + ` play${artist.playcount > 1 ? 's' : ''}`;
  artistElement.querySelector('.artist-scrobbles').textContent = playsText;

  const hue = parseInt(
    hueStart + (1 - artist.playcountPercentageAbsolute / 100) * (hueEnd - hueStart)
  );

  artistElement.style.setProperty('--hue', hue);
  artistElement.style.setProperty('--playcountPercentage', artist.playcountPercentage);

  artistElement.href = utils.generateSearchUrl({ artist: artist.name });
  artistElement.title = `Search ${artist.name} on RateYourMusic`;
}

const ARTIST_TEMPLATE = createArtistTemplate();

function createArtistLink(artist) {
  const artistElement = ARTIST_TEMPLATE.cloneNode(true);
  populateArtistTemplate(artist, artistElement);
  return artistElement;
}

function insertTopArtistsIntoDOM(topArtistsHeader, topArtistsContainer) {
  const profileContainer = document.querySelector(PROFILE_CONTAINER_SELECTOR);
  const topAlbumsContainer = document.querySelector('.top-albums');

  if (topAlbumsContainer) {
    topAlbumsContainer.insertAdjacentElement('afterend', topArtistsContainer);
    topArtistsContainer.insertAdjacentElement('beforebegin', topArtistsHeader);
  } else {
    profileContainer.insertAdjacentElement('afterend', topArtistsContainer);
    topArtistsContainer.insertAdjacentElement('beforebegin', topArtistsHeader);
  }
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
