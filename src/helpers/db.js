import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';

export async function getDatabaseName() {
  const userName = await utils.getUserName();
  if (!userName) {
    throw new Error('User name not found');
  }
  return `${constants.RYM_DB_NAME}_${userName}`;
}

export async function getRecord(id) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

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

export async function getAllRecords() {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  console.log(`[getAllRecords] DB Name: ${dbName}, Version: ${constants.RYM_DB_VERSION}`);

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    console.log(`[getAllRecords] DB Request: ${dbRequest}`);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;

      console.log(`[getAllRecords] DB opened successfully`);

      if (!db.objectStoreNames.contains(storeName)) {
        console.warn(`[getAllRecords] Object store '${storeName}' does not exist in DB '${dbName}'`);
        db.close();
        resolve([]);
        return;
      }

      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();

      console.log(`[getAllRecords] Get all request: ${getAllRequest}`);

      getAllRequest.onsuccess = function () {
        console.log(`[getAllRecords] Get all request successful`, getAllRequest.result);
        db.close();
        resolve(getAllRequest.result);
      };

      getAllRequest.onerror = function (event) {
        db.close();
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function getRecords(ids, asObject = false) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

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

export async function addRecord(payload) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  console.log(`[addRecord] DB Name: ${dbName}, Version: ${constants.RYM_DB_VERSION}`);

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const putRequest = store.put(payload);

      putRequest.onsuccess = function () {
        console.log(`[addRecord] Record added: ${payload.id}`);
        db.close();
        resolve(true);
      };

      putRequest.onerror = function (event) {
        console.error(`[addRecord] Error adding record: ${event.target.error}`);
        db.close();
        reject(event.target.error);
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

export async function updateRecord(id, payload) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  console.log(`[updateRecord] DB Name: ${dbName}, Version: ${constants.RYM_DB_VERSION}`);

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const getRequest = store.get(id);

      getRequest.onsuccess = function () {
        const existing = getRequest.result;
        if (existing) {
          const updatedRecord = { ...existing, ...payload };
          const updateRequest = store.put(updatedRecord);

          updateRequest.onsuccess = function () {
            console.log(`[updateRecord] Record updated: ${id}`);
            db.close();
            resolve(true);
          };

          updateRequest.onerror = function (event) {
            console.error(`[updateRecord] Error updating record: ${event.target.error}`);
            db.close();
            reject(event.target.error);
          };
        } else {
          reject(new Error(`No record found with id: ${id}`));
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

export async function updateRecordRating(id, rating) {
  return updateRecord(id, { rating });
}

export async function deleteRecord(id) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

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

export async function initDatabase() {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();
  const version = constants.RYM_DB_VERSION;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('idIndex', 'id', { unique: true });
        console.log(`[initDatabase] Created store and index`);
      }
    };

    request.onsuccess = (event) => {
      event.target.result.close();
      console.log(`[initDatabase] Database opened successfully`);
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export async function setRecords(payload) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();
  const version = constants.RYM_DB_VERSION;

  let finished = false;

  console.warn(`[setRecords] ⚠️ DB Name: ${dbName}, Version: ${version}`);

  await new Promise((res, rej) => {
    const delReq = indexedDB.deleteDatabase(dbName);
    delReq.onsuccess = () => {
      console.warn('[setRecords] ✅ Database deleted');
      res();
    };
    delReq.onerror = (e) => {
      console.error('[setRecords] ❌ Delete failed:', e.target.error);
      rej(e.target.error);
    };
  });

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);

    req.onupgradeneeded = (e) => {
      console.warn('[setRecords] 🔼 onupgradeneeded triggered');
      const db = e.target.result;

      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }

      const store = db.createObjectStore(storeName, { keyPath: 'id' });
      store.createIndex('idIndex', 'id', { unique: true });

      const tx = e.target.transaction;

      payload.forEach((record) => store.put(record));

      tx.oncomplete = () => {
        console.log('[setRecords] ✅ Records inserted during upgrade');
        db.close();
        finished = true;
        resolve();
      };

      tx.onerror = (err) => {
        db.close();
        finished = true;
        reject(err.target.error);
      };
    };

    req.onsuccess = (e) => {
      const db = e.target.result;
      db.close();
      if (!finished) {
        console.log('[setRecords] ✅ DB opened successfully (no upgrade needed)');
        resolve();
      }
    };

    req.onerror = (e) => {
      if (!finished) {
        console.error('[setRecords] ❌ DB open error:', e.target.error);
        reject(e.target.error);
      }
    };
  });
}

