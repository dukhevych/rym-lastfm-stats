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

function insertDummyLink(artist, releaseTitle) {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    th.classList.add('info_hdr');
    th.textContent = 'Last.fm';
    td.classList.add('release_pri_descriptors');
    td.colspan = '2';

    const url =
      'https://www.last.fm/music/' +
      encodeURIComponent(artist) +
      '/' +
      encodeURIComponent(releaseTitle);

    const link = utils.createLink(url, 'View on Last.fm');

    td.appendChild(link);

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

function insertReleaseStats(
  { playcount, listeners, userplaycount, url },
  label = 'Last.fm',
) {
  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    th.classList.add('info_hdr');
    th.textContent = label;
    td.classList.add('release_pri_descriptors');
    td.colspan = '2';

    const listenersSpan =
      listeners !== undefined
        ? utils.createSpan(
            `${listeners} listeners`,
            `${utils.shortenNumber(parseInt(listeners))} listeners`,
          )
        : null;
    const playcountSpan =
      playcount !== undefined
        ? utils.createSpan(
            `${playcount}, ${parseInt(playcount / listeners)} per listener`,
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

  if (!config.lastfmApiKey) {
    insertDummyLink(artist, releaseTitle);
    console.log(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userName = config.lastfmUsername;

  const infoTable = document.querySelector(INFO_CONTAINER_SELECTOR);

  const releaseType = infoTable.querySelector('tr:nth-child(2) td').textContent.toLowerCase();

  const data = await api.fetchReleaseStats(userName, config.lastfmApiKey, {
    artist,
    releaseTitle,
    releaseType,
  });

  const releaseTypeDataMap = {
    album: 'album',
    single: 'track',
  };

  const { playcount, listeners, userplaycount, url } = data[releaseTypeDataMap[releaseType]];

  insertReleaseStats({
    playcount,
    listeners,
    userplaycount,
    url,
  });
}

export default {
  render,
  targetSelectors: [META_TITLE_SELECTOR, INFO_CONTAINER_SELECTOR],
};
