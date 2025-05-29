import * as utils from '@/helpers/utils.js';
import * as api from '@/helpers/api.js';
import { createElement as h } from '@/helpers/utils.js';

import '@/modules/release/releaseStats.css';

const ARTIST_CONTAINER_SELECTOR = '.artist_info_main';

function getArtist() {
  const artistNameHeader = document.querySelector('.artist_name_hdr');
  const artistNameSpan = artistNameHeader ? artistNameHeader.querySelector('span') : null;

  const directTextNodeContent = artistNameHeader ? artistNameHeader.childNodes[0].nodeValue.trim() : null;
  const spanTextContent = artistNameSpan ? artistNameSpan.textContent : null;

  return [directTextNodeContent, spanTextContent ?? directTextNodeContent];
}

const uiElements = {};

function prepareArtistStatsUI() {
  const infoBlock = document.querySelector(ARTIST_CONTAINER_SELECTOR);
  if (!infoBlock) return;

  uiElements.infoBlock = infoBlock;

  uiElements.statsList = h('ul', { className: 'list-stats' }, [
    uiElements.listeners = h('li', { className: 'is-listeners' }, 'listeners'),
    uiElements.playcount = h('li', { className: 'is-playcount' }, 'plays'),
    uiElements.userplaycount = h('li', { className: 'is-user-playcount' })
  ]);

  uiElements.lastfmLink = h(
    'a',
    {
      className: [ 'lastfm-link', 'is-localized' ],
      target: '_blank',
    },
    utils.createSvgUse('svg-lastfm-square-symbol')
  );

  uiElements.lastfmLink2 = h(
    'a',
    {
      className: [ 'lastfm-link', 'is-original' ],
      target: '_blank',
    },
    utils.createSvgUse('svg-lastfm-square-symbol')
  );

  uiElements.statsWrapper = h(
    'div',
    { className: ['list-stats-wrapper', 'is-loading'] },
    [uiElements.statsList, uiElements.lastfmLink, uiElements.lastfmLink2]
  );

  uiElements.heading = h('div', {
    className: 'info_hdr',
    id: 'lastfm_label',
  }, 'Last.fm');

  uiElements.content = h('div', {
    className: 'info_content',
  }, uiElements.statsWrapper);

  infoBlock.append(uiElements.heading, uiElements.content);
}

function populateArtistStats(
  { playcount, listeners, userplaycount, url, urlOriginal, artistName, artistNameLocalized, notFound },
  timestamp,
) {
  uiElements.statsWrapper.classList.remove('is-loading');

  if (notFound) {
    uiElements.statsWrapper.classList.add('not-found');
    return;
  }

  const isCombinedData = urlOriginal && artistName !== artistNameLocalized;

  if (isCombinedData) uiElements.heading.textContent += ' (combined)';

  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  if (listeners !== undefined) {
    uiElements.listeners.style.display = 'block';
    uiElements.listeners.dataset.value = utils.shortenNumber(parseInt(listeners));
    uiElements.listeners.title = `${listeners} listeners ${cacheTimeHint}`;
  } else {
    uiElements.listeners.style.display = 'none';
  }

  if (playcount !== undefined) {
    uiElements.playcount.style.display = 'block';
    uiElements.playcount.dataset.value = utils.shortenNumber(parseInt(playcount));
    uiElements.playcount.title = `${playcount}, ${parseInt(playcount / listeners)} per listener ${cacheTimeHint}`;
  } else {
    uiElements.playcount.style.display = 'none';
  }

  if (userplaycount !== undefined) {
    uiElements.userplaycount.style.display = 'block';
    uiElements.userplaycount.title = `${userplaycount} scrobbles`;
    uiElements.userplaycount.textContent = `My scrobbles: ${utils.shortenNumber(parseInt(userplaycount))}`;
  } else {
    uiElements.userplaycount.style.display = 'none';
  }

  if (url) {
    uiElements.lastfmLink.href = url;
    uiElements.lastfmLink.title = `View ${artistNameLocalized} on Last.fm`;
  } else {
    uiElements.lastfmLink.href = '';
    uiElements.lastfmLink.title = '';
  }

  if (isCombinedData) {
    uiElements.lastfmLink2.href = urlOriginal;
    uiElements.lastfmLink2.title = `View ${artistName} on Last.fm`;
  } else {
    uiElements.lastfmLink2.href = '';
    uiElements.lastfmLink2.title = '';
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

  prepareArtistStatsUI();

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
  let userplaycount;

  if (data1 && !data1.error) {
    playcount += +data1.artist.stats.playcount;
    listeners += +data1.artist.stats.listeners;

    if (data1.artist.stats.userplaycount) {
      userplaycount = 0;
      userplaycount += +data1.artist.stats.userplaycount;
    }
  }

  if (data2 && !data2.error) {
    if (data2.artist) {
      playcount += +data2.artist.stats.playcount;
      listeners += +data2.artist.stats.listeners;

      if (data2.artist.stats.userplaycount) {
        userplaycount = userplaycount || 0;
        userplaycount += +data2.artist.stats.userplaycount;
      }
    }
  }

  let url = !data1.error ? data1.artist.url : null;
  let urlOriginal = null;

  if (data2) {
    urlOriginal = !data2.error ? data2.artist.url : urlOriginal;
  }

  let notFound = false;

  notFound = (data1?.error && data2?.error) ? true : notFound;

  const stats = {
    playcount,
    listeners,
    userplaycount,
    url,
    urlOriginal,
    artistName,
    artistNameLocalized,
    notFound: notFound,
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
