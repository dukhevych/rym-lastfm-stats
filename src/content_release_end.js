import * as utils from '@/helpers/utils.js';
import { getRymAlbum, updateRymAlbum, addRymAlbum, deleteRymAlbum } from '@/helpers/rymSync.js';

(async function () {
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

  async function updateRymSync(value) {
    const rymAlbumData = await getRymAlbum(releaseId);
    if (value > 0) {
      if (!rymAlbumData) {
        await addRymAlbum({
          id: releaseId,
          artistName: '', // TODO - get artist name
          artistNameLocalized: '', // TODO - get artist name localized
          title: '', // TODO - get album title
          releaseDate: '', // TODO - get release date
          rating: String(value),
        });
      } else {
        console.log('updateRymAlbum', rymAlbumData, value);
        await updateRymAlbum(releaseId, { rating: String(value) });
      }
    }

    if (value === 0) {
      if (rymAlbumData) {
        await deleteRymAlbum(releaseId);
      }
    }
  }

  await updateRymSync(ratingValue);
})();
