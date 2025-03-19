import deburr from 'lodash/deburr';
import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

const META_TITLE_SELECTOR = 'meta[property="og:title"]';
const ARTIST_CONTAINER_SELECTOR = '.artist_info_main';

function parseArtist(metaContent) {
  const artist = metaContent.replace(' discography - RYM/Sonemic', '');
  return deburr(artist);
}

function getArtist() {
  const metaTag = document.querySelector(META_TITLE_SELECTOR);
  if (metaTag) return parseArtist(metaTag.content);
  return null;
}

function insertArtistStats(
  { playcount, listeners, userplaycount, url },
  timestamp,
) {
  const infoBlock = document.querySelector(ARTIST_CONTAINER_SELECTOR);

  if (infoBlock) {
    const heading = document.createElement('div');
    heading.classList.add('info_hdr');
    heading.textContent = 'Last.fm';

    const content = document.createElement('div');
    content.classList.add('info_content');

    const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

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
        content.appendChild(separator);
      }
      content.appendChild(element);
    });

    infoBlock.appendChild(heading);
    infoBlock.appendChild(content);
  }
}

async function render(config) {
  if (!config) return;

  const artist = getArtist();

  if (!artist) {
    console.error('No artist found.');
    return;
  }

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;
  const storageKey = `artistStats_${artist}`;

  if (!config.lastfmApiKey) {
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        console.log('Inserting cached lastfm data:', data);

        insertArtistStats(data, timestamp);
        return;
      }
    }
  }

  console.log('Fetching lastfm data for', artist);

  const data = await api.fetchArtistStats(
    userName,
    config.lastfmApiKey || process.env.LASTFM_API_KEY,
    { artist },
  );

  const { playcount, listeners, userplaycount } = data.artist.stats;
  const { url } = data.artist;

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
  };

  if (!config.lastfmApiKey) {
    localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), data: stats }));
  }

  insertArtistStats(stats);
}

export default {
  render,
  targetSelectors: [META_TITLE_SELECTOR, ARTIST_CONTAINER_SELECTOR],
};
