import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const INFO_CONTAINER_SELECTOR = '.album_info tbody';
const INFO_ARTISTS_SELECTOR = '.album_info [itemprop="byArtist"] a';
const INFO_ALBUM_TITLE_SELECTOR = '.album_title';

function getArtistNames() {
  const artists = document.querySelectorAll(INFO_ARTISTS_SELECTOR);
  return Array.from(artists)
    .map((artist) => {
      const localizedName = artist.querySelector('.subtext');
      return localizedName ? localizedName.textContent.replace(/^\[|\]$/g, '') : artist.textContent;
    });
}

function getReleaseTitle() {
  const title = document.querySelector(INFO_ALBUM_TITLE_SELECTOR);
  if (!title) return null;
  return Array.from(title.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .join('');
}

function prepareReleaseStatsUI() {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');

    const td = document.createElement('td');
    td.id = 'lastfm_data';

    th.classList.add('info_hdr');
    th.textContent = 'Last.fm';
    td.classList.add('release_pri_descriptors');
    td.colspan = '2';
    td.textContent = 'Loading...';

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

function populateReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  if (infoTable) {
    const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

    const td = infoTable.querySelector('#lastfm_data');

    td.textContent = '';

    const listenersSpan =
      listeners !== undefined
        ? utils.createSpan(
            `${listeners} listeners ${cacheTimeHint}`,
            `${utils.shortenNumber(parseInt(listeners))} listeners`,
          )
        : null;
    const playcountSpan =
      playcount !== undefined
        ? utils.createSpan(
            `${playcount}, ${parseInt(playcount / listeners)} per listener ${cacheTimeHint}`,
            `${utils.shortenNumber(parseInt(playcount))} plays`,
          )
        : null;
    const userplaycountSpan =
      userplaycount !== undefined
        ? utils.createStrong(
            `${userplaycount} scrobbles`,
            `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`,
          )
        : null;
    // const link = utils.createLink(url, 'View on Last.fm');

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';

    const lastfmIcon = document.createElement('img');
    lastfmIcon.src = browserAPI.runtime.getURL('images/lastfm.png');

    lastfmIcon.alt = 'Last.fm';
    lastfmIcon.style.width = 'auto';
    lastfmIcon.style.height = '16px';

    link.appendChild(lastfmIcon);

    const searchLink = document.createElement('a');
    searchLink.href = '#';
    searchLink.textContent = 'Incorrect?';

    searchLink.addEventListener('click', (event) => {
      event.preventDefault();
      const artist = getArtistNames()[0];
      const releaseTitle = getReleaseTitle();

      if (artist && releaseTitle) {
        api.searchAlbum(
          null,
          null,
          { artist, albumTitle: releaseTitle },
        );
      }
    });


    const elements = [
      listenersSpan,
      playcountSpan,
      userplaycountSpan,
      link,
    ].filter((x) => x);

    elements.forEach((element, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
        td.appendChild(separator);
      }
      td.appendChild(element);
    });
  }
}

async function render(config) {
  if (!config) return;

  const artistNames = getArtistNames();
  const artist = artistNames[0];
  const releaseTitle = getReleaseTitle();

  if (!artist || !releaseTitle) {
    console.error('No artist or release title found.');
    return;
  }

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;
  const storageKey = `releaseStats_${artist}`;

  prepareReleaseStatsUI();

  if (!config.lastfmApiKey) {
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        console.log('Inserting cached lastfm data:', data);

        populateReleaseStats(data, timestamp);
        return;
      }
    }
  }

  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  const releaseType = infoTable
    .querySelector('tr:nth-child(2) td')
    .textContent.toLowerCase().split(', ')[0];

  const data = await api.fetchReleaseStats(
    userName,
    config.lastfmApiKey || process.env.LASTFM_API_KEY,
    {
      artist,
      releaseTitle,
      releaseType,
    }
  );

  const releaseTypeDataMap = {
    album: 'album',
    single: 'track',
  };

  const { playcount, listeners, userplaycount, url } = data[releaseTypeDataMap[releaseType] ?? 'album'];

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
  };

  if (!config.lastfmApiKey) {
    localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), data: stats }));
  }

  populateReleaseStats(stats);
}

export default {
  render,
  targetSelectors: [INFO_CONTAINER_SELECTOR, INFO_ARTISTS_SELECTOR, INFO_ALBUM_TITLE_SELECTOR],
};
