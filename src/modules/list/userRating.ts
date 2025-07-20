import { normalizeForSearch } from '@/helpers/string';
import { RecordsAPI } from '@/helpers/records-api';
import { RYMEntityCode } from '@/helpers/enums';
import './userRating.css';

const LIST_ITEMS_SELECTOR = '#user_list > tbody > tr';
const LIST_ITEM_SELECTOR = 'a.list_album';
const ARTIST_ITEM_SELECTOR = 'a.list_artist';
const ART_ITEM_SELECTOR = '.list_art img';

interface ReleaseItem {
  itemType: string;
  title: string,
  artistName: string,
  releaseId: string,
  node: HTMLElement,
  rating?: number,
}

interface ArtistItem {
  artistId: string,
  itemType: string,
  artistName: string,
  node: HTMLElement,
  avgRating?: number,
  ratedReleasesQty?: number,
}

function getItems() {
  const releases: ReleaseItem[] = [];
  const artists: ArtistItem[] = [];

  Array.from(document.querySelectorAll(LIST_ITEMS_SELECTOR)).forEach(item => {
    const albumEl = item.querySelector(LIST_ITEM_SELECTOR);
    const artistEl = item.querySelector(ARTIST_ITEM_SELECTOR);
    const artImgEl = item.querySelector(ART_ITEM_SELECTOR);

    let itemType = null;

    if (artistEl) itemType = albumEl
      ? RYMEntityCode.Release
      : RYMEntityCode.Artist;

    if (itemType === RYMEntityCode.Release) {
      let releaseId = '';

      if (artImgEl) {
        releaseId = artImgEl.id.replace(`img_${RYMEntityCode.Release}_`, '');
      }

      const itemRelease = {
        itemType,
        title: (albumEl?.textContent || '').trim(),
        artistName: (artistEl?.textContent || '').trim(),
        releaseId,
        node: item as HTMLElement,
      };

      releases.push(itemRelease);
    }

    if (itemType === RYMEntityCode.Artist) {
      let artistId = '';

      if (artImgEl) {
        artistId = artImgEl.id.replace(`img_${RYMEntityCode.Artist}_`, '');
      }

      const itemArtist = {
        artistId,
        itemType,
        artistName: (artistEl?.textContent || '').trim(),
        node: item as HTMLElement,
      };

      artists.push(itemArtist);
    }
  });

  return { releases, artists };
}

function addReleaseRating(item: ReleaseItem) {
  if (!item.rating) {
    return;
  }

  const rating = item.rating / 2;

  if (rating < 0 || rating > 5) {
    console.warn('Invalid rating value:', item, rating);
    return;
  }

  item.node.classList.add('rym-lastfm-stats--item');
  item.node.dataset.rymRating = `${rating} / 5`;
}

async function addArtistStats(item: ArtistItem) {
  if (!item.artistId) {
    return;
  }

  const artistName = item.artistName;
  if (!artistName) {
    return;
  }

  if (!item.avgRating || item.ratedReleasesQty === 0) {
    return;
  }

  const rating = item.avgRating / 2;

  item.node.classList.add('rym-lastfm-stats--item');
  item.node.dataset.rymRating = `${rating.toFixed(1)} / 5 (${item.ratedReleasesQty} rating${item.ratedReleasesQty === 1 ? '' : 's'})`;
};

async function render() {
  const {
    releases,
    artists,
  } = getItems();

  const releasesIds: string[] = [];
  const releasesWithoutId: ReleaseItem[] = [];

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
      normalizeForSearch(item.artistName),
      normalizeForSearch(item.title),
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

  const artistsData = await RecordsAPI.getByArtists(artists.map(item => item.artistName));

  artists.forEach(async (item) => {
    let avgRating: number | undefined;
    let ratedReleasesQty: number | undefined;

    if (artistsData[item.artistName]) {
      const records = artistsData[item.artistName] || [];
      const ratedRecords = records.filter(record => record.rating > 0);
      ratedReleasesQty = ratedRecords.length;
      avgRating = ratedRecords.reduce((sum, record) => sum + record.rating, 0) / ratedRecords.length;
    }

    await addArtistStats({
      ...item,
      avgRating,
      ratedReleasesQty,
    });
  });
}

export default {
  render,
  targetSelectors: [
    '#user_list',
  ],
};
