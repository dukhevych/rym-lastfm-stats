const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('lastfmApiKey');
  const usernameInput = document.getElementById('lastfmUsername');
  const form = document.getElementById('form');
  const resultDiv = document.getElementById('result');

  browserAPI.storage.sync.get(['lastfmApiKey', 'lastfmUsername']).then((result) => {
    if (result.lastfmApiKey) {
      apiKeyInput.value = result.lastfmApiKey;
    }
    if (result.lastfmUsername) {
      usernameInput.value = result.lastfmUsername;
    }
  });

  apiKeyInput.addEventListener('input', () => {
    resultDiv.textContent = '';
  });

  usernameInput.addEventListener('input', () => {
    resultDiv.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      resultDiv.textContent = 'Saving...';

      const apiKey = apiKeyInput.value.trim();
      const username = usernameInput.value.trim();

      Promise.all([
        browserAPI.storage.sync.set({ lastfmUsername: username }),
        browserAPI.storage.sync.set({ lastfmApiKey: apiKey }),
      ])
        .then(() => {
          resultDiv.textContent = 'Saved!';
        })
        .catch((error) => {
          console.error('Error saving settings:', error);
          resultDiv.textContent = 'Error saving settings';
        });
    } catch (error) {
      console.log(error);
    }
  });
});
