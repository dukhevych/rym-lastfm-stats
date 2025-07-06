import * as utils from '@/helpers/utils';
import { normalizeForSearch, deburr } from '@/helpers/string';
import { getDirectInnerText, createElement as h } from '@/helpers/dom';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import { RYMEntityCode } from '@/helpers/enums';
import { removeBrackets, checkPartialStringsMatch, extractNumbers } from '@/helpers/string';

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

interface TargetArtist {
  value: string;
  multipleValues: string[];
  getNormalized: string;
}

interface TargetRelease {
  value: string;
  getNormalized: string;
  getNoEdition: string;
  getNoEditionNormalized: string;
  getEdition: string;
}

interface TargetTrack {
  value: string;
  getNormalized: string;
}

interface ValidationRule {
  selectors: {
    [key: string]: string;
  };
  validate: (item: HTMLElement, query: string, targetArtist: TargetArtist, targetRelease: TargetRelease, targetTrack: TargetTrack) => string | false;
}

const validationRules: Record<RYMEntityCode, ValidationRule> = {
  [RYMEntityCode.Artist]: {
    selectors: {
      artistNameSelector: 'a.searchpage.artist',
      artistNameLocalizedSelector: 'a.searchpage.artist + span.smallgray',
      artistAkaSelector: '.subinfo',
    },
    validate: function (item, query, targetArtist) {
      const artistNameLocalized = removeBrackets(item.querySelector(this.selectors.artistNameLocalizedSelector)?.textContent || '');

      if (artistNameLocalized === targetArtist.value) return 'full';

      const artistNameLocalizedNormalized = normalizeForSearch(artistNameLocalized);

      if (artistNameLocalized === targetArtist.value) return 'full';

      const artistName = normalizeForSearch(item.querySelector(this.selectors.artistNameSelector)?.textContent || '');

      if (artistName === targetArtist.value) return 'full';

      const artistAkaRaw = getDirectInnerText(item.querySelector(this.selectors.artistAkaSelector));
      const artistAkaNames = artistAkaRaw.replace(/^a\.k\.a:\s*/, '')
        .split(', ')
        .map((aka) => normalizeForSearch(aka))
        .filter(Boolean);
      if (artistAkaNames.includes(targetArtist.value)) return 'full';

      // Alternative validation with normalized search term
      // Will be used if the above validation against original artist name from custom query parameter fails
      const queryNormalized = normalizeForSearch(query);
      if (artistName === queryNormalized) return 'full';
      if (artistNameLocalized === queryNormalized) return 'full';
      if (artistAkaNames.includes(queryNormalized)) return 'full';
      if (
        targetArtist.multipleValues.length > 1
        && targetArtist.multipleValues.some((value) => checkPartialStringsMatch(value, queryNormalized))
      ) return 'full';
      if (checkPartialStringsMatch(artistNameLocalized, queryNormalized)) return 'partial';
      if (checkPartialStringsMatch(artistName, queryNormalized)) return 'partial';
      if (artistAkaNames.some((aka) => checkPartialStringsMatch(aka, queryNormalized))) return 'partial';
      return false;
    },
  },
  [RYMEntityCode.Release]: {
    selectors: {
      artistNameSelector: 'a.artist',
      releaseTitleSelector: 'a.searchpage',
    },
    validate: function (item, query, targetArtist, targetRelease) {
      const artistLinks = Array.from(item.querySelectorAll(this.selectors.artistNameSelector));
      const artistNames: string[] = [];
      const artistNamesLocalized: string[] = [];

      artistLinks.forEach((artistLink) => {
        artistNames.push(getDirectInnerText(artistLink));

        const artistNameLocalized = removeBrackets(artistLink.querySelector('.subtext')?.textContent || '');
        artistNameLocalized && artistNamesLocalized.push(artistNameLocalized);
      });

      const artistNamesNormalized = artistNames.map((name) => normalizeForSearch(name));
      const artistNamesLocalizedNormalized = artistNamesLocalized.map((name) => normalizeForSearch(name));

      function validateArtist() {
        if (artistNames.includes(targetArtist.value)) return 'full';
        if (artistNamesLocalized.includes(targetArtist.value)) return 'full';

        if (artistNamesNormalized.includes(targetArtist.getNormalized)) return 'full';
        if (artistNamesLocalizedNormalized.includes(targetArtist.getNormalized)) return 'full';

        if (artistNames.some((value) => checkPartialStringsMatch(value, targetArtist.value))) return 'partial';
        if (artistNamesLocalized.some((value) => checkPartialStringsMatch(value, targetArtist.value))) return 'partial';

        return false;
      }

      const artistValidity = validateArtist();

      const releaseTitle = (item.querySelector(this.selectors.releaseTitleSelector)?.textContent || '').trim();

      function validateRelease() {
        const getReleaseTitleNormalized = utils.lazy(() => normalizeForSearch(releaseTitle));
        const getReleaseTitleNoEdition = utils.lazy(() => utils.cleanupReleaseEdition(releaseTitle));
        const getReleaseTitleNoEditionNormalized = utils.lazy(() => normalizeForSearch(getReleaseTitleNoEdition()));
        const getReleaseTitleEdition = utils.lazy(() => utils.extractReleaseEditionType(releaseTitle));

        // Ideal match
        if (releaseTitle === targetRelease.value) return 'full';

        // Ideal normalized match
        if (getReleaseTitleNormalized() === targetRelease.getNormalized) return 'full';

        // Edition
        if (getReleaseTitleEdition() && targetRelease.getEdition) {
          if ((
            getReleaseTitleNoEdition() === targetRelease.getNoEdition
            || getReleaseTitleNoEditionNormalized() === targetRelease.getNoEditionNormalized
          )) {
            // No edition part match (ideal or normalized) + edition part match
            if (getReleaseTitleEdition() === targetRelease.getEdition) return 'full';
            // No edition part match (ideal or normalized) + edition part mismatch
            else return 'partial';
          } else {
            // Doubtful case?
            // No edition part mismatch (ideal or normalized) + edition part match
            if (getReleaseTitleEdition() === targetRelease.getEdition) return 'partial';
          }
        }

        // No edition part match (ideal or normalized) + no edition for item's release title
        if (targetRelease.getEdition && !getReleaseTitleEdition()) {
          if ((
            targetRelease.getNoEdition === releaseTitle
            || targetRelease.getNoEditionNormalized === getReleaseTitleNormalized()
          )) return 'full';
        }

        if (checkPartialStringsMatch(releaseTitle, targetRelease.value)) return 'partial';

        if (checkPartialStringsMatch(getReleaseTitleNormalized(), targetRelease.getNormalized)) return 'partial';

        return false;
      }

      const hasReleaseTitle = validateRelease();

      if (artistValidity || hasReleaseTitle) {
        console.log(item);
        console.log(artistValidity, hasReleaseTitle);
      }
      console.log('==================');

      if (!artistValidity || !hasReleaseTitle) return false;
      if (artistValidity === 'full' && hasReleaseTitle === 'full') return 'full';

      return 'partial';
    },
  },
  [RYMEntityCode.Song]: {
    selectors: {
      artistNameSelector: '.infobox td:nth-child(2) > span .ui_name_locale',
      trackNameSelector: '.infobox td:nth-child(2) > table .ui_name_locale_original',
    },
    validate: function (item, query, targetArtist, targetRelease, targetTrack) {
      const {
        artistNameSelector,
        trackNameSelector,
      } = this.selectors;

      const artistName = normalizeForSearch(item.querySelector(artistNameSelector)?.textContent || '');
      const trackName = normalizeForSearch(item.querySelector(trackNameSelector)?.textContent || '');

      let _query = normalizeForSearch(query);

      let hasArtist = false;
      let hasTrackName = false;

      if (checkPartialStringsMatch(_query, artistName)) {
        hasArtist = true;
        _query = query.replace(artistName, '').trim();
      }

      if (checkPartialStringsMatch(_query, trackName)) {
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

  const searchTerm = deburr(urlParams.get('searchterm') || '');
  const enhArtist = urlParams.get('enh_artist') || '';
  const enhRelease = urlParams.get('enh_release') || '';
  const enhTrack = urlParams.get('enh_track') || '';

  searchItems = document.querySelectorAll(SEARCH_ITEMS_SELECTOR);

  if (!searchItems.length) return;

  const targetRelease = {
    get value() { return enhRelease },
    get getNormalized() { return normalizeForSearch(this.value) },
    get getNoEdition() { return utils.cleanupReleaseEdition(this.value) },
    get getNoEditionNormalized() { return normalizeForSearch(this.value) },
    get getEdition() { return utils.extractReleaseEditionType(this.value) },
  }

  const targetArtist = {
    get value() { return enhArtist },
    get multipleValues() { return this.value.split(' feat. ') },
    get getNormalized() { return normalizeForSearch(this.value) },
  }

  const targetTrack = {
    get value() { return enhTrack },
    get getNormalized() { return normalizeForSearch(this.value) },
  }

  Array.from(searchItems).forEach((item) => {
    item.classList.add('rym-search-strict--item');
    item.dataset.itemType = constants.RYM_ENTITY_CODES_INVERTED[searchType];

    const isReleaseSearch = searchType === RYMEntityCode.Release;

    if (isReleaseSearch) {
      addReleaseUserRating(item);
      // addReleaseIdAsOrder(item);
    }

    const validity = validationRules[searchType].validate(item, searchTerm, targetArtist, targetRelease);

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
    const releaseId = extractNumbers(releaseIdEl?.title || '');

    if (!releaseId) return;

    const record = await RecordsAPI.getById(releaseId);

    if (record && record.rating) {
      item.dataset.rymRating = String(record.rating / 2);
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
          searchParams.set('searchterm', normalizeForSearch(searchParams.get('enh_artist') || ''));
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
