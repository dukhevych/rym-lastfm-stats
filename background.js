browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveData") {
      const blob = new Blob([JSON.stringify(message.data, null, 4)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      browser.downloads.download({
          url: url,
          filename: `${message.title}.json`,
          saveAs: true
      });
  }
});
