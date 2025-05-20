import * as utils from '@/helpers/utils.js';

import './searchStrict.css';

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
const searchItemsMore = [];
const searchItemsFiltered = [];

const SEARCH_HEADER_SELECTOR = '.page_search_results h3';
const SEARCH_ITEMS_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table';
const LAST_ITEM_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table + div';

function getNodeDirectTextContent(item) {
  if (!item) return '';

  const result = [];
  item.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result.push(node.textContent);
    }
  });

  return result.join(' ');
}

function injectShowAllButton() {
  const button = document.createElement('button');
  button.textContent = `Show all results (+ ${searchItemsMore.length} more)`;
  button.classList.add('btn', 'blue_btn', 'btn_small', 'btn-search-strict-show-all');
  const target = document.querySelector('.page_search_results h3');
  target.appendChild(button);
  button.addEventListener('click', () => {
    searchItems.forEach((item) => {
      item.style.display = '';
    });
    button.style.display = 'none';
  });
}

const validationRules = {
  a: {
    name: 'artist',
    selectors: {
      artistNameSelector: 'a.searchpage.artist',
      artistNameLocalizedSelector: 'a.searchpage.artist + span.smallgray',
      artistAkaSelector: '.subinfo',
    },
    validate: function (item, query) {
      const {
        artistNameSelector,
        artistNameLocalizedSelector,
        artistAkaSelector,
      } = this.selectors;

      const artistName = (item.querySelector(artistNameSelector)?.textContent || '')
        .trim()
        .toLowerCase();
      const artistNameDeburred = utils.deburr(artistName);

      const artistNameLocalized = (item.querySelector(artistNameLocalizedSelector)?.textContent || '')
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '');
      const artistNameLocalizedDeburred = utils.deburr(artistNameLocalized);

      const artistAka =
        getNodeDirectTextContent(
          item.querySelector(artistAkaSelector),
        ).trim() || '';
      const akaValues = utils.deburr(artistAka
        .toLowerCase()
        .trim()
        .replace(/^a\.k\.a:\s*/, ''))
        .split(', ')
        .map((aka) => aka.trim())
        .filter(Boolean);

      return !(
        artistNameDeburred !== query &&
        artistNameLocalizedDeburred !== query &&
        !akaValues.includes(query)
      );
    },
  },
  l: {
    name: 'release',
    selectors: {
      artistNameSelector: 'a.artist',
      releaseTitleSelector: 'a.searchpage',
    },
    validate: function (item, query) {
      const {
        artistNameSelector,
        releaseTitleSelector,
      } = this.selectors;

      let artistName = (item.querySelector(artistNameSelector)?.textContent || '')
        .trim()
        .toLowerCase()
        .replace(/ & /g, ' and ');

      let artistNameLocalized;

      const artistNameParts = artistName.split(' ');

      if (artistNameParts.length > 1) {
        const lastPart = artistNameParts.pop();
        if (lastPart.match(/^\[|\]$/)) {
          artistNameLocalized = lastPart.replace(/^\[|\]$/g, '');
          artistName = artistNameParts.join(' ');
        }
      }

      const artistNameDeburred = utils.deburr(artistName);
      const artistNameLocalizedDeburred = artistNameLocalized ? utils.deburr(artistNameLocalized) : artistNameLocalized;

      const releaseTitleDeburred = utils
        .deburr(item.querySelector(releaseTitleSelector)?.textContent.toLowerCase() || '');

      let _query = utils.deburr(query).replace(/ & /g, ' and ');

      let hasArtist = false;
      let hasReleaseTitle = false;

      if (
        _query.includes(artistNameDeburred)
        || _query.includes(artistNameLocalizedDeburred)
      ) {
        hasArtist = true;
        _query = query.replace(artistNameDeburred, '').trim();
      }

      if (_query.includes(releaseTitleDeburred)) {
        hasReleaseTitle = true;
        _query = query.replace(releaseTitleDeburred, '').trim();
      }

      return hasArtist && hasReleaseTitle;
    },
  },
  z: {
    name: 'song',
    selectors: {
      artistNameSelector: '.infobox td:nth-child(2) > span .ui_name_locale',
      trackNameSelector: '.infobox td:nth-child(2) > table .ui_name_locale_original',
    },
    validate: function (item, query) {
      const {
        artistNameSelector,
        trackNameSelector,
      } = this.selectors;

      const artistName = utils.deburr(item.querySelector(artistNameSelector)?.textContent.trim().toLowerCase() || '');
      const trackName = utils.deburr(item.querySelector(trackNameSelector)?.textContent.trim().toLowerCase() || '');

      let _query = utils.deburr(query);

      let hasArtist = false;
      let hasTrackName = false;

      if (_query.includes(artistName)) {
        hasArtist = true;
        _query = query.replace(artistName, '').trim();
      }

      if (_query.includes(trackName)) {
        hasTrackName = true;
        _query = query.replace(trackName, '').trim();
      }

      return hasArtist && hasTrackName;
    },
  },
}

async function render(config) {
  if (!config) return;

  const urlParams = new URLSearchParams(window.location.search);
  const strict = urlParams.get('strict');
  const searchType = urlParams.get('searchtype');

  if (strict !== 'true' || !Object.keys(SEARCH_TYPES).includes(searchType)) return;

  const searchTerm = utils.deburr(urlParams.get('searchterm').toLowerCase());

  searchItems = document.querySelectorAll(SEARCH_ITEMS_SELECTOR);

  if (!searchItems.length) return;

  Array.from(searchItems).forEach((item) => {
    if (validationRules[searchType].validate(item, searchTerm)) {
      searchItemsFiltered.push(item);
    } else {
      searchItemsMore.push(item);
    }
  });

  const searchMoreLink = document.querySelector('#search_morelink');

  if (searchMoreLink) {
    searchMoreLink.href += '&strict=true';
  }

  // TODO - HIGHLIGHT MASTER RELEASE
  // if (searchType === 'l' && searchItemsFiltered.length) {
  //   const links = searchItemsFiltered.map((item) => {
  //     const url = item.querySelector(validationRules.l.selectors.releaseTitleSelector).href;
  //     return url;
  //   }).sort((a, b) => a.length - b.length);

  //   console.log('Links:', links[0]);
  // }

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

        const url = new URL(window.location.href);
        const page = url.searchParams.get('page') ?? '1';

        warning.appendChild(utils.createParagraph(`No direct matches found on the #${page} page.`));

        if (searchType === 'a') {
          const p = utils.createParagraph('This artist may not be added yet into RYM database or too obscure.');
          p.appendChild(utils.createLink('/artist/profile_ac', 'Add artist', false));
          warning.appendChild(p);
        } else if (searchType === 'l') {
          const p = utils.createParagraph('This release may not be added yet into RYM database or too obscure.');
          warning.appendChild(p);
        } else if (searchType === 'z') {
          const p = utils.createParagraph('This song may not be added yet into RYM database or too obscure.');
          warning.appendChild(p);
        }

        header.insertAdjacentElement('afterend', warning);

        if (searchMoreLink) {
          const tryNextPageLink = searchMoreLink.cloneNode(true);
          tryNextPageLink.classList.add(...['btn', 'blue_btn', 'btn_small']);
          tryNextPageLink.textContent = 'Try next page';
          tryNextPageLink.style.marginBottom = '1rem';
          warning.insertAdjacentElement('afterend', tryNextPageLink);
        }
      }
    }
  }
}

export default {
  render,
  targetSelectors: [SEARCH_ITEMS_SELECTOR, LAST_ITEM_SELECTOR],
};
