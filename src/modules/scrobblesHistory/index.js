import * as utils from '@/helpers/utils';

// Constants
const API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const TRACKS_PER_PAGE = 200;
const DB_NAME = 'LastFmScrobbles';
const STORE_NAME = 'scrobbles';

// Utility functions
const csvEscape = (str) =>
  typeof str === 'string' ? str.replace(/[",]/g, '') : str;

const arrayToCsv = (array) => array.map(csvEscape).join(',');

// Last.fm API functions
const lastFmRequest = async (params) => {
  const url = new URL(API_BASE_URL);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.append(key, value),
  );

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.text();
};

const getPageCount = async (apiKey, username) => {
  const params = {
    method: 'user.getrecenttracks',
    user: username,
    api_key: apiKey,
    limit: TRACKS_PER_PAGE,
    page: 1,
    format: 'json',
  };

  const data = await lastFmRequest(params);
  const json = JSON.parse(data);
  return parseInt(json.recenttracks['@attr'].totalPages, 10);
};

const getTracks = async (apiKey, username, page) => {
  const params = {
    method: 'user.getrecenttracks',
    user: username,
    api_key: apiKey,
    limit: TRACKS_PER_PAGE,
    page,
    format: 'json',
  };

  const data = await lastFmRequest(params);
  const json = JSON.parse(data);

  const result = [];

  json.recenttracks.track.forEach((track) => {
    if (!track.date) return;

    result.push({
      artist: track.artist['#text'],
      album: track.album['#text'],
      name: track.name,
      date: track.date.uts,
    });
  });

  return result;
};

// Storage functions
class ScrobbleStorage {
  constructor(storageType) {
    this.storageType = storageType;
    this.db = null;
    this.fileHandle = null;
  }

  async init(username) {
    if (this.storageType === 'indexedDB') {
      this.db = await this.openIndexedDB(username);
    } else if (this.storageType === 'fileSystem') {
      this.fileHandle = await this.getFileHandle(username);
    }
  }

  async openIndexedDB(username) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 3); // Increased version number
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(username)) {
          const userStore = db.createObjectStore(username, { keyPath: 'key' });
          userStore.createIndex('key', 'key', { unique: true });

          // Create a sub-store for scrobbles
          const scrobblesStore = db.createObjectStore(
            `${username}_${STORE_NAME}`,
            { keyPath: 'page' },
          );
          scrobblesStore.createIndex('page', 'page', { unique: true });
        }
      };
    });
  }

  async getFileHandle(username) {
    const options = {
      types: [
        {
          description: 'CSV File',
          accept: { 'text/csv': ['.csv'] },
        },
      ],
      suggestedName: `lastfm_${STORE_NAME}_${username}.csv`,
    };
    return await window.showSaveFilePicker(options);
  }

  async saveScrobbles(username, page, scrobbles) {
    if (this.storageType === 'indexedDB') {
      const transaction = this.db.transaction(
        [`${username}_${STORE_NAME}`],
        'readwrite',
      );
      const store = transaction.objectStore(`${username}_${STORE_NAME}`);
      await store.put({ page, scrobbles });
    } else if (this.storageType === 'fileSystem') {
      const writable = await this.fileHandle.createWritable({
        keepExistingData: true,
      });
      const position = (page - 1) * TRACKS_PER_PAGE * 100; // Approximate bytes per scrobble
      await writable.seek(position);
      const csvData =
        scrobbles
          .map((s) => arrayToCsv([s.artist, s.album, s.name, s.date]))
          .join('\n') + '\n';
      await writable.write(csvData);
      await writable.close();
    }

    // Save the last saved page as user-specific data
    await this.saveUserData(username, 'lastSavedPage', page);
  }

  async saveUserData(username, key, value) {
    if (this.storageType === 'indexedDB') {
      const transaction = this.db.transaction([username], 'readwrite');
      const store = transaction.objectStore(username);
      await store.put({ key, value });
    } else if (this.storageType === 'fileSystem') {
      // For file system, we'll use browser.storage.local for user-specific data
      await browser.storage.local.set({ [`${username}_${key}`]: value });
    }
  }

  async getUserData(username, key) {
    if (this.storageType === 'indexedDB') {
      const transaction = this.db.transaction([username], 'readonly');
      const store = transaction.objectStore(username);
      const request = store.get(key);
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () =>
          resolve(request.result ? request.result.value : null);
      });
    } else if (this.storageType === 'fileSystem') {
      const result = await browser.storage.local.get(`${username}_${key}`);
      return result[`${username}_${key}`] || null;
    }
  }

  async getLastSavedPage(username) {
    return (await this.getUserData(username, 'lastSavedPage')) || 0;
  }

  async readScrobbles(username) {
    if (this.storageType === 'indexedDB') {
      return await this.readScrobblesFromIndexedDB(username);
    } else if (this.storageType === 'fileSystem') {
      return await this.readScrobblesFromFileSystem();
    }
  }

  async readScrobblesFromIndexedDB(username) {
    const transaction = this.db.transaction(
      [`${username}_${STORE_NAME}`],
      'readonly',
    );
    const store = transaction.objectStore(`${username}_${STORE_NAME}`);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const scrobbles = request.result.flatMap((page) => page.scrobbles);
        resolve(scrobbles);
      };
    });
  }

  async readScrobblesFromFileSystem() {
    const file = await this.fileHandle.getFile();
    const text = await file.text();
    const lines = text.trim().split('\n');
    return lines.map((line) => {
      const [artist, album, name, date] = line.split(',');
      return { artist, album, name, date };
    });
  }

  async clearScrobbles(username) {
    if (this.storageType === 'indexedDB') {
      await this.clearScrobblesFromIndexedDB(username);
    } else if (this.storageType === 'fileSystem') {
      await this.clearScrobblesFromFileSystem();
    }

    // Clear the last saved page from user data
    await this.saveUserData(username, 'lastSavedPage', 0);
  }

  async clearScrobblesFromIndexedDB(username) {
    const transaction = this.db.transaction(
      [`${username}_${STORE_NAME}`],
      'readwrite',
    );
    const store = transaction.objectStore(`${username}_${STORE_NAME}`);
    await store.clear();
  }

  async clearScrobblesFromFileSystem() {
    const writable = await this.fileHandle.createWritable();
    await writable.write(''); // Write an empty string to clear the file
    await writable.close();
  }
}

export async function getSavedScrobbles(storageType, username) {
  const storage = new ScrobbleStorage(storageType);
  await storage.init(username);

  try {
    const scrobbles = await storage.readScrobbles(username);
    return scrobbles;
  } catch (error) {
    console.error('Error reading scrobbles:', error);
    alert('Error reading scrobbles. Check the console for details.');
  }
}

// Main function to download scrobbles
export async function downloadScrobbles(
  apiKey,
  username,
  storageType,
  requestDelay = 1000,
  targetPages,
) {
  const storage = new ScrobbleStorage(storageType);
  await storage.init(username);

  const totalPages = targetPages || (await getPageCount(apiKey, username));
  const lastSavedPage = await storage.getLastSavedPage(username);

  let startPage = lastSavedPage + 1;

  for (let page = startPage; page <= totalPages; page++) {
    try {
      const tracks = await getTracks(apiKey, username, page);
      await storage.saveScrobbles(username, page, tracks);
      console.log(`Saved page ${page}/${totalPages} for user ${username}`);
      await utils.delay(requestDelay);
    } catch (error) {
      console.error(`Error on page ${page}:`, error);
      break;
    }
  }

  console.log(`Finished downloading scrobbles for user ${username}`);
}
