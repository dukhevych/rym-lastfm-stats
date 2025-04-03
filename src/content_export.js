(async function () {
  document.addEventListener('DOMContentLoaded', async () => {
    const form = document.querySelector('form.music_export');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const formData = new FormData(form);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Request failed: " + response.status);
        }

        const exportData = await response.text();

        // Parse the CSV data
        const rows = exportData.split('\n').slice(1); // Skip the header row
        const parsedData = rows.map(row => {
          const columns = row.split(',');
          const item = {
            rymAlbum: columns[0]?.replace(/"/g, '').trim(),
            firstName: columns[1]?.replace(/"/g, '').trim(),
            lastName: columns[2]?.replace(/"/g, '').trim(),
            firstNameLocalized: columns[3]?.replace(/"/g, '').trim(),
            lastNameLocalized: columns[4]?.replace(/"/g, '').trim(),
            title: columns[5]?.replace(/"/g, '').trim(),
            releaseDate: columns[6]?.replace(/"/g, '').trim(),
            rating: columns[7]?.replace(/"/g, '').trim(),
          };

          let releaseName = `${item.lastNameLocalized || item.lastName} - ${item.title}`;

          if (item.firstNameLocalized || item.firstName) {
            releaseName = `${item.firstNameLocalized || item.firstName} ${releaseName}`;
          }

          return {
            ...item,
            releaseName,
          }
        }).filter(item => item.rymAlbum); // Filter out empty rows

        // Save to IndexedDB
        const dbRequest = indexedDB.open('MusicExportDB', 1);

        dbRequest.onupgradeneeded = function (event) {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('exports')) {
            const store = db.createObjectStore('exports', { keyPath: 'rymAlbum' });
            store.createIndex('rymAlbumIndex', 'rymAlbum', { unique: true });
            store.createIndex('releaseNameIndex', 'releaseName', { unique: false });
          } else {
            const store = event.target.transaction.objectStore('exports');
            if (!store.indexNames.contains('rymAlbumIndex')) {
              store.createIndex('rymAlbumIndex', 'rymAlbum', { unique: true });
            }
            if (!store.indexNames.contains('releaseNameIndex')) {
              store.createIndex('releaseNameIndex', 'releaseName', { unique: false });
            }
          }
        };

        dbRequest.onsuccess = function (event) {
          const db = event.target.result;
          const transaction = db.transaction('exports', 'readwrite');
          const store = transaction.objectStore('exports');

          store.clear().onsuccess = function () {
            parsedData.forEach(item => {
              store.put(item);
            });
          };

          transaction.oncomplete = function () {
            console.log('Data successfully saved to IndexedDB.');
          };

          transaction.onerror = function (event) {
            console.error('Error saving data to IndexedDB:', event.target.error);
          };
        };

        dbRequest.onerror = function (event) {
          console.error('Error opening IndexedDB:', event.target.error);
        };
      } catch (err) {
        console.error("Submission error:", err);
      }
    });
  });
})();
