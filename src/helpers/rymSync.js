import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';

export async function getRymDBName() {
  const userName = await utils.getUserName();
  if (!userName) {
    throw new Error('User name not found');
  }
  return `${constants.RYM_DB_NAME}_${userName}`;
}

export async function getRymAlbumsQty() {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const countRequest = store.count();

      countRequest.onsuccess = function () {
        resolve(countRequest.result);
      };

      countRequest.onerror = function (event) {
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function getAllAlbumsByArtist(artist) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      console.log('store', store);
      console.log('artist', artist);
      const index = store.index('artistNameIndex');
      console.log('index', index);
      const getAllRequest = index.getAll(artist);
      console.log('getAllRequest', getAllRequest);

      getAllRequest.onsuccess = function () {
        resolve(getAllRequest.result);
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

export async function getRymAlbum(id) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

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

export async function getAllRymAlbums() {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = function () {
        resolve(getAllRequest.result);
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

export async function getRymAlbumByTitle(fullTitle) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();
  const queryNormalized = utils.deburr(fullTitle).toLowerCase().trim();

  const tryGet = (title) =>
    new Promise((resolve, reject) => {
      const dbRequest = indexedDB.open(dbName);

      dbRequest.onsuccess = function (event) {
        const db = event.target.result;

        // Check if object store exists
        if (!db.objectStoreNames.contains(storeName)) {
          db.close();
          return resolve(null);
        }

        let transaction;
        try {
          transaction = db.transaction(storeName, 'readonly');
        } catch {
          db.close();
          return resolve(null);
        }

        const store = transaction.objectStore(storeName);

        // Check if index exists
        if (!store.indexNames.contains('releaseNameNormalizedIndex')) {
          db.close();
          return resolve(null);
        }

        const index = store.index('releaseNameNormalizedIndex');
        const getRequest = index.get(title);

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };

        getRequest.onerror = (event) => {
          db.close();
          reject(event.target.error);
        };
      };

      dbRequest.onerror = (event) => reject(event.target.error);
    });

  // Try original title
  let result = await tryGet(queryNormalized);
  if (result) return result;

  // Generate alternative variants
  const variants = new Set();

  if (queryNormalized.includes(' & ')) variants.add(queryNormalized.replace(/ & /g, ' and '));
  if (queryNormalized.includes(' and ')) variants.add(queryNormalized.replace(/ and /g, ' & '));

  // Try all variants
  for (const variant of variants) {
    result = await tryGet(variant);
    if (result) return result;
  }

  // Still nothing found
  return null;
}

export async function getMultipleRymAlbums(ids, asObject = false) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);

      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = function () {
        const allRecordsMap = new Map(getAllRequest.result.map(rec => [rec.id, rec]));

        const results = ids.map(id => allRecordsMap.get(id));

        if (!asObject) {
          resolve(results);
          return;
        }

        const resultsAsObject = results
          .reduce((acc, curr) => {
            if (curr) {
              acc[curr.id] = curr;
            }
            return acc;
          }, {});

        resolve(resultsAsObject);
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

export async function addRymAlbum(album) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const putRequest = store.put(album);

      putRequest.onsuccess = function () {
        resolve(true);
      };

      putRequest.onerror = function (event) {
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function updateRymAlbum(id, updatedData) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

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

export async function updateRymAlbumRating(id, rating) {
  return updateRymAlbum(id, { rating });
}

export async function deleteRymAlbum(id) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName);

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

function getStoreName() {
  return constants.RYM_DB_STORE_NAME || 'rymExportStore';
}

export async function upgradeRymDB(parsedData) {
  const dbName = await getRymDBName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, 2);

    dbRequest.onupgradeneeded = function (event) {
      const db = event.target.result;

      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }

      const store = db.createObjectStore(storeName, { keyPath: 'id' });
      store.createIndex('idIndex', 'id', { unique: true });
    };

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;

      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const clearRequest = store.clear();

      clearRequest.onsuccess = function () {
        const putPromises = parsedData.map(item => {
          return new Promise((res, rej) => {
            const putRequest = store.put(item);
            putRequest.onsuccess = () => res();
            putRequest.onerror = (e) => rej(e.target.error);
          });
        });

        Promise.all(putPromises)
          .then(() => {
            transaction.oncomplete = function () {
              console.log('Data successfully saved to IndexedDB.');
              db.close();
              resolve();
            };
          })
          .catch(error => {
            console.error('Error inserting data into IndexedDB:', error);
            db.close();
            reject(error);
          });
      };

      clearRequest.onerror = function (e) {
        console.error('Error clearing object store:', e.target.error);
        db.close();
        reject(e.target.error);
      };

      transaction.onerror = function (event) {
        console.error('Transaction error:', event.target.error);
        db.close();
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}
