import * as utils from '@/helpers/utils.js';
import { RecordsAPI } from '@/helpers/records-api.js';
import {
  getReleaseYear,
  getReleaseTitle,
  getArtistNames,
} from './modules/release/targets.js';

(async function () {
  window.addEventListener('load', async () => {
    const releaseId = document.querySelectorAll('.album_shortcut')[0].value.replace('[Album', '').replace(']', '');

    const propName = 'rating_l_' + releaseId;
    const fieldName = 'rating';

    let ratingValue;

    const { initialValue } = await utils.getAndWatchObjectField(
      propName,
      fieldName,
      async (updatedValue) => {
        ratingValue = updatedValue;
        await updateRymSync(ratingValue);
      },
    );

    ratingValue = initialValue;

    const prepareItem = (value) => {
      const artistNames = getArtistNames();
      let lastArtistNames;

      if (artistNames.length > 1) {
        lastArtistNames = artistNames.pop();
      }

      let artistName = '';

      if (lastArtistNames) {
        artistName = ' & ' + lastArtistNames.artistName;
      }
      artistName = `${artistNames.map((name) => name.artistName).join(', ')}${artistName}`;

      let artistNameLocalized = '';

      if (
        lastArtistNames
          && (
            artistNames.some((name => name.artistNameLocalized))
            || lastArtistNames.artistNameLocalized
          )
      ) {
        artistNameLocalized = ' & ' + (lastArtistNames.artistNameLocalized || lastArtistNames.artistName);
        artistNameLocalized = `${artistNames.map((name) => name.artistNameLocalized || name.artistName).join(', ')}${artistNameLocalized}`;
      }

      const title = getReleaseTitle();

      return {
        id: releaseId,
        title,
        releaseDate: getReleaseYear(),
        rating: Number(value),
        artistName,
        artistNameLocalized: artistNameLocalized,
        $artistName: utils.normalizeForSearch(artistName),
        $artistNameLocalized: utils.normalizeForSearch(artistNameLocalized),
        $title: utils.normalizeForSearch(title),
      };
    };

    async function updateRymSync(value) {
      let rymAlbumData = null;
      rymAlbumData = await RecordsAPI.getById(releaseId);
      console.log('DB DATA', rymAlbumData);
      if (value > 0) {
        if (!rymAlbumData) {
          const data = prepareItem(value);
          console.log('PARSED DATA', data);
          await RecordsAPI.add(data);
        } else if (rymAlbumData.rating !== Number(value)) {
          console.log('UPDATED RATING', rymAlbumData.rating, Number(value));
          await RecordsAPI.update(releaseId, { rating: Number(value) });
        } else {
          console.log('NOTHING TO UPDATE');
        }
      }

      if (value === 0) {
        if (rymAlbumData) {
          await RecordsAPI.delete(releaseId);
        }
      }
    }

    await updateRymSync(ratingValue);
  });
})();
