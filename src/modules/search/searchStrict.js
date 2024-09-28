import { deburr } from 'lodash';
import * as utils from '@/helpers/utils.js';

const SEARCH_TYPES = {
  a: 'artist',
  l: 'release',
  z: 'song',
  // y: 'v/a release',
  // b: 'label',
  // h: 'genre',
  // u: 'user',
  // s: 'list',
};

let searchItems;
let searchItemsMore = [];

const SEARCH_HEADER_SELECTOR = '.page_search_results h3';
const SEARCH_ITEMS_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table';
const LAST_ITEM_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table + div';

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
  button.textContent = `Show all results (+ ${searchItemsMore.length} more)`;
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
      const artistName = deburr(item.querySelector(artistNameSelector)?.textContent) || '';
      const artistAka = getNodeDirectTextContent(item.querySelector(artistAkaSelector)).trim() || '';
      const akaValues = artistAka.toLowerCase().trim().replace(/^a\.k\.a:\s*/, '').split(', ');

      if (artistName.toLowerCase().trim() !== searchTerm && !akaValues.includes(searchTerm)) {
        searchItemsMore.push(item);
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
        searchItemsMore.push(item);
      }
    });
  } else if (searchType === 'z') {
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
        searchItemsMore.push(item);
      }
    });
  }

  if (searchItemsMore.length) {
    if (searchItemsMore.length < searchItems.length) {
      searchItemsMore.forEach(item => {
        item.style.display = 'none';
      });
      injectShowAllButton();
    } else {
      const header = document.querySelector(SEARCH_HEADER_SELECTOR);

      if (header) {
        const warning = document.createElement('div');
        warning.classList.add('rym-warning');
        warning.appendChild(utils.createParagraph('No exact matches found.'));

        const style = document.createElement('style');
        style.textContent = `
          .rym-warning {
            padding: 0.5rem 2rem;
            margin: 1rem 0;
            font-weight: bold;
            border-left: 10px solid currentColor;
          }

          .rym-warning p { margin: 0; }

          .rym-warning p + p { margin-top: 0.5em; }
        }`;
        document.head.appendChild(style);

        if (searchType === 'a') {
          const p = utils.createParagraph('This artist may not be added yet into RYM database. ');
          p.appendChild(utils.createLink('/artist/profile_ac', 'Add artist', false));
          warning.appendChild(p);
        } else if (searchType === 'l') {
          warning.appendChild(utils.createParagraph('This release may not be added yet into RYM database.'));
        } else if (searchType === 'z') {
          warning.appendChild(utils.createParagraph('This song may not be added yet into RYM database.'));
        }

        header.insertAdjacentElement('afterend', warning);
      }
    }
  }
}

export default {
  render,
  targetSelectors: [SEARCH_ITEMS_SELECTOR, LAST_ITEM_SELECTOR],
};
