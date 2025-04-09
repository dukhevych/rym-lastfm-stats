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

  if (!infoTable) return;

  const cacheTimeHint = timestamp ? `(as of ${new Date(timestamp).toLocaleDateString()})` : '';

  const td = infoTable.querySelector('#lastfm_data');

  td.textContent = '';

  td.style.display = 'flex';
  td.style.alignItems = 'center';

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

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.title = 'View on Last.fm';

  const lastfmIcon = document.createElement('img');
  lastfmIcon.src = browserAPI.runtime.getURL('images/lastfm-pic.png');

  lastfmIcon.alt = 'Last.fm';
  lastfmIcon.style.width = 'auto';
  lastfmIcon.style.height = '20px';
  lastfmIcon.style.display = 'block';

  link.appendChild(lastfmIcon);

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

  return td;
}

async function render(config) {
  if (!config) return;

  const artistNames = getArtistNames();
  const detectedArtist = artistNames[0];
  const detectedReleaseTitle = getReleaseTitle();

  const override = await utils.storageGet(window.location.href);

  let artist;
  let releaseTitle;

  if (override) {
    artist = override.artist;
    releaseTitle = override.releaseTitle;
  } else {
    artist = detectedArtist;
    releaseTitle = detectedReleaseTitle;
  }

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

  const td = populateReleaseStats(stats);

  if (td && config.lastfmApiKey) {
    const incorrectStatsWrapper = document.createElement('div');
    incorrectStatsWrapper.style.position = 'relative';
    incorrectStatsWrapper.style.marginLeft = 'auto';

    const searchLink = document.createElement('a');
    searchLink.href = '#';
    searchLink.textContent = 'Incorrect stats?';

    incorrectStatsWrapper.appendChild(searchLink);
    td.appendChild(incorrectStatsWrapper);

    const incorrectStatsPopup = document.createElement('div');
    incorrectStatsPopup.style.position = 'absolute';
    incorrectStatsPopup.style.top = '100%';
    incorrectStatsPopup.style.right = '0';
    incorrectStatsPopup.style.backgroundColor = 'black';
    incorrectStatsPopup.style.color = 'white';
    // incorrectStatsPopup.style.border = '1px solid #ccc';
    incorrectStatsPopup.style.padding = '10px';
    incorrectStatsPopup.style.display = 'none';
    incorrectStatsPopup.style.zIndex = '1000';
    incorrectStatsPopup.style.minWidth = '250px';

    incorrectStatsWrapper.appendChild(incorrectStatsPopup);

    searchLink.addEventListener('click', async (event) => {
      event.preventDefault();

      if (detectedArtist && detectedReleaseTitle) {
        const albums = await api.searchAlbum(
          config.lastfmApiKey,
          { artist: detectedArtist, albumTitle: detectedReleaseTitle },
        );

        if (albums && albums.results && albums.results.albummatches) {
          const { albummatches } = albums.results;
          const albumList = document.createElement('ul');
          albumList.style.listStyleType = 'none';
          albumList.style.padding = '0';
          albumList.style.margin = '0';

          albummatches.album.forEach((album) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${album.artist} - ${album.name}`;
            listItem.style.cursor = 'pointer';
            listItem.dataset.artist = album.artist;
            listItem.dataset.album = album.name;
            listItem.style.marginBottom = '5px';
            albumList.appendChild(listItem);
          });

          albumList.addEventListener('click', async (e) => {
            const selectedArtist = e.target.dataset.artist;
            const selectedAlbum = e.target.dataset.album;

            if (selectedArtist && selectedAlbum) {
              await utils.storageSet({
                [window.location.href]: {
                  artist: selectedArtist,
                  releaseTitle: selectedAlbum,
                },
              });
              alert('Saved!');

            }
            incorrectStatsPopup.style.display = 'none';
          });

          incorrectStatsPopup.innerHTML = '';
          incorrectStatsPopup.appendChild(albumList);
          incorrectStatsPopup.style.display = 'block';
        }

        console.log('Last.fm search results:', albums);
      }
    });
  }

}

export default {
  render,
  targetSelectors: [INFO_CONTAINER_SELECTOR, INFO_ARTISTS_SELECTOR, INFO_ALBUM_TITLE_SELECTOR],
};
