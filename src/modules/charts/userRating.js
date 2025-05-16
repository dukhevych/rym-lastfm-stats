import { getRecords } from '@/helpers/db';

let config = null;

function getIds() {
  const items = document.querySelectorAll('.page_charts_section_charts_item');

  const itemsArray = [...items];

  const ids = itemsArray.map(item => {
    const id = item.id.replace('page_charts_section_charts_item_', '');
    return id || null;
  }).filter(Boolean);

  return ids;
}

async function readAlbumData(ids) {
  return getRecords(ids);
}

function addUserRating(album) {
  const rating = album.rating / 2;

  if (rating <0 || rating > 5) {
    console.warn('Invalid rating value:', album, rating);
    return;
  }

  const id = `page_charts_section_charts_item_${album.id}`;
  const item = document.getElementById(id);
  if (!item) return;
  const container = item.querySelector('.page_charts_section_charts_item_info');
  container.style.position = 'relative';

  const userRating = document.createElement('span');
  userRating.style.position = 'absolute';
  userRating.style.top = '0';
  userRating.style.right = '0';
  userRating.style.fontSize = '1.25em';
  userRating.style.fontWeight = 'bold';
  userRating.style.color = '#383';

  userRating.innerText = `${album.rating / 2}`;

  container.appendChild(userRating);
}

async function render(_config) {
  config = _config;

  const albums = await readAlbumData(getIds());

  albums.filter(Boolean).forEach(addUserRating);

  const target = document.querySelector('#page_charts_section_charts');

  if (target) {
    const observer = new MutationObserver(async (mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const albums = await readAlbumData(getIds());
          albums.filter(Boolean).forEach(addUserRating);
        }
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: false,
    });

    console.log('Observer attached.');
  } else {
    console.warn('Target element not found.');
  }
}

export default {
  render,
  targetSelectors: [
    '#page_charts_section_charts',
  ],
};
