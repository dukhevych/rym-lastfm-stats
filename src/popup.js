const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

document.getElementById('btn-options').addEventListener('click', () => {
  browserAPI.runtime.openOptionsPage();
  window.close();
});

document.getElementById('btn-sync-ratings').addEventListener('click', () => {
  window.open('https://rateyourmusic.com/music_export?sync');
  window.close();
});

document.getElementById('btn-patreon').addEventListener('click', () => {
  window.open('https://www.patreon.com/c/BohdanDukhevych');
  window.close();
});
