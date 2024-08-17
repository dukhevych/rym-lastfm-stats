document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('lastfmApiKey');
  const usernameInput = document.getElementById('lastfmUsername');
  const saveButton = document.getElementById('saveButton');

  // Load saved API key
  browser.storage.sync.get(['lastfmApiKey', 'lastfmUsername']).then((result) => {
    if (result.lastfmApiKey) {
      apiKeyInput.value = result.lastfmApiKey;
    }
    if (result.lastfmUsername) {
      usernameInput.value = result.lastfmUsername;
    }
  });

  // Save API key
  saveButton.addEventListener('click', () => {
    try {
      // const apiKey = apiKeyInput.value.trim();
      const username = usernameInput.value.trim();
  
      // console.log(!!apiKey);
      console.log(!!username);

      if (username) {
        browser.storage.sync.set({ lastfmUsername: username }).then(() => {
          alert('Username saved successfully!');
        });
      }
      // if (apiKey) {
      //   alert('done');
      //   // browser.storage.sync.set({ lastfmApiKey: apiKey }).then(() => {
      //   //   alert('API key saved successfully!');
      //   // });
      //   // browser.storage.sync.set({ lastfmUsername: username }).then(() => {
      //   //   alert('Username saved successfully!');
      //   // });
      // } else {
      //   alert('Please enter a valid data.');
      // }
    } catch (error) {
      console.log(error);
    }
  });
});
