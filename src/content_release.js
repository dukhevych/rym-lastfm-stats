import release from '@/modules/release/index.js';
import { renderContent } from '@/helpers/renderContent.js';
import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import { getRymAlbum } from '@/helpers/rymSync.js';

(async function () {
  const storageItems = await utils.getSyncedOptions();
  const config = { ...constants.OPTIONS_DEFAULT, ...storageItems };

  await renderContent(release, config);

  const rymAlbumId = document.querySelector('.album_shortcut').value.replace('[Album', '').replace(']', '');

  const rymAlbumData = await getRymAlbum(rymAlbumId);

  console.log('RYM Album Data:', rymAlbumData);
})();
