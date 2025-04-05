import { getMultipleRymAlbums } from '@/helpers/rymSync';

let config = null;

async function render(_config) {
  config = _config;

  const items = document.querySelectorAll('.page_charts_section_charts_item');

  const itemsArray = [...items];

  const ids = itemsArray.map(item => {
    const id = item.id.replace('page_charts_section_charts_item_', '');
    return id || null;
  }).filter(Boolean);

  const albums = await getMultipleRymAlbums(ids);

  albums.filter(Boolean).forEach((album) => {
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

    userRating.innerText = `${album.rating / 2} / 5`;

    container.appendChild(userRating);
  });
}

export default {
  render,
  targetSelectors: [
    '#page_charts_section_saved_charts',
  ],
};
