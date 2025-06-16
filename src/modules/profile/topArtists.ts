import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { createElement as h } from '@/helpers/utils';
import { getTopArtists } from '@/api/getTopArtists';
import type { TopArtistsPeriod, TopArtist } from '@/api/getTopArtists';

import './topArtists.css';

interface UIElements {
  topArtistsHeader: HTMLElement;
  topArtistsHeaderLeft: HTMLElement;
  topArtistsHeaderRight: HTMLElement;
  topArtistsPeriodLabel: HTMLElement;
  topArtistsPeriodSwitcher: HTMLSelectElement;
  topArtistsPeriodSaveButton: HTMLButtonElement;
  topArtistsContainer: HTMLElement;
}

interface State {
  userName: string;
}

interface TopArtistWithPercentage extends TopArtist {
  playcountPercentage: number;
  playcountPercentageAbsolute: number;
}

const uiElements = {} as UIElements;
const state = {} as State;

const PROFILE_CONTAINER_SELECTOR =
  '.bubble_header.profile_header + .bubble_content';

let config: ProfileOptions & { userName?: string };

export async function render(_config: ProfileOptions & { userName?: string }) {
  // SET CONFIG
  config = _config;
  if (!config) return;
  if (!config.lastfmApiKey) {
    console.warn(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  // SET PAGE DATA
  state.userName = config.userName || await utils.getLastfmUserName();
  if (!state.userName) {
    console.warn("No Last.fm username found. Top Artists can't be displayed.");
    return;
  }

  initUI();

  const icon = utils.createSvgUse('svg-loader-symbol', '0 0 300 150');
  icon.classList.add('loader');

  uiElements.topArtistsContainer.appendChild(icon);

  insertTopArtistsIntoDOM();

  const updateAction = async (value: TopArtistsPeriod) => {
    const topArtistsResponse = await getTopArtists({
      params: {
        username: state.userName,
        period: value || config.topArtistsPeriod as TopArtistsPeriod,
        limit: config.topArtistsLimit,
      },
      apiKey: config.lastfmApiKey,
    });

    const data = topArtistsResponse.topartists.artist;

    populateTopArtists(data);

    await utils.storageSet({
      topArtistsCache: {
        data: data,
        timestamp: Date.now(),
        period: config.topArtistsPeriod,
        userName: state.userName,
      },
    });
  }

  const { topArtistsCache } = await utils.storageGet(['topArtistsCache']);

  if (
    topArtistsCache
    && topArtistsCache.data
    && topArtistsCache.timestamp
    && topArtistsCache.userName === state.userName
  ) {
    if (
      ((Date.now() - topArtistsCache.timestamp) > constants.TOP_ARTISTS_INTERVAL_MS)
      || topArtistsCache.period !== config.topArtistsPeriod
    ) {
      await updateAction(config.topArtistsPeriod as TopArtistsPeriod);
    } else {
      populateTopArtists(topArtistsCache.data);
    }
  } else {
    await updateAction(config.topArtistsPeriod as TopArtistsPeriod);
  }
}

function initUI() {
  const periodLabel = constants.PERIOD_OPTIONS.find(
    (option) => option.value === config.topArtistsPeriod,
  )?.label as string;

  uiElements.topArtistsHeader = h('div', {
    className: ['bubble_header', 'top-artists-header'],
  });

  uiElements.topArtistsHeaderLeft = h('div',
    {},
    [
      'Top Artists',
      uiElements.topArtistsPeriodLabel = h('span', {
        title: periodLabel,
        id: 'top-artists-period-label',
      }, periodLabel),
    ]
  );

  uiElements.topArtistsHeaderRight = h('div', {},
    uiElements.topArtistsPeriodSaveButton = h('button', {
      style: {
        display: 'none',
      },
      onClick: async () => {
        const selectedPeriod = uiElements.topArtistsPeriodSwitcher.value;
        const selectedPeriodLabel = constants.PERIOD_LABELS_MAP[selectedPeriod];
        uiElements.topArtistsPeriodLabel.textContent = selectedPeriodLabel;

        await utils.storageSet({
          topArtistsPeriod: selectedPeriod,
        });

        config.topArtistsPeriod = selectedPeriod;

        uiElements.topArtistsPeriodSaveButton.style.display = 'none';
      }
    }, 'Save'),
    uiElements.topArtistsPeriodSwitcher = utils.createSelect(
      constants.PERIOD_OPTIONS,
      config.topArtistsPeriod,
      {
        onChange: async (event: Event) => {
          const period = (event.target as HTMLSelectElement).value as TopArtistsPeriod;

          uiElements.topArtistsContainer.classList.add('is-loading');

          const topArtistsResponse = await getTopArtists({
            params: {
              username: state.userName,
              period,
              limit: config.topArtistsLimit,
            },
            apiKey: config.lastfmApiKey,
          });

          const data = topArtistsResponse.topartists.artist;

          uiElements.topArtistsPeriodLabel.textContent =
            constants.PERIOD_LABELS_MAP[period];
          uiElements.topArtistsPeriodLabel.title = constants.PERIOD_LABELS_MAP[period];

          populateTopArtists(data);

          uiElements.topArtistsContainer.classList.remove('is-loading');

          if (period !== config.topArtistsPeriod) {
            uiElements.topArtistsPeriodSaveButton.style.display = 'block';
          } else {
            uiElements.topArtistsPeriodSaveButton.style.display = 'none';
          }
        }
      },
    ),
  );

  uiElements.topArtistsHeader.appendChild(uiElements.topArtistsHeaderLeft);
  uiElements.topArtistsHeader.appendChild(uiElements.topArtistsHeaderRight);

  uiElements.topArtistsContainer = h('div', {
    className: ['bubble_content', 'top-artists'],
  });

  uiElements.topArtistsContainer.style.setProperty('--config-top-artists-limit', String(config.topArtistsLimit));
}

function populateTopArtists(topArtists: TopArtist[]) {
  uiElements.topArtistsContainer.replaceChildren();

  if (!topArtists || !Array.isArray(topArtists) || topArtists.length === 0) {
    uiElements.topArtistsContainer.classList.add('is-empty');
    return;
  } else {
    uiElements.topArtistsContainer.classList.remove('is-empty');
  }

  const maxPlaycount = Math.max(...topArtists.map(artist => artist.playcount));
  const minPlaycount = Math.min(...topArtists.map(artist => artist.playcount));
  const playcountRange = maxPlaycount - minPlaycount;

  const topArtistsWithPercentage: TopArtistWithPercentage[] = topArtists.map(artist => ({
    ...artist,
    playcountPercentage: (artist.playcount / maxPlaycount) * 100,
    playcountPercentageAbsolute: playcountRange ? ((artist.playcount - minPlaycount) / playcountRange) * 100 : 0,
  }));

  topArtistsWithPercentage.forEach((artist, index) => {
    const artistLink = createArtistLink(artist);
    artistLink.classList.add('top-artists-fade-in');
    artistLink.style.animationDelay = `${index * 0.07}s`;
    uiElements.topArtistsContainer.appendChild(artistLink);
  });
}

const hueStart = 0;
const hueEnd = 240;

function createArtistTemplate() {
  return h('a', {
    className: ['top-artist'],
  }, [
    h('span', { className: ['artist-name'] }),
    h('span', { className: ['artist-scrobbles'] }),
  ]);
}

function populateArtistTemplate(artist: TopArtistWithPercentage, artistElement: HTMLAnchorElement) {
  artistElement.querySelector('.artist-name')!.textContent = artist.name;

  const playsText = artist.playcount + ` play${artist.playcount > 1 ? 's' : ''}`;
  artistElement.querySelector('.artist-scrobbles')!.textContent = playsText;

  const hue = Math.trunc(
    hueStart + (1 - artist.playcountPercentageAbsolute / 100) * (hueEnd - hueStart)
  );

  artistElement.style.setProperty('--hue', String(hue));
  artistElement.style.setProperty('--playcountPercentage', String(artist.playcountPercentage));

  artistElement.href = utils.generateSearchUrl({ artist: artist.name });
  artistElement.title = `Search ${artist.name} on RateYourMusic`;
}

const ARTIST_TEMPLATE = createArtistTemplate();

function createArtistLink(artist: TopArtistWithPercentage) {
  const artistElement = ARTIST_TEMPLATE.cloneNode(true) as typeof ARTIST_TEMPLATE;
  populateArtistTemplate(artist, artistElement);
  return artistElement;
}

function insertTopArtistsIntoDOM() {
  const profileContainer = document.querySelector(PROFILE_CONTAINER_SELECTOR)!;
  const topAlbumsContainer = document.querySelector('.top-albums');

  if (topAlbumsContainer) {
    topAlbumsContainer.insertAdjacentElement('afterend', uiElements.topArtistsContainer);
    uiElements.topArtistsContainer.insertAdjacentElement('beforebegin', uiElements.topArtistsHeader);
  } else {
    profileContainer.insertAdjacentElement('afterend', uiElements.topArtistsContainer);
    uiElements.topArtistsContainer.insertAdjacentElement('beforebegin', uiElements.topArtistsHeader);
  }
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
