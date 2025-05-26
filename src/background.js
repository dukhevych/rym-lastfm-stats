import FlexSearch from 'flexsearch';
import * as db from '@/helpers/db';
import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import getWindowDataInjected from '@/background/getWindowDataInjected.js';

import './background/runtime/onInstalled.js';

const dbMessageTypes = new Set([
  'GET_RECORD_BY_ID',
  'GET_RECORDS_BY_IDS',
  'GET_ALL_RECORDS',
  'GET_RECORDS_BY_ARTIST',
  'GET_RECORDS_BY_ARTISTS',
  'GET_RECORD_BY_ARTIST_AND_TITLE',
  'ADD_RECORD',
  'UPDATE_RECORD',
  'UPDATE_RECORD_RATING',
  'DELETE_RECORD',
  'GET_RECORDS_QTY',
  'SET_RECORDS',
  'SEARCH',
]);

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const flexIndex = new FlexSearch.Index({ tokenize: 'forward', cache: true });

let recordMap = new Map();

async function buildSearchIndex() {
  const records = await db.getAllRecords();

  recordMap.clear();
  flexIndex.clear();

  records.forEach((record) => {
    const searchable = [
      record.$title,
      record.$artistName,
      record.$artistNameLocalized,
    ].join(' ').toLowerCase();

    flexIndex.add(record.id, searchable);
    recordMap.set(record.id, record);
  });

  console.log(`[FlexSearch] Indexed ${records.length} records`);
}

(async () => {
  try {
    await db.initDatabase();
    await buildSearchIndex();
  } catch (err) {
    console.error('[Background] Failed to initialize database or build index:', err);
  }
})();

