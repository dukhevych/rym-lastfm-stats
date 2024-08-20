document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('lastfmApiKey');
  const usernameInput = document.getElementById('lastfmUsername');
  const form = document.getElementById('form');
  const resultDiv = document.getElementById('result');

  // Load saved API key
  browser.storage.sync.get(['lastfmApiKey', 'lastfmUsername']).then((result) => {
    if (result.lastfmApiKey) {
      apiKeyInput.value = result.lastfmApiKey;
    }
    if (result.lastfmUsername) {
      usernameInput.value = result.lastfmUsername;
    }
  });

  apiKeyInput.addEventListener('input', () => {
    console.log(111);
    resultDiv.textContent = '';
  });

  usernameInput.addEventListener('input', () => {
    console.log(222);
    resultDiv.textContent = '';
  });

  // Save API key
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    try {
      resultDiv.textContent = 'Saving...';

      const apiKey = apiKeyInput.value.trim();
      const username = usernameInput.value.trim();

      Promise.all([
        browser.storage.sync.set({ lastfmUsername: username }),
        browser.storage.sync.set({ lastfmApiKey: apiKey }),
      ])
        .then(() => {
          resultDiv.textContent = 'Saved!';
        });
    } catch (error) {
      console.log(error);
    }
  });
});
