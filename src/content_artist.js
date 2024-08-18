import * as utils from './utils.js';

// const extractData = () => {
//   const entries = document.querySelectorAll('#user_list .main_entry');
//   const title = document.querySelector('h1').textContent.trim();

//   const data = [];

//   entries.forEach((entry) => {
//     const artist = entry.querySelector('.list_artist').textContent.trim();
//     const release = entry.querySelector('.list_album').textContent.trim();
//     const date = entry.querySelector('.rel_date').textContent.trim();

//     const primaryGenres = [];
//     const secondaryGenres = [];

//     const primaryGenreElements = entry.querySelectorAll('.extra_metadata_genres');
//     const secondaryGenreElements = entry.querySelectorAll('.extra_metadata_sec_genres');

//     primaryGenreElements.forEach((genreElement, index) => {
//       const genres = Array.from(genreElement.querySelectorAll('a')).map((genre) =>
//         genre.textContent.trim(),
//       );
//       primaryGenres.push(...genres);
//     });

//     secondaryGenreElements.forEach((genreElement, index) => {
//       const genres = Array.from(genreElement.querySelectorAll('a')).map((genre) =>
//         genre.textContent.trim(),
//       );
//       secondaryGenres.push(...genres);
//     });

//     data.push({
//       artist: artist,
//       release_title: release,
//       date: date,
//       primary_genres: primaryGenres,
//       secondary_genres: secondaryGenres,
//     });
//   });

//   return { data, title };
// }

// const attachButton = () => {
//   const viewsEl = document.querySelector('.page_list_note_num_views');

//   // Create a new button element
//   const button = document.createElement('button');

//   // Set the button text
//   button.textContent = 'Download as JSON';

//   // Attach a click event listener to the button
//   button.addEventListener('click', function() {
//     const { data, title } = extractData();
//     browser.runtime.sendMessage({ action: 'saveData', data: data, title: title });
//   });

//   viewsEl.parentNode.insertBefore(button, viewsEl);
// }

// attachButton();

function parseArtist(metaContent) {
  const artist = metaContent.replace(' discography - RYM/Sonemic', '');
  return artist;
}

function getArtist() {
  const metaTag = document.querySelector('meta[property="og:title"]');
  if (metaTag) return parseArtist(metaTag.content);
  return null;
}

// browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'extractData') {
//     const { data, title } = extractData();
//     sendResponse({ data, title });
//   }
// });

chrome.storage.sync.get(['lastfmUsername', 'lastfmApiKey'], function(items) {
  if (items.lastfmUsername && items.lastfmApiKey) {
    const artist = getArtist();

    fetchArtistStats(items.lastfmUsername, items.lastfmApiKey, {
      artist,
    });
  } else {
    console.log('Last.fm credentials not set. Please set them in the extension options.');
  }
});

function insertArtistStats({ playcount, listeners, userplaycount, url }, label = 'Last.fm') {
  const infoBlock = document.querySelector('.artist_info_main');

  if (infoBlock) {
    const heading = document.createElement('div');
    heading.classList.add('info_hdr');
    heading.textContent = label;

    const content = document.createElement('div');
    content.classList.add('info_content');

    const playcountSpan = `<span title="${playcount} plays">${utils.formatNumber(parseInt(playcount))} plays</span>`;
    const listenersSpan = `<span title="${listeners} listeners">${utils.formatNumber(parseInt(listeners))} listeners</span>`;
    const userplaycountSpan = `<strong title="I listened ${userplaycount} times">My scrobbles: ${utils.formatNumber(parseInt(userplaycount))}</strong>`;

    const link = `<a href=${url} target="_blank">View on Last.fm</a>`;

    content.innerHTML = [listenersSpan, playcountSpan, userplaycountSpan, link].join('&nbsp;&nbsp;|&nbsp;&nbsp;');

    infoBlock.appendChild(heading);
    infoBlock.appendChild(content);
  }
}

function fetchArtistStats(username, apiKey, {
  artist,
}) {
  const baseUrl = 'http://ws.audioscrobbler.com/2.0/';
  const params = new URLSearchParams({
      method: 'artist.getInfo',
      user: username,
      artist: artist,
      api_key: apiKey,
      format: 'json'
  });
  const url = `${baseUrl}?${params.toString()}`;
  return fetch(url)
    .then(response => response.json())
    .then(data => {
      const {
        playcount,
        listeners,
        userplaycount,
      } = data.artist.stats;
      const { url } = data.artist;
      insertArtistStats({
        playcount,
        listeners,
        userplaycount,
        url,
      }, 'Last.fm');
    })
    .catch(error => console.error('Error:', error));
}
