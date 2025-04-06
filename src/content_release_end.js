import * as utils from '@/helpers/utils.js';
import { getRymAlbum, updateRymAlbum } from '@/helpers/rymSync.js';

(async function () {
  const releaseId = document.querySelectorAll('.album_shortcut')[0].value.replace('[Album', '').replace(']', '');

  const propName = 'rating_l_' + releaseId;

  const propValue = await utils.getVariableFromMainWindow(propName);

  const rymAlbumData = await getRymAlbum(releaseId);

  if (!rymAlbumData) {
    console.warn('RYM album data not found for release ID:', releaseId);
    return;
  }

  if (String(rymAlbumData.rating) !== String(propValue.rating)) {
    await updateRymAlbum(releaseId, { rating: String(propValue.rating) });
  }
})();
