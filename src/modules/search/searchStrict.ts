import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';

import './searchStrict.css';

let searchItems;
const searchItemsToHide = [];
const searchItemsFiltered = [];

const SEARCH_HEADER_SELECTOR = '.page_search_results h3';
const SEARCH_ITEMS_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table';
const LAST_ITEM_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table + div';

function injectShowAllButton() {
  const button = document.createElement('button');
  button.textContent = `Show all results (+ ${searchItemsToHide.length} more)`;
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

// function addReleaseIdAsOrder(item) {
//   const releaseTitleSelector = validationRules[RYMEntityCode.Release].selectors.releaseTitleSelector;
//   const releaseTitle = item.querySelector(releaseTitleSelector);
//   let releaseId = releaseTitle?.title || '';
//   releaseId = utils.extractIdFromTitle(releaseId);
//   if (releaseId) {
//     item.style.order = releaseId;
//   }
// };

const validationRules = {
  [RYMEntityCode.Artist]: {
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

      const _query = utils.normalizeForSearch(query);

      const artistName = utils.normalizeForSearch(item.querySelector(artistNameSelector)?.textContent);

      const artistNameLocalized = utils.normalizeForSearch(
        item.querySelector(artistNameLocalizedSelector)?.textContent
      ).replace(/^\[|\]$/g, ''); // remove [ ] brackets

      const artistAka =
        utils.getNodeDirectTextContent(item.querySelector(artistAkaSelector)).trim();

      const akaValues = artistAka.replace(/^a\.k\.a:\s*/, '')
        .split(', ')
        .map((aka) => utils.normalizeForSearch(aka))
        .filter(Boolean);

      return (
        utils.checkPartialStringsMatch(artistName, _query)
        || utils.checkPartialStringsMatch(artistNameLocalized, _query)
        || akaValues.some((aka) => utils.checkPartialStringsMatch(aka, _query))
      );
    },
  },
  [RYMEntityCode.Release]: {
    selectors: {
      artistNameSelector: 'a.artist',
      releaseTitleSelector: 'a.searchpage',
    },
    validate: function (item, query) {
      const {
        artistNameSelector,
        releaseTitleSelector,
      } = this.selectors;

      let _query = utils.normalizeForSearch(query);

      const artistLinks = Array.from(item.querySelectorAll(artistNameSelector));
      const artistNames = artistLinks.map((artistLink) => {
        return utils.getNodeDirectTextContent(artistLink).trim();
      }).filter(Boolean);
      const artistNamesNormalized = artistNames.map((name) => {
        return utils.normalizeForSearch(name);
      });
      const artistNamesLocalized = artistLinks.map((artistLink) => {
        return (artistLink.querySelector('.subtext')?.textContent || '').replace(/^\[(.*)\]$/, '$1');
      });
      const artistNamesLocalizedNormalized = artistNamesLocalized.map((name) => {
        return utils.normalizeForSearch(name);
      });

      const releaseTitleNormalized = utils
        .normalizeForSearch(item.querySelector(releaseTitleSelector)?.textContent || '');

      let hasArtist = false;
      let hasReleaseTitle = false;
      let partialMatch = false;

      [...artistNamesNormalized, ...artistNamesLocalizedNormalized].forEach((name) => {
        if (name && utils.checkPartialStringsMatch(name, _query)) {
          hasArtist = true;
          _query = _query.replace(name, '').trim();
        }
      });

      if (!hasArtist) return false;

      const _queryNoParenthesis = _query.replace(/[()]/g, '').trim();
      const _queryCleaned = utils.cleanupReleaseEdition(_query);

      if (
        releaseTitleNormalized === _query ||
        releaseTitleNormalized === _queryNoParenthesis
      ) {
        hasReleaseTitle = true;
      } else if (
        releaseTitleNormalized === _queryCleaned ||
        utils.checkPartialStringsMatch(releaseTitleNormalized, _query) ||
        utils.checkPartialStringsMatch(releaseTitleNormalized, _queryNoParenthesis) ||
        utils.checkPartialStringsMatch(releaseTitleNormalized, _queryCleaned)
      ) {
        hasReleaseTitle = true;
        partialMatch = true;
      }

      const matched = hasArtist && hasReleaseTitle;

      if (!matched) return false;

      return partialMatch ? 'partial' : 'full';
    },
  },
  [RYMEntityCode.Song]: {
    selectors: {
      artistNameSelector: '.infobox td:nth-child(2) > span .ui_name_locale',
      trackNameSelector: '.infobox td:nth-child(2) > table .ui_name_locale_original',
    },
    validate: function (item, query) {
      const {
        artistNameSelector,
        trackNameSelector,
      } = this.selectors;

      const artistName = utils.normalizeForSearch(item.querySelector(artistNameSelector)?.textContent);
      const trackName = utils.normalizeForSearch(item.querySelector(trackNameSelector)?.textContent);

      let _query = utils.normalizeForSearch(query);

      let hasArtist = false;
      let hasTrackName = false;

      if (utils.checkPartialStringsMatch(_query, artistName)) {
        hasArtist = true;
        _query = query.replace(artistName, '').trim();
      }

      if (utils.checkPartialStringsMatch(_query, trackName)) {
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

  if (strict !== 'true' || !Object.values(RYMEntityCode).includes(searchType)) return;

  const searchTerm = utils.deburr(urlParams.get('searchterm').toLowerCase());

  searchItems = document.querySelectorAll(SEARCH_ITEMS_SELECTOR);

  if (!searchItems.length) return;

  Array.from(searchItems).forEach((item) => {
    item.classList.add('rym-search-strict--item');
    item.dataset.itemType = constants.RYM_ENTITY_CODES_INVERTED[searchType];

    const isReleaseSearch = searchType === RYMEntityCode.Release;

    if (isReleaseSearch) {
      addReleaseUserRating(item);
      // addReleaseIdAsOrder(item);
    }

    const validity = validationRules[searchType].validate(item, searchTerm);

    if (validity !== false) {
      if (isReleaseSearch) {
        item.dataset.validity = validity;
      }
      searchItemsFiltered.push(item);
    } else {
      searchItemsToHide.push(item);
    }
  });

  const searchMoreLink = document.querySelector('#search_morelink');

  if (searchMoreLink) {
    searchMoreLink.href += '&strict=true';
  }

  async function addReleaseUserRating(item) {
    const releaseId = item.querySelector(validationRules.l.selectors.releaseTitleSelector).title;
    const id = utils.extractIdFromTitle(releaseId);

    if (id) {
      const record = await RecordsAPI.getById(id);

      if (record && record.rating) {
        item.dataset.rymRating = record.rating / 2;
      }
    }
  }

  if (searchItemsToHide.length) {
    if (searchItemsToHide.length < searchItems.length) {
      searchItemsToHide.forEach(item => {
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

        if (searchType === RYMEntityCode.Artist) {
          const p = utils.createParagraph('This artist may not be added yet into RYM database or too obscure.');
          p.appendChild(utils.createLink('/artist/profile_ac', 'Add artist', false));
          warning.appendChild(p);
        } else if (searchType === RYMEntityCode.Release) {
          const p = utils.createParagraph('This release may not be added yet into RYM database or too obscure.');
          warning.appendChild(p);
        } else if (searchType === RYMEntityCode.Song) {
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
