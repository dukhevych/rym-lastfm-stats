export async function getRymAlbum(rymAlbum) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('MusicExportDB', 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction('exports', 'readonly');
      const store = transaction.objectStore('exports');

      const getRequest = store.get(rymAlbum);

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

export async function getMultipleRymAlbums(rymAlbumIds) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('MusicExportDB', 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction('exports', 'readonly');
      const store = transaction.objectStore('exports');

      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = function () {
        const allRecords = getAllRequest.result;

        // Map from ID to record for faster lookup
        const map = new Map(allRecords.map(rec => [rec.rymAlbum, rec]));

        // Return in requested order
        const results = rymAlbumIds.map(id => map.get(id));
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


export async function updateRymAlbum(rymAlbum, updatedData) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('MusicExportDB', 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction('exports', 'readwrite');
      const store = transaction.objectStore('exports');

      const getRequest = store.get(rymAlbum);

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
          reject(new Error(`No record found with rymAlbum: ${rymAlbum}`));
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

export async function updateRymAlbumRating(rymAlbum, rating) {
  return updateRymAlbum(rymAlbum, { rating });
}

export async function deleteRymAlbum(rymAlbum) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open('MusicExportDB', 1);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction('exports', 'readwrite');
      const store = transaction.objectStore('exports');

      const deleteRequest = store.delete(rymAlbum);

      deleteRequest.onsuccess = function () {
        resolve(true); // deletion successful
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
