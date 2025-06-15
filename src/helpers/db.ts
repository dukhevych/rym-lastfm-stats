import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';

export async function getDatabaseName() {
  const userName = await utils.getUserName();
  if (!userName) constants.RYM_DB_NAME;
  return `${constants.RYM_DB_NAME}_${userName}`;
}

interface GetRecordResult {
  id: string | number;
  [key: string]: any;
}

export async function getRecord(id: string | number): Promise<GetRecordResult | undefined> {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  return new Promise<GetRecordResult | undefined>((resolve, reject) => {
    const dbRequest: IDBOpenDBRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event: Event) {
      if (!event.target) {
        reject(new Error('IndexedDB onsuccess event.target is null'));
        return;
      }
      const db = (event.target as IDBRequest<IDBDatabase>).result;
      const transaction: IDBTransaction = db.transaction(storeName, 'readonly');
      const store: IDBObjectStore = transaction.objectStore(storeName);

      const getRequest: IDBRequest<GetRecordResult> = store.get(id);

      getRequest.onsuccess = function () {
        resolve(getRequest.result);
      };

      getRequest.onerror = function (event: Event) {
        reject((event.target as IDBRequest).error);
      };
    };

    dbRequest.onerror = function (event: Event) {
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function getAllRecords(): Promise<IRYMRecordDB[]> {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  console.log(`[getAllRecords] DB Name: ${dbName}, Version: ${constants.RYM_DB_VERSION}`);

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    console.log(`[getAllRecords] DB Request: ${dbRequest}`);

    dbRequest.onsuccess = function (event) {
      const db = (event.target as IDBRequest<IDBDatabase>).result;

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
        reject(event.target && 'error' in event.target ? (event.target as IDBRequest).error : new Error('Unknown IndexedDB error'));
      };
    };

    dbRequest.onerror = function (event) {
      reject(event.target && 'error' in event.target ? (event.target as IDBRequest).error : new Error('Unknown IndexedDB error'));
    };
  });
}

interface GetRecordsOptions {
  asObject?: boolean;
}

export async function getRecords(
  ids: Array<string | number>,
  asObject: boolean = false
): Promise<Array<GetRecordResult | undefined> | Record<string | number, GetRecordResult>> {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  return new Promise<Array<GetRecordResult | undefined> | Record<string | number, GetRecordResult>>((resolve, reject) => {
    const dbRequest: IDBOpenDBRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event: Event) {
      const db = (event.target as IDBRequest<IDBDatabase>).result;
      const transaction: IDBTransaction = db.transaction(storeName, 'readonly');
      const store: IDBObjectStore = transaction.objectStore(storeName);

      const getAllRequest: IDBRequest<GetRecordResult[]> = store.getAll();

      getAllRequest.onsuccess = function () {
        const allRecordsMap = new Map<string | number, GetRecordResult>(getAllRequest.result.map(rec => [rec.id, rec]));

        const results: Array<GetRecordResult | undefined> = ids.map(id => allRecordsMap.get(id));

        if (!asObject) {
          resolve(results);
          return;
        }

        const resultsAsObject: Record<string | number, GetRecordResult> = results
          .reduce((acc: Record<string | number, GetRecordResult>, curr) => {
            if (curr) {
              acc[curr.id] = curr;
            }
            return acc;
          }, {});

        resolve(resultsAsObject);
      };

      getAllRequest.onerror = function (event: Event) {
        reject((event.target as IDBRequest).error);
      };
    };

    dbRequest.onerror = function (event: Event) {
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function addRecord(payload: IRYMRecordDB) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  console.log(`[addRecord] DB Name: ${dbName}, Version: ${constants.RYM_DB_VERSION}`);

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event) {
      const db = (event.target as IDBRequest<IDBDatabase>).result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const putRequest = store.put(payload);

      putRequest.onsuccess = function () {
        console.log(`[addRecord] Record added: ${payload.id}`);
        db.close();
        resolve(true);
      };

      putRequest.onerror = function (event) {
        const error = (event.target as IDBRequest).error;
        console.error(`[addRecord] Error adding record: ${error}`);
        db.close();
        reject(error);
      };
    };

    dbRequest.onerror = function (event) {
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function updateRecord(id: string, payload: Partial<IRYMRecordDB>) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  console.log(`[updateRecord] DB Name: ${dbName}, Version: ${constants.RYM_DB_VERSION}`);

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event) {
      const db = (event.target as IDBRequest<IDBDatabase>).result;
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
            console.error(`[updateRecord] Error updating record: ${(event.target as IDBRequest).error}`);
            db.close();
            reject((event.target as IDBRequest).error);
          };
        } else {
          reject(new Error(`No record found with id: ${id}`));
        }
      };

      getRequest.onerror = function (event) {
        reject((event.target as IDBRequest).error);
      };
    };

    dbRequest.onerror = function (event) {
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function updateRecordRating(id: string, rating: number) {
  return updateRecord(id, { rating });
}

export async function deleteRecord(id: string) {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open(dbName, constants.RYM_DB_VERSION);

    dbRequest.onsuccess = function (event) {
      const db = (event.target as IDBRequest).result;
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = function () {
        resolve(true);
      };

      deleteRequest.onerror = function (event: Event) {
        reject((event.target as IDBRequest).error);
      };
    };

    dbRequest.onerror = function (event) {
      reject((event.target as IDBRequest).error);
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

  constants.isDev && console.log('initDatabase', 'dbName', dbName, 'storeName', storeName, 'version', version);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result;

      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('idIndex', 'id', { unique: true });
        console.log(`[initDatabase] Created store and index`);
      }
    };

    request.onsuccess = (event) => {
      (event.target as IDBRequest).result.close();
      console.log(`[initDatabase] Database opened successfully`);
      resolve(undefined);
    };

    request.onerror = (event) => {
      reject((event.target as IDBRequest).error);
    };
  });
}

