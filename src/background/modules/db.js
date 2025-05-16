// background.js
import FlexSearch from 'flexsearch';
import * as db from '@/helpers/rym-db';
import * as utils from '@/helpers/utils.js';

const flexIndex = new FlexSearch.Index({ tokenize: 'forward', cache: true });
let recordMap = new Map();

async function buildSearchIndex() {
  const records = await db.getAllRymAlbums();
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

// Initial load
buildSearchIndex();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  (async () => {
    try {
      let result;
      switch (type) {
        case 'GET_RECORD_BY_ID': {
          result = recordMap.get(payload.id) || null;
          break;
        }

        case 'GET_ALL_RECORDS': {
          result = Array.from(recordMap.values());
          break;
        }

        case 'GET_RECORD_BY_ARTIST': {
          const query = payload.artist.toLowerCase().trim().replace(/\sand\s/g, ' & ');
          const hits = flexIndex.search(query, { limit: 100 });

          result = hits
            .map(id => recordMap.get(id))
            .filter(record => {
              return record.$artistName.includes(query) || record.$artistNameLocalized.includes(query);
            });
          break;
        }

        case 'GET_RECORD_BY_ARTIST_AND_TITLE': {
          const artistQuery = utils.deburr(payload.artist).toLowerCase().trim();
          const titleQuery = utils.deburr(payload.title).toLowerCase().trim();
          const query = `${artistQuery} ${titleQuery}`;
          const hits = flexIndex.search(query, { limit: 50 });

          result = hits
            .map(id => recordMap.get(id))
            .find(record => {
              if (record.$title !== titleQuery) return false;
              return record.$artistName.includes(query) || record.$artistNameLocalized.includes(query);
            }) || null;
          break;
        }

        case 'GET_RECORDS_BY_ID': {
          const results = payload.ids.map(id => recordMap.get(id)).filter(Boolean);
          result = payload.asObject
            ? Object.fromEntries(results.map(record => [record.id, record]))
            : results;
          break;
        }

        case 'ADD_RECORD': {
          const record = payload.record;
          await db.addRymAlbum(record);
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
          await db.updateRymAlbum(payload.id, payload.updatedData);
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
          await db.updateRymAlbumRating(payload.id, payload.rating);
          recordMap.set(payload.id, existing);
          result = true;
          break;
        }

        case 'DELETE_RYM_ALBUM': {
          await db.deleteRymAlbum(payload.id);
          recordMap.delete(payload.id);
          flexIndex.remove(payload.id);
          result = true;
          break;
        }

        case 'GET_RYM_ALBUMS_QTY': {
          result = recordMap.size;
          break;
        }

        case 'UPGRADE_RYM_DB': {
          result = await db.upgradeRymDB(payload.parsedData);
          await buildSearchIndex();
          break;
        }

        case 'SEARCH_RYM_ALBUMS': {
          const queryParts = [payload.artistName, payload.title]
            .filter(Boolean)
            .map(s => s.toLowerCase().trim());
          const searchQuery = queryParts.join(' ');
          const hits = flexIndex.search(searchQuery, { limit: 30 });
          result = hits.map(id => recordMap.get(id));
          break;
        }

        default:
          throw new Error(`Unknown message type: ${type}`);
      }

      sendResponse({ success: true, result });
    } catch (error) {
      console.error(`Error handling message: ${type}`, error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Enable async
});
