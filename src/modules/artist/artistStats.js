import deburr from 'lodash/deburr';
import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';

const ARTIST_CONTAINER_SELECTOR = '.artist_info_main';

function getArtist() {
  const artistNameHeader = document.querySelector('.artist_name_hdr');
  const artistNameSpan = artistNameHeader ? artistNameHeader.querySelector('span') : null;

  const directTextNodeContent = artistNameHeader ? artistNameHeader.childNodes[0].nodeValue.trim() : null;
  const spanTextContent = artistNameSpan ? artistNameSpan.textContent : null;

  return [directTextNodeContent, spanTextContent ?? directTextNodeContent];
}

function prepareReleaseStatsUI() {
  const infoBlock = document.querySelector(ARTIST_CONTAINER_SELECTOR);

  if (infoBlock) {
    const heading = document.createElement('div');
    heading.classList.add('info_hdr');
    heading.textContent = 'Last.fm';
    heading.id = 'lastfm_label';

    const content = document.createElement('div');
    content.classList.add('info_content');
    content.textContent = 'Loading...';
    content.id = 'lastfm_data';

    infoBlock.appendChild(heading);
    infoBlock.appendChild(content);
  }
}

function populateArtistStats(
  { playcount, listeners, userplaycount, url, urlOriginal, artistName, artistNameLocalized },
  timestamp,
) {
  const infoBlock = document.querySelector(ARTIST_CONTAINER_SELECTOR);

  if (infoBlock) {
    const heading = infoBlock.querySelector('#lastfm_label');

    const isCombinedData = urlOriginal && artistName !== artistNameLocalized;

    if (isCombinedData) {
      heading.textContent += ' (combined)';
    }

    const content = infoBlock.querySelector('#lastfm_data');
    content.textContent = '';

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
    link.title = `View ${artistNameLocalized} on Last.fm`;

    let link2 = null;

    if (isCombinedData) {
      link2 = utils.createLink(urlOriginal, '(original name)');
      link2.title = `View ${artistName} on Last.fm`;
    }

    const elements = [
      listenersSpan,
      playcountSpan,
      userplaycountSpan,
      link,
      link2,
    ].filter((x) => x);

    elements.forEach((element, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.textContent = '\u00A0\u00A0|\u00A0\u00A0';
        content.appendChild(separator);
      }
      content.appendChild(element);
    });
  }
}

async function render(config) {
  if (!config) return;

  const [ artistName, artistNameLocalized ] = getArtist();

  if (!artistName) {
    console.error('No artist found.');
    return;
  }

  const userData = await utils.getSyncedUserData();
  const userName = userData?.name;
  const storageKey = `artistStats_${artistNameLocalized}`;

  prepareReleaseStatsUI();

  if (!config.lastfmApiKey) {
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      const cachedDate = new Date(timestamp).toDateString();
      const currentDate = new Date().toDateString();

      if (cachedDate === currentDate) {
        console.log('Inserting cached lastfm data:', data);

        populateArtistStats(data, timestamp);
        return;
      }
    }
  }

  const requests = [];

  const requestLocalized = api.fetchArtistStats(
    userName,
    config.lastfmApiKey || process.env.LASTFM_API_KEY,
    { artist: artistNameLocalized },
  );

  requests.push(requestLocalized);

  if (artistName !== artistNameLocalized) {
    const requestOriginalName = api.fetchArtistStats(
      userName,
      config.lastfmApiKey || process.env.LASTFM_API_KEY,
      { artist: artistName },
    );

    requests.push(requestOriginalName);
  }

  const [data1, data2] = await Promise.all(requests);

  let playcount = 0;
  let listeners = 0;
  let userplaycount = 0;

  playcount += +data1.artist.stats.playcount;
  listeners += +data1.artist.stats.listeners;
  userplaycount += +data1.artist.stats.userplaycount;

  if (data2 && data2.artist) {
    playcount += +data2.artist.stats.playcount;
    listeners += +data2.artist.stats.listeners;
    userplaycount += +data2.artist.stats.userplaycount;
  }

  const { url } = data1.artist;
  const { url: urlOriginal = null } = data2?.artist || {};

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
    urlOriginal,
    artistName,
    artistNameLocalized,
  };

  if (!config.lastfmApiKey) {
    localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), data: stats }));
  }

  populateArtistStats(stats);
}

export default {
  render,
  targetSelectors: [ARTIST_CONTAINER_SELECTOR],
};
