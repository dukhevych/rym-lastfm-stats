import browser from 'webextension-polyfill';

import FlexSearch from 'flexsearch';
import * as db from '@/helpers/db';
import { normalizeForSearch } from '@/helpers/string';
import * as constants from '@/helpers/constants';
import getWindowDataInjected from '@/background/getWindowDataInjected';
import { checkPartialStringsMatch } from '@/helpers/string';

import './background/runtime/onInstalled';

function notNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

const dbMessageTypes = [
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
] as const;

type DBMessageType = typeof dbMessageTypes[number];

const flexIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: true,
  resolution: 9,
});

const recordMap = new Map<string, IRYMRecordDB>();
let isIndexBuilt = false;

async function buildSearchIndex() {
  console.log('[FlexSearch] Building index...');
  const records = await db.getAllRecords();

  recordMap.clear();
  flexIndex.clear();

  records.forEach((record) => {
    const searchable = [
      record.$title,
      record.$artistName,
      record.$artistNameLocalized,
    ].join(' ');

    flexIndex.add(record.id, searchable);
    recordMap.set(record.id, record);
  });

  console.log(`[FlexSearch] Indexed ${records.length} records`);
  isIndexBuilt = true;
}

if (browser.runtime && browser.runtime.onStartup) {
  browser.runtime.onStartup.addListener(() => {
    console.log('[Background] onStartup triggered');
    buildSearchIndex();
  });
}

(async () => {
  try {
    await db.initDatabase();
    await buildSearchIndex();
  } catch (err) {
    console.error('[Background] Failed to initialize database or build index:', err);
  }
})();

async function ensureIndex() {
  if (!isIndexBuilt) {
    console.warn('[Background] Cache empty or not built, rebuilding index');
    await buildSearchIndex();
  }
}

async function handleDatabaseMessages(message: DatabaseMessage, sender: browser.Runtime.MessageSender, sendResponse: (response: any) => void) {
  const { type, payload }: DatabaseMessage = message;

  try {
    await ensureIndex();

    type TResult =
      | null
      | true
      | number
      | IRYMRecordDB
      | IRYMRecordDB[]
      | IRYMRecordDBMatch[]
      | Record<string, IRYMRecordDB>
      | Record<string, IRYMRecordDB[]>
    ;

    let result: TResult = null;

    console.log(`[FlexSearch] ${type} message received`, payload);

    switch (type) {
      case 'GET_RECORD_BY_ID': {
        if (!payload || typeof payload.id !== 'string') {
          throw new Error('Invalid payload for GET_RECORDS_BY_IDS');
        }

        result = recordMap.get(payload.id) || null;
        break;
      }

      case 'GET_RECORDS_BY_IDS': {
        if (!payload || !Array.isArray(payload.ids)) {
          throw new Error('Invalid payload for GET_RECORDS_BY_IDS');
        }

        const results: IRYMRecordDB[] = payload.ids.map((id: string) => recordMap.get(id)).filter(notNull);

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
        if (!payload || typeof payload.artist !== 'string' || !payload.artist.trim()) {
          throw new Error('Invalid payload for GET_RECORDS_BY_IDS');
        }

        const artist = payload.artist.trim();

        const query = normalizeForSearch(artist);
        const hits = flexIndex.search(query, { limit: 100 });

        result = hits
          .map(id => recordMap.get(String(id)))
          .filter((record): record is IRYMRecordDB => {
            if (!record) return false;
            return record.$artistName.includes(query) || record.$artistNameLocalized.includes(query);
          });
        break;
      }

      case 'GET_RECORDS_BY_ARTISTS': {
        if (!payload || !Array.isArray(payload.artists)) {
          throw new Error('Invalid payload for GET_RECORDS_BY_IDS');
        }

        const artistsResult: Record<string, IRYMRecordDB[]> = {};

        payload.artists.forEach((artist: string) => {
          if (typeof artist !== 'string' || !artist.trim()) {
            console.warn(`Invalid artist name: ${artist}`);
            return;
          }

          const query = normalizeForSearch(artist);
          const hits = flexIndex.search(query, { limit: 100 });

          const records: IRYMRecordDB[] = hits
            .map(id => recordMap.get(String(id)))
            .filter((record): record is IRYMRecordDB => {
              if (!record) return false;
              return record.$artistName.includes(query) || record.$artistNameLocalized.includes(query);
            });

          if (records.length) {
            artistsResult[artist] = records.slice();
          }
        });
        result = artistsResult;
        break;
      }

      case 'GET_RECORD_BY_ARTIST_AND_TITLE': {
        if (!payload || typeof payload.artist !== 'string' || typeof payload.title !== 'string') {
          throw new Error('Invalid payload for GET_RECORD_BY_ARTIST_AND_TITLE');
        }

        const artistQuery = normalizeForSearch(payload.artist);
        const titleQuery = normalizeForSearch(payload.title);

        const hits = flexIndex.search(artistQuery, { limit: 50 });
        const matchedRecords = hits.map(id => recordMap.get(String(id))).filter(notNull);

        const filterByTitleAndArtist = (records: IRYMRecordDB[], title: string) => {
          return records.map(record => {
            const isTitleFullMatch = record.$title === title;
            const isArtistFullMatch = record.$artistName === artistQuery || record.$artistNameLocalized === artistQuery;

            if (isTitleFullMatch && isArtistFullMatch) {
              return {
                ...record,
                _match: 'full'
              };
            };

            const isTitleMatch = checkPartialStringsMatch(record.$title, title);
            const isArtistMatch = checkPartialStringsMatch(record.$artistName, artistQuery) ||
              checkPartialStringsMatch(record.$artistNameLocalized, artistQuery);

            if (isTitleMatch && isArtistMatch) {
              return {
                ...record,
                _match: 'partial'
              };
            };

            return null;
          }).filter(notNull).sort((a, b) => {
            if (a._match === 'full' && b._match !== 'full') return -1;
            if (b._match === 'full' && a._match !== 'full') return 1;
            return 0;
          });
        };

        result = filterByTitleAndArtist(matchedRecords, titleQuery);

        const titleFallbackQuery = normalizeForSearch(payload.titleFallback);

        const shouldTryTitleFallback =
          !(result as [])?.length &&
          titleFallbackQuery &&
          titleQuery !== titleFallbackQuery;

        if (shouldTryTitleFallback) {
          const titleFallbackQuery = normalizeForSearch(payload.titleFallback);
          result = filterByTitleAndArtist(matchedRecords, titleFallbackQuery);
        }

        const shouldTryPerWordTitleFallback = !(result as [])?.length;

        if (shouldTryPerWordTitleFallback) {
          const titleWords = titleQuery
            .split(' ')
            .filter(word => word.length > 1 || !/^[^\w\s]+$/.test(word));
          if (titleWords.length) {
            result = matchedRecords.filter(record => {
              return titleWords.every(word => {
                return record.$title.includes(word);
              });
            });
          }

          if (!(result as [])?.length && payload.titleFallback) {
            const titleFallbackWords = titleFallbackQuery
              .split(' ')
              .filter(word => word.length > 1 || !/^[^\w\s]+$/.test(word));
            if (titleFallbackWords.length) {
              result = matchedRecords.filter(record => {
                return titleFallbackWords.every(word => {
                  return record.$title.includes(word);
                });
              });
            }
          }
        }

        // TODO - consider adding a fallback for searching by title only
        // const shouldTrySearchByTitle = !result?.length;

        // if (shouldTrySearchByTitle) {
        //   const titleQuery = normalizeForSearch(payload.titleFallback || payload.title);
        //   const titleHits = flexIndex.search(titleQuery, { limit: 50 });
        //   console.log('titleHits', titleHits);
        // }

        break;
      }

      case 'ADD_RECORD': {
        if (!payload || !payload.record || typeof payload.record !== 'object') {
          throw new Error('Invalid payload for ADD_RECORD');
        }
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
        if (!payload || !payload.id || typeof payload.updatedData !== 'object') {
          throw new Error('Invalid payload for UPDATE_RECORD');
        }
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
        if (!payload || typeof payload.id !== 'string' || typeof payload.rating !== 'number') {
          throw new Error('Invalid payload for UPDATE_RECORD_RATING');
        }
        if (payload.rating < 0 || payload.rating > 10) {
          throw new Error('Rating must be between 0 and 10');
        }
        if (!recordMap.has(payload.id)) {
          throw new Error(`No record with id ${payload.id}`);
        }
        const existing = recordMap.get(payload.id);
        if (!existing) throw new Error(`No record with id ${payload.id}`);
        existing.rating = payload.rating;
        await db.updateRecordRating(payload.id, payload.rating);
        recordMap.set(payload.id, existing);
        result = true;
        break;
      }

      case 'DELETE_RECORD': {
        if (!payload || typeof payload.id !== 'string') {
          throw new Error('Invalid payload for DELETE_RECORD');
        }
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
        if (!payload || !Array.isArray(payload.payload)) {
          throw new Error('Invalid payload for SET_RECORDS');
        }
        result = await db.setRecords(payload.payload);
        await buildSearchIndex();
        break;
      }

      default:
        console.warn('Unhandled message type:', type);
    }
    sendResponse({ success: true, result });
  } catch (error) {
    console.error(error);
    sendResponse({ success: false, error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error) });
  }
}

