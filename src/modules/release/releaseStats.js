import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

const ALBUM_CONTAINER_SELECTOR = '.album_info tbody';
const ARTIST_NAME_SELECTOR = ALBUM_CONTAINER_SELECTOR + ' [itemprop="byArtist"] .artist';
const RELEASE_TITLE_SELECTOR = '.section_main_info .album_title';

const LASTFM_LINK_ID = 'lastfm-link';
const LOCALIZED_NAME_SELECTOR = '.subtext';

function getArtistsAndAlbum() {
  let artists = [];
  let releaseTitle;

  const artistNameNodes = document.querySelectorAll(ARTIST_NAME_SELECTOR);

  if (artistNameNodes && artistNameNodes.length > 0) {
    Array.from(artistNameNodes).forEach((node) => {
      const localizedNode = node.querySelector(LOCALIZED_NAME_SELECTOR);
      const localized = localizedNode ? localizedNode.textContent.replace(/^\[|\]$/g, '') : null;

      artists.push({
        name: utils.getDirectTextContent(node),
        get localized() {
          return localized || this.name;
        },
      });
    });
  }

  const releaseTitleNode = document.querySelector(RELEASE_TITLE_SELECTOR);

  if (releaseTitleNode) {
    releaseTitle = utils.getDirectTextContent(releaseTitleNode).trim();
  }

  return { releaseTitle, artists };
}

function prepareReleaseStatsNodes({ label = 'Last.fm', artist, releaseTitle }) {
  const infoTable = document.querySelector(ALBUM_CONTAINER_SELECTOR);

  if (!infoTable) { return; }

  const tr = document.createElement('tr');
  const th = document.createElement('th');
  const td = document.createElement('td');

  th.classList.add('info_hdr');
  th.textContent = label;
  td.classList.add('release_pri_descriptors');
  td.colspan = '2';

  const url = 'https://www.last.fm/music/' + encodeURIComponent(artist) + '/' + encodeURIComponent(releaseTitle);

  const link = utils.createLink(url, 'View on Last.fm', { id: LASTFM_LINK_ID });

  td.appendChild(link);

  tr.appendChild(th);
  tr.appendChild(td);

  infoTable.appendChild(tr);

  return td;
}

function injectReleaseStats(cell, { playcount, listeners, userplaycount, url }) {
  if (!cell) { return; }

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

  const linkNode = document.getElementById(LASTFM_LINK_ID);
  if (linkNode) {
    linkNode.setAttribute('href', url);
  } else {
    const link = utils.createLink(url, 'View on Last.fm');
    cell.appendChild(link);
  }

  const elements = [
    userplaycountSpan,
    playcountSpan,
    listenersSpan,
  ].filter((x) => x);

  elements.forEach((element) => {
    const separator = document.createElement('span');
    separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
    cell.prepend(separator);
    cell.prepend(element);
  });
}

async function render(config) {
  if (!config) return;

  const { artists, releaseTitle } = getArtistsAndAlbum();

  if (!artists || artists.length === 0 || !releaseTitle) {
    console.error('No artist or release title found.');
    return;
  }

  const cellNode = prepareReleaseStatsNodes({
    artist: artists[0].localized,
    releaseTitle,
  });

  if (!config.lastfmApiKey) {
    console.log(
      'Last.fm credentials not set. Please set Last.fm API Key in the extension options.',
    );
    return;
  }

  const userName = config.lastfmUsername;

  const data = await api.fetchReleaseStats(userName, config.lastfmApiKey, {
    artist: artists[0].localized,
    releaseTitle,
  });

  const { playcount, listeners, userplaycount, url } = data.album;

  injectReleaseStats(cellNode, {
    playcount,
    listeners,
    userplaycount,
    url,
  });
}

export default {
  render,
  targetSelectors: [
    ALBUM_CONTAINER_SELECTOR,
    ARTIST_NAME_SELECTOR,
    RELEASE_TITLE_SELECTOR,
  ],
};
