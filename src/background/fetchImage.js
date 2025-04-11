const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_IMAGE') {
    fetch(message.url, { mode: 'cors' })
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          sendResponse({ success: true, dataUrl: reader.result });
        };
        reader.onerror = (e) => {
          console.error(e);
          sendResponse({ success: false, error: 'Failed to read blob' });
        };
        reader.readAsDataURL(blob);
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message || 'Fetch error' });
      });

    return true;
  }
});
