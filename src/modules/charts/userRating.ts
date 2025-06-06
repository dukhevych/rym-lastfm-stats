import { RecordsAPI } from '@/helpers/records-api';
import './userRating.css';

function getItems() {
  return Array.from(document.querySelectorAll('.page_charts_section_charts_item'));
}

function getIds() {
  return getItems().map(item => {
    const id = item.id.replace('page_charts_section_charts_item_', '');
    return id || null;
  }).filter(Boolean);
}

function addUserRating(album) {
  const rating = album.rating / 2;

  if (rating < 0 || rating > 5) {
    console.warn('Invalid rating value:', album, rating);
    return;
  }

  const id = `page_charts_section_charts_item_${album.id}`;
  const item = document.getElementById(id);

  if (!item) return;

  item.classList.add('rym-lastfm-stats--item');
  item.dataset.rymRating = `${rating} / 5`;
}

async function render() {
  const releases = await RecordsAPI.getByIds(getIds());
  releases.filter(Boolean).forEach(addUserRating);

  const target = document.querySelector('#page_charts_section_charts');

  if (target) {
    const observer = new MutationObserver(async (mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          const releases = await RecordsAPI.getByIds(getIds());
          releases.filter(Boolean).forEach(addUserRating);
        }
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: false,
    });
  }
}

export default {
  render,
  targetSelectors: [
    '#page_charts_section_charts',
  ],
};
