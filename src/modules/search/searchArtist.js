let searchItems;

const SEARCH_ITEMS_SELECTOR = '.page_search_results h3 ~ table';

function injectShowAllButton() {
  const button = document.createElement('button');
  button.textContent = 'Show all found artists';
  button.classList.add('btn', 'blue_btn', 'btn_small');
  button.style.marginLeft = '10px';
  button.style.fontSize = '0.5em';
  button.style.position = 'relative';
  button.style.top = '-3px';
  const target = document.querySelector('.page_search_results h3');
  target.appendChild(button);
  button.addEventListener('click', () => {
    searchItems.forEach(item => {
      item.style.display = '';
    });
    button.style.display = 'none';
  });
}

async function render(config) {
  if (!config) return;

  if (!config.searchArtistStrict) return;

  const urlParams = new URLSearchParams(window.location.search);
  const strict = urlParams.get('strict');

  if (strict !== 'true') return;

  const searchTerm = urlParams.get('searchterm');

  searchItems = document.querySelectorAll(SEARCH_ITEMS_SELECTOR);

  const artistNameSelector = 'a.searchpage.artist';
  const artistAkaSelector = '.subinfo';

  searchItems.forEach(item => {
    const artistName = item.querySelector(artistNameSelector)?.textContent || '';
    const artistAka = item.querySelector(artistAkaSelector)?.textContent || '';

    if (!artistName.toLowerCase().includes(searchTerm) && !artistAka.toLowerCase().includes(searchTerm)) {
      item.style.display = 'none';
    }
  });

  injectShowAllButton();
}

export default {
  render,
  targetSelectors: [SEARCH_ITEMS_SELECTOR],
};
