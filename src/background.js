const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log("RYM Last.fm extension installed");
    browserAPI.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    console.log("RYM Last.fm extension updated");
    browserAPI.runtime.openOptionsPage();
  }
});

browserAPI.action.onClicked.addListener(() => {
  browserAPI.runtime.openOptionsPage();
});
