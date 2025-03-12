import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

const META_TITLE_SELECTOR = 'meta[property="og:title"]';
const INFO_CONTAINER_SELECTOR = '.album_info tbody';

function parseArtistAndTitle(metaContent) {
  const cleanContent = metaContent.replace(' - RYM/Sonemic', '');
  const parts = cleanContent.split(' by ');

  if (parts.length === 2) {
    return {
      releaseTitle: parts[0].trim(),
      artist: parts[1].trim(),
    };
  } else {
    return {
      releaseTitle: null,
      artist: null,
    };
  }
}

function getArtistAndTitle() {
  const metaTag = document.querySelector(META_TITLE_SELECTOR);
  if (metaTag) return parseArtistAndTitle(metaTag.content);
  return { releaseTitle: null, artist: null };
}

function insertReleaseStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);
  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    th.classList.add('info_hdr');
    th.textContent = 'Last.fm';
    td.classList.add('release_pri_descriptors');
    td.colspan = '2';

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
    const link = utils.createLink(url, 'View on Last.fm');

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

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

async function render(config) {
  if (!config) return;

  const { artist, releaseTitle } = getArtistAndTitle();

  if (!artist || !releaseTitle) {
    console.error('No artist or release title found.');
    return;
  }

  const userName = config.lastfmUsername;
  const storageKey = `releaseStats_${artist}`;

  if (!config.lastfmApiKey) {
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        console.log('Inserting cached lastfm data:', data);

        insertReleaseStats(data, timestamp);
        return;
      }
    }
  }

  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  const releaseType = infoTable
    .querySelector('tr:nth-child(2) td')
    .textContent.toLowerCase();

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

  const { playcount, listeners, userplaycount, url } = data[releaseTypeDataMap[releaseType]];

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
  }

  if (!config.lastfmApiKey) {
    localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), data: stats }));
  }

  insertReleaseStats(stats);
}

export default {
  render,
  targetSelectors: [META_TITLE_SELECTOR, INFO_CONTAINER_SELECTOR],
};
