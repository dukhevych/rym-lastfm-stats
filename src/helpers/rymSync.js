import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';

export async function getRymAlbum(id) {
  const storeName = await getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(constants.RYM_DB_NAME, 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const getRequest = store.get(id);

      getRequest.onsuccess = function () {
        resolve(getRequest.result);
      };

      getRequest.onerror = function (event) {
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function getMultipleRymAlbums(ids) {
  const storeName = await getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(constants.RYM_DB_NAME, 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = function () {
        const allRecords = getAllRequest.result;

        const map = new Map(allRecords.map(rec => [rec.id, rec]));

        const results = ids.map(id => map.get(id));
        resolve(results);
      };

      getAllRequest.onerror = function (event) {
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function updateRymAlbum(id, updatedData) {
  const storeName = await getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(constants.RYM_DB_NAME, 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const getRequest = store.get(id);

      getRequest.onsuccess = function () {
        const existing = getRequest.result;
        if (existing) {
          const updatedRecord = { ...existing, ...updatedData };
          const updateRequest = store.put(updatedRecord);

          updateRequest.onsuccess = function () {
            resolve(true);
          };

          updateRequest.onerror = function (event) {
            reject(event.target.error);
          };
        } else {
          reject(new Error(`No record found with rymAlbum: ${id}`));
        }
      };

      getRequest.onerror = function (event) {
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function updateRymAlbumRating(id, rating, userName) {
  return updateRymAlbum(id, { rating }, userName);
}

export async function deleteRymAlbum(id) {
  const storeName = await getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(constants.RYM_DB_NAME, 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = function () {
        resolve(true);
      };

      deleteRequest.onerror = function (event) {
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

async function getStoreName() {
  const userName = await utils.getUserName();
  if (!userName) {
    throw new Error('User name not found');
  }
  return `${userName}_${constants.RYM_STORE_SUFFIX}`;
}

export async function upgradeRymDB(parsedData) {
  const storeName = await getStoreName();
  const dbRequest = indexedDB.open(constants.RYM_DB_NAME, 1);

  return new Promise((resolve, reject) => {
    dbRequest.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('idIndex', 'id', { unique: true });
        store.createIndex('releaseNameIndex', 'releaseName', { unique: false });
      } else {
        const store = event.target.transaction.objectStore(storeName);
        if (!store.indexNames.contains('idIndex')) {
          store.createIndex('idIndex', 'id', { unique: true });
        }
        if (!store.indexNames.contains('releaseNameIndex')) {
          store.createIndex('releaseNameIndex', 'releaseName', { unique: false });
        }
      }
    };

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      store.clear().onsuccess = function () {
        parsedData.forEach(item => {
          store.put(item);
        });
      };

      transaction.oncomplete = function () {
        console.log('Data successfully saved to IndexedDB.');
        resolve();
      };

      transaction.onerror = function (event) {
        console.error('Error saving data to IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}
