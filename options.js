document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('lastfmApiKey');
  const saveButton = document.getElementById('saveButton');

  // Load saved API key
  browser.storage.sync.get('lastfmApiKey').then((result) => {
      if (result.lastfmApiKey) {
          apiKeyInput.value = result.lastfmApiKey;
      }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
      const apiKey = apiKeyInput.value.trim();
      if (apiKey) {
          browser.storage.sync.set({ lastfmApiKey: apiKey }).then(() => {
              alert('API key saved successfully!');
          });
      } else {
          alert('Please enter a valid API key.');
      }
  });
});
