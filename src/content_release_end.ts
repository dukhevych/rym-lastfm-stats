import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import {
  getReleaseYear,
  getReleaseTitle,
  getArtistNames,
} from './modules/release/targets';

(async function () {
  window.addEventListener('load', async () => {
    const albumShortcutElem = document.querySelector('.album_shortcut') as HTMLInputElement | null;
    if (!albumShortcutElem) {
      throw new Error("Element with class 'album_shortcut' not found.");
    }
    const releaseId = utils.extractIdFromTitle(albumShortcutElem.value);

    const rymRatingPath = 'rating_l_' + releaseId;
    const rymCatalogPath = 'catalog_l_' + releaseId;

    const { initialValue } = await utils.getWindowData([
      `${rymRatingPath}.rating`,
      `${rymCatalogPath}.ownership`,
      `${rymCatalogPath}.format`,
    ], async updatedData => {
      // Fix for the runtime RYM bug when setting [not catalogued] and `format` is not being reset
      if (updatedData[rymCatalogPath].ownership === 'n') {
        updatedData[rymCatalogPath].format = '';
      }

      await syncWithDB(updatedData);
    });

    interface RYMRecord {
      id: string;
      title: string;
      releaseDate: string | number;
      artistName: string;
      artistNameLocalized: string;
      $artistName: string;
      $artistNameLocalized: string;
      $title: string;
      rating: number;
      ownership: string;
      format: string;
      _raw?: any;
    }

    interface SyncedData {
      rating: number;
      ownership: string;
      format: string;
    }

    function prepareFullData(syncedData: SyncedData): RYMRecord {
      const artistNames = getArtistNames();
      const { artistName, artistNameLocalized } = utils.combineArtistNames(artistNames);

      const title = getReleaseTitle();

      return {
        id: releaseId,
        title,
        releaseDate: getReleaseYear(),
        artistName,
        artistNameLocalized: artistNameLocalized,
        $artistName: utils.normalizeForSearch(artistName),
        $artistNameLocalized: utils.normalizeForSearch(artistNameLocalized),
        $title: utils.normalizeForSearch(title),
        ...syncedData,
      };
    };

    async function syncWithDB(data) {
      const { rating } = data[rymRatingPath];
      const { ownership, format } = data[rymCatalogPath];
      const dbRecord = await RecordsAPI.getById(releaseId);

      const parsedRecord = prepareFullData({
        rating,
        ownership,
        format,
      });

      if (constants.isDev) {
        console.log('DB RECORD', dbRecord);
        console.log('PARSED RECORD', parsedRecord);
      }

      if (!dbRecord) {
        if (
          rating > 0 ||
          ownership !== 'n'
        ) {
          if (constants.isDev) console.log('ADDING NEW RECORD', parsedRecord);
          await RecordsAPI.add(parsedRecord);
          return;
        } else {
          if (constants.isDev) console.log('NOTHING TO ADD');
          return;
        }
      }

      if (utils.shallowEqual(utils.omit(dbRecord, ['_raw']), parsedRecord)) {
        if (constants.isDev) console.log('NOTHING TO UPDATE');
        return;
      }

      if (constants.isDev) {
        console.log('UPDATING RECORD', releaseId);
        console.log('OLD RECORD', JSON.stringify(dbRecord, null, 2));
        console.log('NEW RECORD', JSON.stringify(parsedRecord, null, 2));
      }

      await RecordsAPI.update(releaseId, parsedRecord);
    }

    await syncWithDB(initialValue);
  });
})();
