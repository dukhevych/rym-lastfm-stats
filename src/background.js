browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log("RYM Last.fm extension installed");
    browser.runtime.openOptionsPage();
  }
});

browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
