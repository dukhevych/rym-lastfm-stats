const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('lastfmApiKey');
  const usernameInput = document.getElementById('lastfmUsername');
  const limitInput = document.getElementById('lastfmLimit');
  const form = document.getElementById('form');
  const resultDiv = document.getElementById('result');

  const rangeValue = form.querySelector("#lastfmLimitValue");
  const rangeInput = form.querySelector("#lastfmLimit");

  rangeValue.value = rangeInput.value;

  rangeInput.addEventListener("input", (event) => {
      rangeValue.value = event.target.value;
  });

  browserAPI.storage.sync.get(['lastfmApiKey', 'lastfmUsername', 'lastfmLimit']).then((result) => {
    if (result.lastfmApiKey) {
      apiKeyInput.value = result.lastfmApiKey;
    }
    if (result.lastfmUsername) {
      usernameInput.value = result.lastfmUsername;
    }
    rangeInput.value = result.lastfmLimit ?? 10;
    rangeValue.value = rangeInput.value;
  });

  apiKeyInput.addEventListener('input', () => {
    resultDiv.textContent = '';
  });

  usernameInput.addEventListener('input', () => {
    resultDiv.textContent = '';
  });

  limitInput.addEventListener('input', () => {
    resultDiv.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      resultDiv.textContent = 'Saving...';

      const apiKey = apiKeyInput.value.trim();
      const username = usernameInput.value.trim();
      const limit = parseInt(limitInput.value);

      Promise.all([
        browserAPI.storage.sync.set({ lastfmUsername: username }),
        browserAPI.storage.sync.set({ lastfmApiKey: apiKey }),
        browserAPI.storage.sync.set({ lastfmLimit: limit }),
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
