const DB_NAME = 'lastfm-scrobbles';

function getStoreName(username) {
  return `${username}_tracks`;
}

function openDB(username) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onupgradeneeded = () => {}; // No pre-setup
    req.onsuccess = () => {
      const db = req.result;
      // Create store dynamically if missing
      if (!db.objectStoreNames.contains(getStoreName(username))) {
        const version = db.version + 1;
        db.close();
        const upgradeReq = indexedDB.open(DB_NAME, version);
        upgradeReq.onupgradeneeded = () => {
          upgradeReq.result.createObjectStore(getStoreName(username), { keyPath: 'id' });
        };
        upgradeReq.onsuccess = () => resolve(upgradeReq.result);
        upgradeReq.onerror = reject;
      } else {
        resolve(db);
      }
    };
    req.onerror = reject;
  });
}

async function saveBatch(username, page, tracks) {
  const db = await openDB(username);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(username), 'readwrite');
    tx.objectStore(getStoreName(username)).put({ id: page, tracks });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function getSavedPages(username) {
  const db = await openDB(username);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(username), 'readonly');
    const req = tx.objectStore(getStoreName(username)).getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function fetchPage(username, apiKey, page) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=200&page=${page}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn(`Error fetching page ${page} (attempt ${attempt}):`, err);
      await sleep(500 * attempt); // exponential backoff
    }
  }
  throw new Error(`Failed to fetch page ${page} after retries.`);
}

export async function downloadAllScrobbles(username, apiKey) {
  const firstPage = await fetchPage(username, apiKey, 1);
  const totalPages = parseInt(firstPage.recenttracks['@attr'].totalPages, 10);
  console.log(`Total pages for ${username}: ${totalPages}`);

  const savedPages = new Set(await getSavedPages(username));
  if (!savedPages.has(1)) {
    const pageTracks = firstPage.recenttracks.track;
    await saveBatch(username, 1, pageTracks);
    console.log(`Saved page 1`);
  }

  for (let page = 2; page <= totalPages; page++) {
    if (savedPages.has(page)) {
      console.log(`Skipping already saved page ${page}`);
      continue;
    }

    const pageData = await fetchPage(username, apiKey, page);
    const pageTracks = pageData.recenttracks.track;
    await saveBatch(username, page, pageTracks);
    console.log(`Saved page ${page}`);
    await sleep(250);
  }

  console.log(`✅ Download complete for user ${username}`);
}

export async function getAllScrobbles(username) {
  const db = await openDB(username);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(getStoreName(username), 'readonly');
    const store = tx.objectStore(getStoreName(username));
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result.flatMap(entry => entry.tracks);
      resolve(all);
    };
    req.onerror = reject;
  });
}
