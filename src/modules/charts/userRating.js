let config = null;

async function render(_config) {
  config = _config;

  const items = document.querySelectorAll('.page_charts_section_charts_item');

  const itemsArray = [...items];

  const ids = itemsArray.map(item => {
    const id = item.id.replace('page_charts_section_charts_item_', '');
    return id || null;
  }).filter(Boolean);

  console.log(ids);
}

export default {
  render,
  targetSelectors: [
    '#page_charts_section_saved_charts',
  ],
};
