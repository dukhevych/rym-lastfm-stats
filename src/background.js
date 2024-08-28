import { downloadScrobbles } from '@/modules/scrobblesHistory';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('RYM Last.fm extension installed');
    browserAPI.runtime.openOptionsPage();
  }
  if (details.reason === 'update') {
    console.log('RYM Last.fm extension updated');
    browserAPI.runtime.openOptionsPage();
  }
});

browserAPI.action.onClicked.addListener(() => {
  browserAPI.runtime.openOptionsPage();
});

browserAPI.runtime.onMessage.addListener(async (message) => {
  if (message.action === 'downloadScrobbles') {
    await downloadScrobbles(
      message.apiKey,
      message.username,
      message.storageType,
      message.requestDelay,
      message.targetPages,
    );
  }
});
