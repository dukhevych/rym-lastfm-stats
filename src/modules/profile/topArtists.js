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

  populateTopArtists(topArtistsContainer, topArtists);

  insertTopArtistsIntoDOM(topArtistsHeader, topArtistsContainer);
}

function addTopArtistsStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .top-artists-fade-in {
      opacity: 0;
      animation: fadeIn 0.5s forwards;
    }

    .top-artists {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: start;
    }

    .top-artist {
      flex-grow;
      flex-shrink: 0;
      flex-basis: calc(var(--playcountPercentage) * 1%);
      min-width: calc(var(--playcountPercentage) * 1%);
      border-radius: 6px;
      position: relative;
      border-width: 0 15px 0 0;
      border-style: solid;
      padding: 10px 15px;
      box-sizing: border-box;
      cursor: pointer;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background-color .15s ease-in-out;
      font-weight: bold;

      background-color: hsl(var(--hue), 80%, 15%);
      border-color: hsl(var(--hue), 40%, 10%);

      &:hover {
        background-color: hsl(var(--hue), 80%, 20%);
      }

      a {
        flex-grow: 1;
        text-align: left;
        text-decoration: none;
        color: inherit;
      }
    }

    ${constants.LIGHT_THEME_CLASSES
      .map((themeClass) => '.' + themeClass + ' .top-artist')
      .join(',')
    } {
      background-color: hsl(var(--hue), 50%, 50%);
      border-color: hsl(var(--hue), 50%, 40%);

      &:hover {
        background-color: hsl(var(--hue), 50%, 70%);
      }
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

    ${constants.LIGHT_THEME_CLASSES
      .map((themeClass) => '.' + themeClass + ' .top-artists::after')
      .join(',')
    } {
      background: rgba(255,255,255,.5);
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

function createArtistLink(artist) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('top-artist');

  const hue = parseInt(
    hueStart + (1 - artist.playcountPercentageAbsolute / 100) * (hueEnd - hueStart)
  );
  wrapper.style.setProperty('--hue', hue);
  wrapper.style.setProperty('--playcountPercentage', artist.playcountPercentage);

  const link = utils.createLink(
    utils.generateSearchUrl({ artist: artist.name }),
    artist.name,
    false,
  );

  wrapper.appendChild(link);

  const stats = artist.playcount + ` play${artist.playcount > 1 ? 's' : ''}`;
  const span = utils.createSpan(stats, stats);
  span.classList.add('artist-scrobbles');

  wrapper.appendChild(span);

  wrapper.addEventListener('click', () => {
    window.location.href = link.href;
  });

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
