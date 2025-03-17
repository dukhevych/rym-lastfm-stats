import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config = null;

export async function render(_config) {
  config = _config;

  if (!config) return;

  if (!config.lastfmApiKey) {
    console.error(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;

  if (!userName) {
    console.log("No Last.fm username found. Top Artists can't be displayed.");
    return;
  }

  addTopArtistsStyles();

  const topArtists = await api.fetchUserTopArtists(
    userName,
    config.lastfmApiKey,
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
    await browserAPI.storage.sync.set({
      topArtistsPeriod: event.target.value,
    });

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
  });

  populateTopArtists(topArtistsContainer, topArtists, userName);

  insertTopArtistsIntoDOM(topArtistsHeader, topArtistsContainer);
}

function addTopArtistsStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .top-artists {
      position: relative;
    }

    .artist-scrobbles {
      font-size: 0.8em;
      margin-left: 0.5em;
    }

    .top-artists::after {
      content: '';
      inset: 0;
      display: none;
      background: rgba(0,0,0,.5);
      position: absolute;
    }

    .top-artists.is-loading::after { display: block; }

    .top-artists-header {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .top-artists-header select { margin-left: auto; }

    #top-artists-period-label::before { content: '('; }
    #top-artists-period-label::after { content: ')'; }
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
    constants.PERIOD_OPTIONS,
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

function populateTopArtists(container, topArtists) {
  container.replaceChildren();
  topArtists.forEach((artist) => {
    const artistLink = createArtistLink(artist);
    container.appendChild(artistLink);
  });
}

function createArtistLink(artist) {
  const wrapper = document.createElement('div');
  const link = utils.createLink(
    utils.generateSearchUrl({ artist: artist.name }),
    artist.name,
    false,
  );
  link.classList.add('artist');

  wrapper.appendChild(link);

  const stats = '(' + artist.playcount + ' scrobbles)';
  const span = utils.createSpan(stats, stats);
  span.classList.add('artist-scrobbles');

  wrapper.appendChild(span);

  return wrapper;
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
