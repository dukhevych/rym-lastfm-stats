import browser from 'webextension-polyfill';

const btnOptions = document.getElementById('btn-options');
if (btnOptions) {
  btnOptions.addEventListener('click', () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}

const btnSyncRatings = document.getElementById('btn-sync-ratings');
if (btnSyncRatings) {
  btnSyncRatings.addEventListener('click', () => {
    window.open('https://rateyourmusic.com/music_export?sync');
    window.close();
  });
}

const btnPatreon = document.getElementById('btn-patreon');
if (btnPatreon) {
  btnPatreon.addEventListener('click', () => {
    window.open('https://www.patreon.com/c/BohdanDukhevych');
    window.close();
  });
}
