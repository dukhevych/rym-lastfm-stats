const SEARCH_TYPES = {
  a: 'artist',
  l: 'release',
  z: 'song',
  y: 'v/a release',
  b: 'label',
  h: 'genre',
  u: 'user',
  s: 'list',
};

let searchItems;

const SEARCH_ITEMS_SELECTOR = '.page_search_results h3 ~ table';
const LAST_ITEM_SELECTOR = '.page_search_results h3 ~ table + div';

function getNodeDirectTextContent(item) {
  if (!item) return '';

  const result = [];
  item.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      result.push(node.textContent);
    }
  });

  return result.join(' ');
}

function injectShowAllButton() {
  const button = document.createElement('button');
  button.textContent = 'Show all';
  button.classList.add('btn', 'blue_btn', 'btn_small');
  button.style.marginLeft = '10px';
  button.style.fontSize = '0.5em';
  button.style.position = 'relative';
  button.style.top = '-4px';
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

  if (!config.searchStrict) return;

  const urlParams = new URLSearchParams(window.location.search);
  const strict = urlParams.get('strict');
  const searchType = urlParams.get('searchtype');

  if (strict !== 'true' || !Object.keys(SEARCH_TYPES).includes(searchType)) return;

  const searchTerm = urlParams.get('searchterm').toLowerCase();

  searchItems = document.querySelectorAll(SEARCH_ITEMS_SELECTOR);

  if (searchType === 'a') {
    const artistNameSelector = 'a.searchpage.artist';
    const artistAkaSelector = '.subinfo';

    searchItems.forEach(item => {
      const artistName = item.querySelector(artistNameSelector)?.textContent || '';
      const artistAka = getNodeDirectTextContent(item.querySelector(artistAkaSelector)).trim() || '';

      if (artistName.toLowerCase().trim() !== searchTerm && !artistAka.toLowerCase().trim().includes(searchTerm)) {
        item.style.display = 'none';
      }
    });
  } else if (searchType === 'l') {
    const artistNameSelector = 'a.artist';
    const releaseTitleSelector = 'a.searchpage';

    searchItems.forEach(item => {
      const artistName = item.querySelector(artistNameSelector)?.textContent.toLowerCase() || '';
      const releaseTitle = item.querySelector(releaseTitleSelector)?.textContent.toLowerCase() || '';

      let query = searchTerm;

      let hasArtist = false;
      let hasReleaseTitle = false;

      if (query.includes(artistName)) {
        hasArtist = true;
        query = searchTerm.replace(artistName, '').trim();
      }

      if (query.includes(releaseTitle)) {
        hasReleaseTitle = true;
        query = searchTerm.replace(releaseTitle, '').trim();
      }

      if (!hasArtist || !hasReleaseTitle) {
        item.style.display = 'none';
      }
    });
  } else if (searchType === 'z') {
    // const artistNameSelector = 'b .ui_name_locale > .ui_name_locale_original';
    const artistNameSelector = '.infobox td:nth-child(2) > span .ui_name_locale';
    const trackNameSelector = '.infobox td:nth-child(2) > table .ui_name_locale_original';

    searchItems.forEach(item => {
      const artistName = item.querySelector(artistNameSelector)?.textContent.trim().toLowerCase() || '';
      const trackName = item.querySelector(trackNameSelector)?.textContent.trim().toLowerCase() || '';

      let query = searchTerm;

      let hasArtist = false;
      let hasTrackName = false;

      if (query.includes(artistName)) {
        hasArtist = true;
        query = searchTerm.replace(artistName, '').trim();
      }

      if (query.includes(trackName)) {
        hasTrackName = true;
        query = searchTerm.replace(trackName, '').trim();
      }

      if (!hasArtist || !hasTrackName) {
        item.style.display = 'none';
      }
    });
  }

  injectShowAllButton();
}

export default {
  render,
  targetSelectors: [SEARCH_ITEMS_SELECTOR, LAST_ITEM_SELECTOR],
};