export async function setRecords(payload: IRYMRecordDB[]): Promise<true> {
  const dbName = await getDatabaseName();
  const storeName = getStoreName();
  const version = constants.RYM_DB_VERSION;

  console.warn(`[setRecords] ⚠️ DB Name: ${dbName}, Version: ${version}`);

  await new Promise((resolve, reject) => {
    const delReq = indexedDB.deleteDatabase(dbName);

    delReq.onsuccess = () => {
      console.warn('[setRecords] ✅ Database deleted');
      resolve(true);
    };

    delReq.onerror = (e) => {
      console.error('[setRecords] ❌ Delete failed:', (e.target as IDBRequest).error);
      reject((e.target as IDBRequest).error);
    };
  });

  return new Promise((resolve, reject) => {
    let finished = false; // Protect against false errors after success

    const req = indexedDB.open(dbName, version);

    req.onupgradeneeded = (e) => {
      console.warn('[setRecords] 🔼 onupgradeneeded triggered');
      const db = (e.target as IDBOpenDBRequest).result;

      if (db.objectStoreNames.contains(storeName)) {
        db.deleteObjectStore(storeName);
      }

      const store = db.createObjectStore(storeName, { keyPath: 'id' });
      store.createIndex('idIndex', 'id', { unique: true });

      const tx = req.transaction!;
      const objectStore = tx.objectStore(storeName);

      payload.forEach((record) => {
        try {
          objectStore.put(record);
        } catch (err) {
          console.warn('[setRecords] ⚠️ Failed to insert record:', record, err);
          tx.abort();
        }
      });

      tx.oncomplete = () => {
        console.log('[setRecords] ✅ Records inserted during upgrade');
        db.close();
        finished = true;
        resolve(true);
      };

      tx.onerror = (err) => {
        console.error('[setRecords] ❌ Insert error:', err);
        db.close();
        finished = true;
        reject(
          (err.target && 'error' in err.target)
            ? (err.target as IDBRequest).error
            : new Error('Unknown IndexedDB error')
        );
      };

      tx.onabort = () => {
        console.error('[setRecords] ❌ Transaction was aborted');
        finished = true;
        reject(tx.error ?? new Error('Transaction aborted'));
      };
    };

    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      db.close();
      if (!finished) {
        console.log('[setRecords] ✅ DB opened successfully (no upgrade needed)');
        finished = true;
        resolve(true);
      }
    };

    req.onerror = (e) => {
      if (!finished) {
        console.error('[setRecords] ❌ DB open error:', (e.target as IDBRequest).error);
        reject((e.target as IDBRequest).error);
      } else {
        // Safe to ignore — already resolved
        console.warn('[setRecords] ⚠️ Ignored error after resolution:', (e.target as IDBRequest).error);
      }
    };
  });
}

