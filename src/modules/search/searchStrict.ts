import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import { RYMEntityCode } from '@/helpers/enums';
import { createElement as h } from '@/helpers/utils';

import './searchStrict.css';

let searchItems: NodeListOf<HTMLElement>;
let searchItemsToHide: HTMLElement[] = [];
let searchItemsFiltered: HTMLElement[] = [];

const SEARCH_HEADER_SELECTOR = '.page_search_results h3';
const SEARCH_ITEMS_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table';
const LAST_ITEM_SELECTOR = SEARCH_HEADER_SELECTOR + ' ~ table + div';

function injectShowAllButton() {
  const button = h('button', {
    className: ['btn', 'blue_btn', 'btn_small', 'btn-search-strict-show-all'],
    onClick: () => {
      searchItems.forEach((item) => {
        item.style.display = '';
      });
      button.style.display = 'none';
    }
  }, `Show all results (+ ${searchItemsToHide.length} more)`);

  const target: HTMLElement | null = document.querySelector('.page_search_results h3');

  if (target) target.appendChild(button);
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
    validate: function (item: HTMLElement, query: string) {
      const {
        artistNameSelector,
        artistNameLocalizedSelector,
        artistAkaSelector,
      } = this.selectors;

      const _query = utils.normalizeForSearch(query);

      const artistName = utils.normalizeForSearch(item.querySelector(artistNameSelector)?.textContent || '');

      const artistNameLocalized = utils.normalizeForSearch(
        utils.removeArtistNameBrackets(
          item.querySelector(artistNameLocalizedSelector)?.textContent || ''
        )
      );

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
    validate: function (item: HTMLElement, query: string) {
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
    validate: function (item: HTMLElement, query: string) {
      const {
        artistNameSelector,
        trackNameSelector,
      } = this.selectors;

      const artistName = utils.normalizeForSearch(item.querySelector(artistNameSelector)?.textContent || '');
      const trackName = utils.normalizeForSearch(item.querySelector(trackNameSelector)?.textContent || '');

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

async function render(config: ProfileOptions) {
  if (!config) return;

  const urlParams = new URLSearchParams(window.location.search);
  const strict = urlParams.get('strict');
  const searchType = urlParams.get('searchtype') as RYMEntityCode;

  if (strict !== 'true' || !Object.values(RYMEntityCode).includes(searchType)) return;

  const searchTerm = utils.deburr(urlParams.get('searchterm')?.toLowerCase() || '');

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
        item.dataset.validity = String(validity);
      }
      searchItemsFiltered.push(item);
    } else {
      searchItemsToHide.push(item);
    }
  });

  const searchMoreLink: HTMLAnchorElement | null = document.querySelector('#search_morelink');

  if (searchMoreLink) {
    searchMoreLink.href += '&strict=true';
  }

  async function addReleaseUserRating(item: HTMLElement) {
    const releaseIdEl: HTMLElement | null = item.querySelector(validationRules[RYMEntityCode.Release].selectors.releaseTitleSelector);
    const releaseId = releaseIdEl?.title || '';
    const id = utils.extractIdFromTitle(releaseId);

    if (id) {
      const record = await RecordsAPI.getById(id);

      if (record && record.rating) {
        item.dataset.rymRating = String(record.rating / 2);
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
        const url = new URL(window.location.href);
        const page = url.searchParams.get('page') ?? '1';

        const warning = h('div', {
          className: ['rym-warning'],
        }, h('p', {}, `No direct matches found on the #${page} page.`));

        const navigation = h('div');

        if (searchType === RYMEntityCode.Artist) {
          const p = h('p', {}, [
            'This artist may not be added yet into RYM database or too obscure.',
            h('a', {
              href: '/artist/profile_ac',
            }, 'Add artist'),
          ]);
          warning.appendChild(p);
        } else if (searchType === RYMEntityCode.Release) {
          const p = h('p', {}, 'This release may not be added yet into RYM database or too obscure.');
          warning.appendChild(p);
        } else if (searchType === RYMEntityCode.Song) {
          const p = h('p', {}, 'This song may not be added yet into RYM database or too obscure.');
          warning.appendChild(p);
        }

        header.insertAdjacentElement('afterend', warning);
        warning.insertAdjacentElement('afterend', navigation);

        if (searchMoreLink) {
          const tryNextPageLink = searchMoreLink.cloneNode(true) as typeof searchMoreLink;
          tryNextPageLink.classList.add(...['btn', 'blue_btn', 'btn_small']);
          tryNextPageLink.textContent = 'Try next page';
          tryNextPageLink.style.marginBottom = '1rem';
          navigation.appendChild(tryNextPageLink);
        }

        if (searchType === RYMEntityCode.Release) {
          const url = new URL(window.location.href);
          const searchParams = new URLSearchParams(url.search);
          searchParams.delete('page');
          searchParams.set('searchtype', RYMEntityCode.Artist);
          const newRelativeUrl = url.pathname + '?' + searchParams.toString();

          const searchArtistInsteadLink = h('a', {
            href: newRelativeUrl,
            className: ['btn', 'blue_btn', 'btn_small'],
          }, 'Search artist instead');

          navigation.appendChild(searchArtistInsteadLink);
        }
      }
    }
  }
}

export default {
  render,
  targetSelectors: [SEARCH_ITEMS_SELECTOR, LAST_ITEM_SELECTOR],
};
