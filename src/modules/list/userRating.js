import * as constants from '@/helpers/constants';
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

function addArtistStats(item) {
  // Add artist stats to the item
  console.log('Artist stats:', item);
};

async function render() {
  const {
    releases,
    artists,
  } = getItems();

  const releasesPromises = releases.map(item => {
    const releaseId = item.releaseId;

    if (item.releaseId) return RecordsAPI.getById(releaseId, true);
    if (item.artistName && item.title) {
      return RecordsAPI.getByArtistAndTitle(item.artistName, item.title);
    }
    return Promise.resolve(null);
  });

  const artistsPromises = artists.map(item => {
    if (item.artistName) return RecordsAPI.getByArtist(item.artistName);
    return Promise.resolve(null);
  });

  const responseReleases = await Promise.all(releasesPromises);
  const responseArtists = await Promise.all(artistsPromises);

  releases.forEach((item, index) => {
    const release = responseReleases[index];

    if (release && release.rating) {
      item.rating = release.rating;
      addReleaseRating(item);
    }
  });

  artists.forEach((item, index) => {
    const artistReleases = responseArtists[index];

    if (artistReleases) {
      item.releases = artistReleases;
      addArtistStats(item);
    }
  });
}


export default {
  render,
  targetSelectors: [
    '#user_list',
  ],
};
