// background.js
import FlexSearch from 'flexsearch';
import * as db from '@/helpers/rym-db';
import * as utils from '@/helpers/utils.js';

const flexIndex = new FlexSearch.Index({ tokenize: 'forward', cache: true });
let albumMap = new Map();

async function buildSearchIndex() {
  const albums = await db.getAllRymAlbums();
  albums.forEach((album, i) => {
    const searchable = [
      album.title,
      ...(Array.isArray(album.$artists) ? album.$artists : [])
    ].join(' ').toLowerCase();

    flexIndex.add(album.id, searchable);
    albumMap.set(album.id, album);
  });
  console.log(`[FlexSearch] Indexed ${albums.length} albums`);
}

// Initial load
buildSearchIndex();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  (async () => {
    try {
      let result;
      switch (type) {
        case 'GET_RELEASES_BY_ID': {
          result = albumMap.get(payload.id) || null;
          break;
        }

        case 'GET_ALL_RELEASES': {
          result = Array.from(albumMap.values());
          break;
        }

        case 'GET_RELEASES_BY_ARTIST': {
          const artistLower = payload.artist.toLowerCase().trim();
          const hits = flexIndex.search(artistLower, { limit: 100 });
          result = hits
            .map(id => albumMap.get(id))
            .filter(album =>
              (album.$artists || []).some(name => name.toLowerCase().trim() === artistLower)
            );
          break;
        }

        case 'GET_RELEASE_BY_ARTIST_AND_TITLE': {
          const artistNorm = utils.deburr(payload.artist).toLowerCase().trim();
          const titleNorm = utils.deburr(payload.title).toLowerCase().trim();
          const query = `${artistNorm} ${titleNorm}`;
          const hits = flexIndex.search(query, { limit: 50 });

          result = hits
            .map(id => albumMap.get(id))
            .find(album => {
              const normalizedTitle = utils.deburr(album.title).toLowerCase().trim();
              const normalizedArtists = (album.$artists || []).map(a =>
                utils.deburr(a).toLowerCase().trim()
              );
              return normalizedTitle === titleNorm && normalizedArtists.includes(artistNorm);
            }) || null;
          break;
        }

        case 'GET_RYM_ALBUMS_BY_ID': {
          const results = payload.ids.map(id => albumMap.get(id)).filter(Boolean);
          result = payload.asObject
            ? Object.fromEntries(results.map(album => [album.id, album]))
            : results;
          break;
        }

        case 'ADD_RYM_ALBUM': {
          const album = payload.album;
          await db.addRymAlbum(album);
          albumMap.set(album.id, album);
          flexIndex.add(album.id, [album.title, ...(album.$artists || [])].join(' ').toLowerCase());
          result = true;
          break;
        }

        case 'UPDATE_RYM_ALBUM': {
          const existing = albumMap.get(payload.id);
          if (!existing) throw new Error(`No album with id ${payload.id}`);
          const updated = { ...existing, ...payload.updatedData };
          await db.updateRymAlbum(payload.id, payload.updatedData);
          albumMap.set(payload.id, updated);
          flexIndex.update(payload.id, [updated.title, ...(updated.$artists || [])].join(' ').toLowerCase());
          result = true;
          break;
        }

        case 'UPDATE_RYM_ALBUM_RATING': {
          const existing = albumMap.get(payload.id);
          if (!existing) throw new Error(`No album with id ${payload.id}`);
          existing.rating = payload.rating;
          await db.updateRymAlbumRating(payload.id, payload.rating);
          albumMap.set(payload.id, existing);
          result = true;
          break;
        }

        case 'DELETE_RYM_ALBUM': {
          await db.deleteRymAlbum(payload.id);
          albumMap.delete(payload.id);
          flexIndex.remove(payload.id);
          result = true;
          break;
        }

        case 'GET_RYM_ALBUMS_QTY': {
          result = albumMap.size;
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
          result = hits.map(id => albumMap.get(id));
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
