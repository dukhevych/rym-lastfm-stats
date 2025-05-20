import { RecordsAPI } from '@/helpers/records-api';

function getItems() {
  const releases = [];
  const artists = [];

  Array.from(document.querySelectorAll('#user_list > tbody > tr')).forEach(item => {
    const albumEl = item.querySelector('a.list_album');
    const artistEl = item.querySelector('a.list_artist');
    const artImgEl = item.querySelector('.list_art img');

    let itemType = null;

    if (artistEl) {
      itemType = albumEl ? 'l' : 'a';
    }

    if (itemType === 'l') {
      let releaseId = null;

      if (artImgEl) {
        releaseId = artImgEl.id.replace('img_l_', '');
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

    if (itemType === 'a') {
      let artistId = null;

      if (artImgEl) {
        artistId = artImgEl.id.replace('img_a_', '');
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
  const wrapper = item.node.querySelector('.main_entry');

  if (!wrapper) return;

  const rating = item.rating / 2;
  const ratingElement = document.createElement('span');
  ratingElement.className = 'user_rating';
  ratingElement.style.fontSize = '1.25em';
  ratingElement.style.fontWeight = 'bold';
  ratingElement.style.color = '#383';
  ratingElement.style.position = 'absolute';
  ratingElement.style.top = '0';
  ratingElement.style.right = '0';
  ratingElement.innerText = `${rating}`;

  wrapper.style.position = 'relative';
  wrapper.appendChild(ratingElement);
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

    if (release) {
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
