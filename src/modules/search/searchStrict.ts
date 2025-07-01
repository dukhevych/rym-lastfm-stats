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
    validate: function (item: HTMLElement, query: string, enhArtist: string) {
      const {
        artistNameSelector,
        artistNameLocalizedSelector,
        artistAkaSelector,
      } = this.selectors;

      // Enhanced artist validation
      const artistNameLocalized = utils.normalizeForSearch(
        utils.removeArtistNameBrackets(
          item.querySelector(artistNameLocalizedSelector)?.textContent || ''
        )
      );
      if (artistNameLocalized === enhArtist) return 'full';

      const artistName = utils.normalizeForSearch(item.querySelector(artistNameSelector)?.textContent || '');
      if (artistName === enhArtist) return 'full';

      const artistAka = utils.getNodeDirectTextContent(item.querySelector(artistAkaSelector)).trim();
      const akaValues = artistAka.replace(/^a\.k\.a:\s*/, '')
        .split(', ')
        .map((aka) => utils.normalizeForSearch(aka))
        .filter(Boolean);
      if (akaValues.includes(enhArtist)) return 'full';

      // Alternative validation with normalized search term
      // Will be used if the above validation against original artist name from custom query parameter fails
      const _query = utils.normalizeForSearch(query);
      if (artistName === _query) return 'full';
      if (artistNameLocalized === _query) return 'full';
      if (akaValues.includes(_query)) return 'full';
      if (artistName.includes(_query)) return 'partial';
      if (artistNameLocalized.includes(_query)) return 'partial';
      return false;
    },
  },
  [RYMEntityCode.Release]: {
    selectors: {
      artistNameSelector: 'a.artist',
      releaseTitleSelector: 'a.searchpage',
    },
    validate: function (item: HTMLElement, query: string, enhArtist: string, enhRelease: string) {
      const {
        artistNameSelector,
        releaseTitleSelector,
      } = this.selectors;

      // let _query = utils.normalizeForSearch(query);

      function validateArtist(target: string) {
        const getArtistLinks = utils.lazy(() => Array.from(item.querySelectorAll(artistNameSelector)));
        const getArtistNamesLocalized = utils.lazy(() => getArtistLinks().map((artistLink) => {
          return (artistLink.querySelector('.subtext')?.textContent || '').replace(/^\[(.*)\]$/, '$1');
        }));

        const values = [];
        const valuesNormalized = [];

        if (getArtistNamesLocalized().includes(target)) return 'full';
        else values.push(...getArtistNamesLocalized());

        const getArtistNames = utils.lazy(() => getArtistLinks().map((artistLink) => {
          return utils.getNodeDirectTextContent(artistLink).trim();
        }).filter(Boolean));
        if (getArtistNames().includes(target)) return 'full';
        else values.push(...getArtistNames());

        const targetNormalized = utils.normalizeForSearch(target);

        const getArtistNamesLocalizedNormalized = utils.lazy(() => getArtistNamesLocalized().map((name) => {
          return utils.normalizeForSearch(name);
        }));
        if (getArtistNamesLocalizedNormalized().includes(targetNormalized)) return 'full';
        else valuesNormalized.push(...getArtistNamesLocalizedNormalized());

        const getArtistNamesNormalized = utils.lazy(() => getArtistNames().map((name) => {
          return utils.normalizeForSearch(name);
        }));
        if (getArtistNamesNormalized().includes(targetNormalized)) return 'full';
        else valuesNormalized.push(...getArtistNamesNormalized());

        if (values.some((value) => utils.checkPartialStringsMatch(value, target))) return 'partial';
        if (valuesNormalized.some((value) => utils.checkPartialStringsMatch(value, targetNormalized))) return 'partial';

        return false;
      }

      const hasArtist = validateArtist(enhArtist);

      function validateRelease(target: string) {
        const getReleaseTitle = utils.lazy(() => (item.querySelector(releaseTitleSelector)?.textContent || '').trim());
        const getReleaseTitleNormalized = utils.lazy(() => utils.normalizeForSearch(getReleaseTitle()));
        const getReleaseTitleNoEdition = utils.lazy(() => utils.cleanupReleaseEdition(getReleaseTitle()));
        const getReleaseTitleNoEditionNormalized = utils.lazy(() => utils.normalizeForSearch(getReleaseTitleNoEdition()));
        const getReleaseTitleEdition = utils.lazy(() => utils.extractReleaseEditionType(getReleaseTitle()));
        const getTarget = () => target;
        const getTargetNormalized = utils.lazy(() => utils.normalizeForSearch(getTarget()));
        const getTargetNoEdition = utils.lazy(() => utils.cleanupReleaseEdition(getTarget()));
        const getTargetNoEditionNormalized = utils.lazy(() => utils.normalizeForSearch(getTargetNoEdition()));
        const getTargetEdition = utils.lazy(() => utils.extractReleaseEditionType(getTarget()));

        console.log(getReleaseTitle(), '=', getTarget());
        console.log(getReleaseTitleNormalized(), '=', getTargetNormalized());

        // Ideal match
        if (getReleaseTitle() === getTarget()) return 'full';

        // Ideal normalized match
        if (getReleaseTitleNormalized() === getTargetNormalized()) return 'full';

        // Edition
        if (getReleaseTitleEdition() && getTargetEdition()) {
          if ((
            getReleaseTitleNoEdition() === getTargetNoEdition()
            || getReleaseTitleNoEditionNormalized() === getTargetNoEditionNormalized()
          )) {
            // No edition part match (ideal or normalized) + edition part match
            if (getReleaseTitleEdition() === getTargetEdition()) return 'full';
            // No edition part match (ideal or normalized) + edition part mismatch
            else return 'partial';
          } else {
            // Doubtful case?
            // No edition part mismatch (ideal or normalized) + edition part match
            if (getReleaseTitleEdition() === getTargetEdition()) return 'partial';
          }
        } else {
          // No edition part match (ideal or normalized) + no edition for either
          // if ((
          //   getReleaseTitleNoEdition() === getTargetNoEdition()
          //   || getReleaseTitleNoEditionNormalized() === getTargetNoEditionNormalized()
          // )) return 'partial';
        }

        // No edition part match (ideal or normalized) + no edition for item's release title
        if (getTargetEdition() && !getReleaseTitleEdition()) {
          if ((
            getTargetNoEdition() === getReleaseTitle()
            || getTargetNoEditionNormalized() === getReleaseTitleNormalized()
          )) return 'full';
        }

        if (utils.checkPartialStringsMatch(getReleaseTitle(), getTarget())) return 'partial';

        if (utils.checkPartialStringsMatch(getReleaseTitleNormalized(), getTargetNormalized())) return 'partial';

        return false;
      }

      const hasReleaseTitle = validateRelease(enhRelease);

      if (hasArtist || hasReleaseTitle) {
        console.log(item);
        console.log(hasArtist, hasReleaseTitle);
      }
      console.log('==================');

      if (!hasArtist || !hasReleaseTitle) return false;
      if (hasArtist === 'full' && hasReleaseTitle === 'full') return 'full';

      return 'partial';
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

  const searchTerm = utils.deburr(urlParams.get('searchterm') || '');
  const enhArtist = urlParams.get('enh_artist') || '';
  const enhRelease = urlParams.get('enh_release') || '';
  const enhTrack = urlParams.get('enh_track') || '';

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

    const validity = validationRules[searchType].validate(item, searchTerm, enhArtist, enhRelease);

    if (validity !== false) {
      if (typeof validity === 'string') {
        item.dataset.validity = validity;
      }
      searchItemsFiltered.push(item);
    } else {
      searchItemsToHide.push(item);
    }
  });

  const searchMoreLink: HTMLAnchorElement | null = document.querySelector('#search_morelink');

  if (searchMoreLink) {
    const currentUrl = new URL(searchMoreLink.href);
    const incomingParams = new URLSearchParams(window.location.search);

    incomingParams.forEach((value, key) => {
      if (!currentUrl.searchParams.has(key)) {
        currentUrl.searchParams.set(key, value);
      }
    });

    searchMoreLink.href = currentUrl.toString();
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
          searchParams.set('searchterm', utils.normalizeForSearch(searchParams.get('enh_artist') || ''));
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
