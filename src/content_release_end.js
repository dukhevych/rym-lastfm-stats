import * as utils from '@/helpers/utils.js';
import { getRymAlbum, updateRymAlbum, addRymAlbum, deleteRymAlbum } from '@/helpers/rymSync.js';
import {
  getReleaseYear,
  getReleaseTitle,
  getArtistNames,
} from './modules/release/targets.js';

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

  console.log('iniial value', initialValue);

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

    return {
      id: releaseId,
      title: getReleaseTitle(),
      releaseDate: getReleaseYear(),
      rating: Number(value),
      artistName,
      artistNameLocalized: artistNameLocalized,
      $artistName: utils.deburr(artistName.toLowerCase()),
      $artistNameLocalized: utils.deburr(artistNameLocalized.toLowerCase()),
    };
  };

  async function updateRymSync(value) {
    let rymAlbumData = null;
    rymAlbumData = await getRymAlbum(releaseId);
    console.log('rymAlbumData', rymAlbumData);
    if (value > 0) {
      if (!rymAlbumData) {
        const data = prepareItem(value);
        console.log(data);
        await addRymAlbum(data);
        console.log('added');
      } else if (rymAlbumData.rating !== String(value)) {
        await updateRymAlbum(releaseId, { rating: String(value) });
        console.log('updated');
      } else {
        console.log('nothing to update');
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
