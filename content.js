function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num.toString();
  }
}

const extractData = () => {
  const entries = document.querySelectorAll('#user_list .main_entry');
  const title = document.querySelector('h1').textContent.trim();

  const data = [];

  entries.forEach((entry) => {
    const artist = entry.querySelector('.list_artist').textContent.trim();
    const release = entry.querySelector('.list_album').textContent.trim();
    const date = entry.querySelector('.rel_date').textContent.trim();

    const primaryGenres = [];
    const secondaryGenres = [];

    const primaryGenreElements = entry.querySelectorAll('.extra_metadata_genres');
    const secondaryGenreElements = entry.querySelectorAll('.extra_metadata_sec_genres');

    primaryGenreElements.forEach((genreElement, index) => {
      const genres = Array.from(genreElement.querySelectorAll('a')).map((genre) =>
        genre.textContent.trim(),
      );
      primaryGenres.push(...genres);
    });

    secondaryGenreElements.forEach((genreElement, index) => {
      const genres = Array.from(genreElement.querySelectorAll('a')).map((genre) =>
        genre.textContent.trim(),
      );
      secondaryGenres.push(...genres);
    });

    data.push({
      artist: artist,
      release_title: release,
      date: date,
      primary_genres: primaryGenres,
      secondary_genres: secondaryGenres,
    });
  });

  return { data, title };
}

const attachButton = () => {
  const viewsEl = document.querySelector('.page_list_note_num_views');

  // Create a new button element
  const button = document.createElement('button');

  // Set the button text
  button.textContent = 'Download as JSON';

  // Attach a click event listener to the button
  button.addEventListener('click', function() {
    const { data, title } = extractData();
    browser.runtime.sendMessage({ action: 'saveData', data: data, title: title });
  });

  viewsEl.parentNode.insertBefore(button, viewsEl);
}

// attachButton();

function parseArtistAndAlbum(metaContent) {
  const cleanContent = metaContent.replace(' - RYM/Sonemic', '');
  const parts = cleanContent.split(' by ');

  if (parts.length === 2) {
    return {
      releaseTitle: parts[0].trim(),
      artist: parts[1].trim()
    };
  } else {
    return {
      releaseTitle: null,
      artist: null
    };
  }
}

function getArtistAndAlbum() {
  const metaTag = document.querySelector('meta[property="og:title"]');
  if (metaTag) return parseArtistAndAlbum(metaTag.content);
  return { releaseTitle: null, artist: null };
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractData') {
    const { data, title } = extractData();
    sendResponse({ data, title });
  }
});

chrome.storage.sync.get(['lastfmUsername', 'lastfmApiKey'], function(items) {
  console.log('items', items);
  if (items.lastfmUsername && items.lastfmApiKey) {
    const { artist, releaseTitle } = getArtistAndAlbum();
    console.log(artist, releaseTitle);

    fetchReleaseStats(items.lastfmUsername, items.lastfmApiKey, {
      artist,
      releaseTitle,
    })
      .then(() => {
        setTimeout(() => {
          fetchArtistStats(items.lastfmUsername, items.lastfmApiKey, {
            artist,
          })
        }, 5000);
      });


  } else {
    console.log('Last.fm credentials not set. Please set them in the extension options.');
  }
});

function insertArtistStats({ playcount, listeners, userplaycount }, label = 'Last.fm Stats') {
  const infoTable = document.querySelector('.album_info tbody');

  if (infoTable) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    const td = document.createElement('td');

    th.classList.add('info_hdr');
    th.textContent = label;
    td.classList.add('release_pri_descriptors');
    td.colspan = "2";
    td.innerHTML = [playcount, listeners, userplaycount].map((stat) => formatNumber(parseInt(stat))).join(' | ');

    tr.appendChild(th);
    tr.appendChild(td);

    infoTable.appendChild(tr);
  }
}

function fetchReleaseStats(username, apiKey, {
  artist,
  releaseTitle,
}) {
  const baseUrl = 'http://ws.audioscrobbler.com/2.0/';
  const params = new URLSearchParams({
      method: 'album.getInfo',
      user: username,
      artist: artist,
      album: releaseTitle,
      api_key: apiKey,
      format: 'json'
  });
  const url = `${baseUrl}?${params.toString()}`;

  console.log('url', url);

  return fetch(url)
    .then(response => response.json())
    .then(data => {
      console.log(data);
      const { playcount, listeners, userplaycount } = data.album;
      insertArtistStats({
        playcount,
        listeners,
        userplaycount,
      }, 'Last.fm Album');
    })
    .catch(error => console.error('Error:', error));
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
      const { playcount, listeners, userplaycount } = data.artist.stats;
      insertArtistStats({
        playcount,
        listeners,
        userplaycount,
      }, 'Last.fm Artist');
    })
    .catch(error => console.error('Error:', error));
}