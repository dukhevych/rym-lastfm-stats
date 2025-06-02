import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import { RecordsAPI } from '@/helpers/records-api.js';
import {
  getReleaseYear,
  getReleaseTitle,
  getArtistNames,
} from './modules/release/targets.js';

(async function () {
  window.addEventListener('load', async () => {
    const releaseId = utils.extractIdFromTitle(document.querySelector('.album_shortcut').value);

    const rymRatingPath = 'rating_l_' + releaseId;
    const rymCatalogPath = 'catalog_l_' + releaseId;

    const { initialValue } = await utils.getWindowData([
      `${rymRatingPath}.rating`,
      `${rymCatalogPath}.ownership`,
      `${rymCatalogPath}.format`,
    ], async updatedData => {
      // Fix for RYM bug when setting (not catalogued) and format is not being reset
      if (updatedData[rymCatalogPath].ownership === 'n') {
        updatedData[rymCatalogPath].format = '';
      }

      await syncWithDB(updatedData);
    });

    function prepareFullData(syncedData) {
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