async function handleDatabaseMessages(message, sender, sendResponse) {
  const { type, payload } = message;

  try {
    let result = null;

    switch (type) {
      case 'GET_RECORD_BY_ID': {
        result = recordMap.get(payload.id) || null;
        break;
      }

      case 'GET_RECORDS_BY_IDS': {
        const results = payload.ids.map(id => recordMap.get(id)).filter(Boolean);

        if (payload.asObject) {
          result = Object.fromEntries(results.map(record => [record.id, record]));
        } else {
          result = results;
        }
        break;
      }

      case 'GET_ALL_RECORDS': {
        result = Array.from(recordMap.values());
        break;
      }

      case 'GET_RECORDS_BY_ARTIST': {
        const query = utils.normalizeForSearch(payload.artist);
        const hits = flexIndex.search(query, { limit: 100 });

        result = hits
          .map(id => recordMap.get(id))
          .filter(record => {
            return record.$artistName.includes(query) || record.$artistNameLocalized.includes(query);
          });
        break;
      }

      case 'GET_RECORDS_BY_ARTISTS': {
        payload.artists.forEach(artist => {
          const query = utils.normalizeForSearch(artist);
          const hits = flexIndex.search(query, { limit: 100 });

          const records = hits
            .map(id => recordMap.get(id))
            .filter(record => {
              return record.$artistName.includes(query) || record.$artistNameLocalized.includes(query);
            });

          if (records.length) {
            if (!result) result = {};
            result[artist] = records.slice();
          }
        });
        break;
      }

      case 'GET_RECORD_BY_ARTIST_AND_TITLE': {
        const artistQuery = utils.normalizeForSearch(payload.artist);
        const titleQuery = utils.normalizeForSearch(payload.title);
        const query = `${artistQuery} ${titleQuery}`;
        const hits = flexIndex.search(query, { limit: 50 });

        const matchedRecords = hits.map(id => recordMap.get(id));

        result = matchedRecords.filter(record => {
          const matchTitle = utils.checkPartialStringsMatch(record.$title, titleQuery);
          const matchArtist = utils.checkPartialStringsMatch(record.$artistName, artistQuery);
          const matchArtistLocalized = utils.checkPartialStringsMatch(record.$artistNameLocalized, artistQuery);

          return matchTitle && (matchArtist || matchArtistLocalized);
        });

        if (!result && payload.titleFallback) {
          const titleFallbackQuery = utils.normalizeForSearch(payload.titleFallback);
          const queryFallback = `${artistQuery} ${titleFallbackQuery}`;
          const hitsFallback = flexIndex.search(queryFallback, { limit: 50 });
          const matchedRecordsFallback = hitsFallback.map(id => recordMap.get(id));

          result = matchedRecordsFallback.filter(record => {
            const matchTitle = utils.checkPartialStringsMatch(record.$title, titleFallbackQuery);
            const matchArtist = utils.checkPartialStringsMatch(record.$artistName, artistQuery);
            const matchArtistLocalized = utils.checkPartialStringsMatch(record.$artistNameLocalized, artistQuery);

            return matchTitle && (matchArtist || matchArtistLocalized);
          });
        }

        break;
      }

      case 'ADD_RECORD': {
        const { record } = payload;
        await db.addRecord(record);
        recordMap.set(record.id, record);
        flexIndex.add(
          record.id,
          [
            record.$title,
            record.$artistName,
            record.$artistNameLocalized
          ].join(' ').toLowerCase(),
        );
        result = true;
        break;
      }

      case 'UPDATE_RECORD': {
        const existing = recordMap.get(payload.id);
        if (!existing) throw new Error(`No record with id ${payload.id}`);
        const updated = { ...existing, ...payload.updatedData };
        await db.updateRecord(payload.id, payload.updatedData);
        recordMap.set(payload.id, updated);
        flexIndex.update(
          payload.id,
          [
            updated.$title,
            updated.$artistName,
            updated.$artistNameLocalized
          ].join(' ').toLowerCase());
        result = true;
        break;
      }

      case 'UPDATE_RECORD_RATING': {
        const existing = recordMap.get(payload.id);
        if (!existing) throw new Error(`No record with id ${payload.id}`);
        existing.rating = payload.rating;
        await db.updateRecordRating(payload.id, payload.rating);
        recordMap.set(payload.id, existing);
        result = true;
        break;
      }

      case 'DELETE_RECORD': {
        await db.deleteRecord(payload.id);
        recordMap.delete(payload.id);
        flexIndex.remove(payload.id);
        result = true;
        break;
      }

      case 'GET_RECORDS_QTY': {
        result = recordMap.size;
        break;
      }

      case 'SET_RECORDS': {
        result = await db.setRecords(payload.payload);
        await buildSearchIndex();
        break;
      }

      case 'SEARCH': {
        const queryParts = [payload.artistName, payload.title]
          .filter(Boolean)
          .map(s => s.toLowerCase().trim());

        const searchQuery = queryParts.join(' ');
        const hits = flexIndex.search(searchQuery, { limit: 30 });

        result = hits.map(id => recordMap.get(id));
        break;
      }

      default:
        console.warn('Unhandled message type:', type);
    }
    sendResponse({ success: true, result });
  } catch (error) {
    console.error(error);
    sendResponse({ success: false, error: error.message });
  }
}

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type } = message;

  if (dbMessageTypes.has(type)) {
    (async () => {
      await handleDatabaseMessages(message, sender, sendResponse);
    })();
    return true;
  }

  switch (type) {
    case 'FETCH_IMAGE': {
      fetch(message.url, { mode: 'cors' })
        .then((response) => response.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({ success: true, dataUrl: reader.result });
          };
          reader.onerror = (e) => {
            console.error(e);
            sendResponse({ success: false, error: 'Failed to read blob' });
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message || 'Fetch error' });
        });
      return true;
    }

    case 'get-window-data': {
      if (
        sender.tab?.id &&
        Array.isArray(message.paths)
      ) {
        const { paths, watch, deep } = message;
        const pathMap = new Map();

        for (const path of paths) {
          const [root] = path.split('.');
          const value = path.substring(root.length + 1);

          if (!pathMap.has(root)) pathMap.set(root, []);
          if (value) {
            pathMap.get(root).push(value);
          }
        }

        console.log('get-window-data paths:', pathMap);

        for (const [prop, fieldPaths] of pathMap.entries()) {
          console.log('get-window-data prop:', prop, 'paths:', fieldPaths);
          browser.scripting.executeScript({
            target: { tabId: sender.tab.id },
            world: 'MAIN',
            args: [prop, fieldPaths, constants.APP_NAME_SLUG, watch, deep],
            func: getWindowDataInjected,
          });
        }
      }
      return false;
    }

    default:
      console.warn('Unhandled message type:', type);
  }
});