interface DatabaseMessage {
  type: DBMessageType;
  payload?: Record<string, any>;
}

interface FetchImageMessage {
  type: 'FETCH_IMAGE';
  url: string;
}

interface GetWindowDataMessage {
  type: 'get-window-data';
  paths: string[];
  watch?: boolean;
  deep?: boolean;
}

interface RestartBackgroundMessage {
  type: 'RESTART_BACKGROUND';
}

type BackgroundMessage = DatabaseMessage | FetchImageMessage | GetWindowDataMessage | RestartBackgroundMessage;

browser.runtime.onMessage.addListener(
  (
    message: BackgroundMessage,
    sender: browser.Runtime.MessageSender,
    sendResponse: (response: any) => void
  ): boolean | void => {
    const { type } = message;

    if (dbMessageTypes.includes(type as DBMessageType)) {
      (async () => {
        await handleDatabaseMessages(message as DatabaseMessage, sender, sendResponse);
      })();
      return true;
    }

    switch (type) {
      case 'RESTART_BACKGROUND': {
        (async () => {
          await db.initDatabase();
          await buildSearchIndex();
        })();
        return true;
      }
      case 'FETCH_IMAGE': {
        fetch((message as FetchImageMessage).url, { mode: 'cors' })
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
        const msg = message as GetWindowDataMessage;
        if (
          sender.tab?.id &&
          Array.isArray(msg.paths)
        ) {
          const { paths, watch, deep } = msg;
          const pathMap: Map<string, string[]> = new Map();

          for (const path of paths) {
            const [root] = path.split('.');
            const value = path.substring(root.length + 1);

            if (!pathMap.has(root)) pathMap.set(root, []);
            if (value) {
              pathMap.get(root)!.push(value);
            }
          }

          for (const [prop, fieldPaths] of pathMap.entries()) {
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
  }
);
