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

attachButton();

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractData') {
    const { data, title } = extractData();
    sendResponse({ data, title });
  }
});

browser.storage.sync.get('lastfmApiKey').then((result) => {
  if (result.lastfmApiKey) {
      console.log('Last.fm API Key:', result.lastfmApiKey);
  }
});