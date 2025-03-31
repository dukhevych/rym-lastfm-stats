import * as api from '@/helpers/api';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';

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

  addTopArtistsStyles();

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

  const topArtists = await api.fetchUserTopArtists(
    userName,
    config.lastfmApiKey,
    {
      limit: config.topArtistsLimit,
      period: config.topArtistsPeriod,
    },
  );

  populateTopArtists(topArtistsContainer, topArtists);
}

function addTopArtistsStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --gradient-angle: -45deg;
      --gradient-angle-abs: calc(max(var(--gradient-angle), var(--gradient-angle) * -1));
      --gradient-angle-sin-raw: sin(var(--gradient-angle-abs));
      --gradient-angle-sin: calc(max(var(--gradient-angle-sin-raw), var(--gradient-angle-sin-raw) * -1));
      --gradient-size: 40px;
    }

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

    @keyframes move-gradient {
      from {
        background-position: 0 0;
      }
      to {
        background-position: 56px 0;
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

      & > .loader {
        color: var(--clr-lastfm);
        width: 182px;
        min-height: calc(38px * ${config.topArtistsLimit});
        align-self: center;
      }
    }

    .top-artist {
      flex-grow;
      flex-shrink: 0;
      flex-basis: calc(var(--playcountPercentage) * 1%);
      min-width: calc(var(--playcountPercentage) * 1%);
      border-radius: 6px;
      position: relative;
      border-top: 5px solid;
      box-sizing: border-box;
      cursor: pointer;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      overflow: hidden;
      align-items: stretch;
      transition: all .15s ease-in-out;
      font-weight: bold;
      box-shadow: inset 0 5px 10px -5px rgba(0, 0, 0, .1), inset 0 -5px 10px -5px rgba(255, 255, 255, .05);
      will-change: background-color, border-color, transform;
      line-height: 1;

      background-color: hsl(var(--hue), 60%, 20%);
      border-color: rgba(0, 0, 0, 0.4);

      &:before {
        content: '';
        position: absolute;

        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background-image: repeating-linear-gradient(
          var(--gradient-angle),
          rgba(0, 0, 0, 7%),
          rgba(0, 0, 0, 7%) calc(var(--gradient-size) / 2),
          transparent calc(var(--gradient-size) / 2),
          transparent var(--gradient-size)
        );
        background-size: calc(var(--gradient-size) / var(--gradient-angle-sin)) 100%;
        background-position: 0 0;
      }

      &:hover:before {
        animation: move-gradient 2s linear infinite;
      }

      & > * {
        padding: 8px 15px 10px;
        position: relative;
        z-index: 1;
      }

      &:hover {
        background-color: hsl(var(--hue), 55%, 25%);
      }

      .artist-scrobbles {
        background-color: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
      }

      .artist-name {
        flex-grow: 1;
        text-align: left;
        text-decoration: none;
        color: inherit;
        text-shadow: 0 1px 1px rgba(0, 0, 0, .5);
      }

      &:hover { color: white; }
    }

    ${constants.LIGHT_THEME_CLASSES
      .map((themeClass) => '.' + themeClass + ' .top-artist')
      .join(',')
    } {
      background-color: hsl(var(--hue), 50%, 50%);

      &:hover {
        background-color: hsl(var(--hue), 55%, 60%);
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
      justify-content: space-between;

      & > div {
        display: flex;
        gap: 10px;
        align-items: stretch;
      }

      button, select { cursor: pointer; }

      button {
        background: var(--surface-primary);
        border-radius: 3px;
        padding: .15em .5em;
        color: var(--text-primary);
        border: 1px solid var(--ui-detail-neutral);
        font-size: 16px;
      }
    }

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
  topArtistsContainer.style.padding = '14px';

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
