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
    const releaseId = utils.extractIdFromTitle(document.querySelectorAll('.album_shortcut')[0].value);

    const data = await utils.getWindowData([
      'rating_l_' + releaseId + '.rating',
      'catalog_l_' + releaseId + '.ownership',
      'catalog_l_' + releaseId + '.format',
    ], a => {
      console.log(2222, JSON.stringify(a, null, 2));
    });

    console.log(1111, data);

    // console.log('DATA', data);
  });
  // async function initFieldWatch(releaseId, windowKey, fieldName, recordFieldName) {
  //   let newValue;

  //   const { initialValue } = await utils.getAndWatchObjectField(
  //     windowKey,
  //     fieldName,
  //     async (updatedValue) => {
  //       newValue = updatedValue;
  //       await updateRecord({ [recordFieldName]: newValue });
  //     },
  //   );

  //   newValue = initialValue;

  //   await updateRecord({ [recordFieldName]: newValue });
  // }

  // async function updateRecord(releaseId, data) {
  //   let rymAlbumData = null;
  //   rymAlbumData = await RecordsAPI.getById(releaseId);

  //   if (constants.isDev) console.log('DB DATA', rymAlbumData);


  //   const itemData = {
  //     id: releaseId,
  //     ...data,
  //   };
  //   console.log('PARSED DATA', itemData);

  //   if (rymAlbumData) {
  //     if (rymAlbumData.rating !== Number(itemData.rating)) {
  //       console.log('UPDATED RATING', rymAlbumData.rating, Number(itemData.rating));
  //       await RecordsAPI.update(releaseId, { rating: Number(itemData.rating) });
  //     } else {
  //       console.log('NOTHING TO UPDATE');
  //     }
  //   } else {
  //     console.log('ADDING NEW RECORD');
  //     await RecordsAPI.add(itemData);
  //   }
  // }

  // const prepareFullData = (releaseId, data) => {
  //   const artistNames = getArtistNames();
  //   const { artistName, artistNameLocalized } = utils.combineArtistNames(artistNames);

  //   const title = getReleaseTitle();

  //   return {
  //     id: releaseId,
  //     title,
  //     releaseDate: getReleaseYear(),
  //     rating: data.rating,
  //     artistName,
  //     artistNameLocalized: artistNameLocalized,
  //     $artistName: utils.normalizeForSearch(artistName),
  //     $artistNameLocalized: utils.normalizeForSearch(artistNameLocalized),
  //     $title: utils.normalizeForSearch(title),
  //   };
  // };

  // window.addEventListener('load', async () => {
  //   const releaseId = document.querySelectorAll('.album_shortcut')[0].value.replace('[Album', '').replace(']', '');

  //   const ratingKey = 'rating_l_' + releaseId;
  //   const fieldName = 'rating';

  //   let ratingValue;

  //   const { initialValue } = await utils.getAndWatchObjectField(
  //     ratingKey,
  //     fieldName,
  //     async (updatedValue) => {
  //       ratingValue = updatedValue;
  //       await updateRymSync(ratingValue);
  //     },
  //   );

  //   ratingValue = initialValue;

  //   async function updateRecord(data) {
  //     let rymAlbumData = null;
  //     rymAlbumData = await RecordsAPI.getById(releaseId);

  //     console.log('DB DATA', rymAlbumData);

  //     const itemData = prepareItem(ratingValue);
  //     console.log('PARSED DATA', itemData);

  //     if (rymAlbumData) {
  //       if (rymAlbumData.rating !== Number(itemData.rating)) {
  //         console.log('UPDATED RATING', rymAlbumData.rating, Number(itemData.rating));
  //         await RecordsAPI.update(releaseId, { rating: Number(itemData.rating) });
  //       } else {
  //         console.log('NOTHING TO UPDATE');
  //       }
  //     } else {
  //       console.log('ADDING NEW RECORD');
  //       await RecordsAPI.add(itemData);
  //     }
  //   }

  //   async function updateRymSync(value) {
  //     let rymAlbumData = null;
  //     rymAlbumData = await RecordsAPI.getById(releaseId);

  //     console.log('DB DATA', rymAlbumData);

  //     const data = prepareItem(value);
  //     console.log('PARSED DATA', data);

  //     // if (value > 0) {
  //     //   if (!rymAlbumData) {
  //     //     const data = prepareItem(value);
  //     //     console.log('PARSED DATA', data);
  //     //     await RecordsAPI.add(data);
  //     //   } else if (rymAlbumData.rating !== Number(value)) {
  //     //     console.log('UPDATED RATING', rymAlbumData.rating, Number(value));
  //     //     await RecordsAPI.update(releaseId, { rating: Number(value) });
  //     //   } else {
  //     //     console.log('NOTHING TO UPDATE');
  //     //   }
  //     // }

  //     if (value === 0) {
  //       if (rymAlbumData) {
  //         await RecordsAPI.delete(releaseId);
  //       }
  //     }
  //   }

  //   await updateRymSync(ratingValue);
  // });
})();
