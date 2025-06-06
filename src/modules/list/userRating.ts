import * as constants from '@/helpers/constants';
import * as utils from '@/helpers/utils';
import { RecordsAPI } from '@/helpers/records-api';
import './userRating.css';

const LIST_ITEMS_SELECTOR = '#user_list > tbody > tr';
const LIST_ITEM_SELECTOR = 'a.list_album';
const ARTIST_ITEM_SELECTOR = 'a.list_artist';
const ART_ITEM_SELECTOR = '.list_art img';

function getItems() {
  const releases = [];
  const artists = [];

  Array.from(document.querySelectorAll(LIST_ITEMS_SELECTOR)).forEach(item => {
    const albumEl = item.querySelector(LIST_ITEM_SELECTOR);
    const artistEl = item.querySelector(ARTIST_ITEM_SELECTOR);
    const artImgEl = item.querySelector(ART_ITEM_SELECTOR);

    let itemType = null;

    if (artistEl) itemType = albumEl
      ? constants.RYM_ENTITY_CODES.release
      : constants.RYM_ENTITY_CODES.artist;

    if (itemType === constants.RYM_ENTITY_CODES.release) {
      let releaseId = null;

      if (artImgEl) {
        releaseId = artImgEl.id.replace(`img_${constants.RYM_ENTITY_CODES.release}_`, '');
      }

      const itemRelease = {
        itemType,
        title: albumEl.textContent.trim() || null,
        artistName: artistEl.textContent.trim() || null,
        releaseId,
        node: item,
      };

      releases.push(itemRelease);
    }

    if (itemType === constants.RYM_ENTITY_CODES.artist) {
      let artistId = null;

      if (artImgEl) {
        artistId = artImgEl.id.replace(`img_${constants.RYM_ENTITY_CODES.artist}_`, '');
      }

      const itemArtist = {
        artistId,
        itemType,
        title: null,
        artistName: artistEl.textContent.trim() || null,
        node: item,
      };

      artists.push(itemArtist);
    }
  });

  return { releases, artists };
}

function addReleaseRating(item) {
  const rating = item.rating / 2;

  if (rating < 0 || rating > 5) {
    console.warn('Invalid rating value:', item, rating);
    return;
  }

  item.node.classList.add('rym-lastfm-stats--item');
  item.node.dataset.rymRating = `${rating} / 5`;
}

// function addArtistStats(item) {
//   // TODO Add artist stats to the item
// };

async function render() {
  const {
    releases,
  } = getItems();

  const releasesIds = [];
  const releasesWithoutId = [];

  releases.forEach(item => {
    if (item.releaseId) {
      releasesIds.push(item.releaseId);
    } else if (item.artistName && item.title) {
      releasesWithoutId.push(item);
    }
  });

  const releasesWithIdData = await RecordsAPI.getByIds(releasesIds, true);

  await Promise.all(releasesWithoutId.map(async (item) => {
    const releases = await RecordsAPI.getByArtistAndTitle(
      utils.normalizeForSearch(item.artistName),
      utils.normalizeForSearch(item.title),
    );

    const release = releases?.[0] || null;

    if (release && release.rating > 0) {
      addReleaseRating({
        ...item,
        releaseId: release.id,
        rating: release.rating,
      });
    }
  }));

  releases.forEach(async (item) => {
    const release = releasesWithIdData[item.releaseId] || null;

    if (release && release.rating) {
      item.rating = release.rating;
      addReleaseRating(item);
    }
  });
}

export default {
  render,
  targetSelectors: [
    '#user_list',
  ],
};
