import * as utils from '@/helpers/utils';
import {
  normalizeForSearch,
  getReleaseTitleExtras,
  removeBrackets,
  checkPartialStringsMatch,
  extractNumbers,
} from '@/helpers/string';
import type { ReleaseTitleExtras } from '@/helpers/string';
import { getDirectInnerText, createElement as h } from '@/helpers/dom';
import * as constants from '@/helpers/constants';
import { RecordsAPI } from '@/helpers/records-api';
import { ERYMEntityCode } from '@/helpers/enums';

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

interface TargetValues {
  values: Set<string>;
  valuesNormalized: Set<string>;
}

interface TargetValue {
  value: string;
  valueNormalized: string;
}

interface TargetArtist extends TargetValues {}

interface TargetTrack extends TargetValue {}

interface Targets {
  artist: TargetArtist;
  release?: ReleaseTitleExtras;
  track?: TargetTrack;
}

interface ValidationRule {
  selectors: {
    [key: string]: string;
  };
  validate: (
    item: HTMLElement,
    targets: Targets,
  ) => ValidationResult;
}

type ValidationResult = 'full' | 'partial' | false;

const validationRules: Record<ERYMEntityCode, ValidationRule> = {
  [ERYMEntityCode.Artist]: {
    selectors: {
      artistNameSelector: 'a.searchpage.artist',
      artistNameLocalizedSelector: 'a.searchpage.artist + span.smallgray',
      artistAkaSelector: '.subinfo',
    },
    validate: function (item, { artist: targetArtist }) {
      const artistNameLocalized = utils.lazy(() => removeBrackets(item.querySelector(this.selectors.artistNameLocalizedSelector)?.textContent || ''));
      const artistNameLocalizedNormalized = utils.lazy(() => normalizeForSearch(artistNameLocalized()));
      const artistName = utils.lazy(() => item.querySelector(this.selectors.artistNameSelector)?.textContent || '');
      const artistNameNormalized = utils.lazy(() => normalizeForSearch(artistName()));
      const artistAkaRaw = utils.lazy(() => getDirectInnerText(item.querySelector(this.selectors.artistAkaSelector)) || '');
      const artistAkaNames = utils.lazy(() => new Set(artistAkaRaw().replace(/^a\.k\.a:\s*/, '').split(', ').filter(Boolean)));
      const artistAkaNamesNormalized = utils.lazy(() => new Set([...artistAkaNames()].map(normalizeForSearch)));

      // FULL MATCH
      if (targetArtist.values.has(artistNameLocalized())) return 'full';
      if (targetArtist.valuesNormalized.has(artistNameLocalizedNormalized())) return 'full';
      if (targetArtist.values.has(artistName())) return 'full';
      if (targetArtist.valuesNormalized.has(artistNameNormalized())) return 'full';
      if (targetArtist.values.intersection(artistAkaNames()).size > 0) return 'full';
      if (targetArtist.valuesNormalized.intersection(artistAkaNamesNormalized()).size > 0) return 'full';

      // PARTIAL MATCH
      if ([...targetArtist.values].some((value) => checkPartialStringsMatch(value, artistNameLocalized()))) return 'partial';
      if ([...targetArtist.valuesNormalized].some((value) => checkPartialStringsMatch(value, artistNameLocalizedNormalized()))) return 'partial';
      if ([...targetArtist.values].some((value) => checkPartialStringsMatch(value, artistName()))) return 'partial';
      if ([...targetArtist.valuesNormalized].some((value) => checkPartialStringsMatch(value, artistNameNormalized()))) return 'partial';
      if ([...targetArtist.values].some((value) => [...artistAkaNames()].some((aka) => checkPartialStringsMatch(value, aka)))) return 'partial';
      if ([...targetArtist.valuesNormalized].some((value) => [...artistAkaNamesNormalized()].some((aka) => checkPartialStringsMatch(value, aka)))) return 'partial';

      return false;
    },
  },
  [ERYMEntityCode.Release]: {
    selectors: {
      artistNameSelector: 'a.artist',
      releaseTitleSelector: 'a.searchpage',
    },
    validate: function (node, { artist: targetArtist, release: targetRelease }) {
      const {
        artistNameSelector,
        releaseTitleSelector,
      } = this.selectors;

      const artistNames: Set<string> = new Set();

      Array.from(node.querySelectorAll(artistNameSelector)).forEach((artistLink) => {
        const artistName = getDirectInnerText(artistLink);
        artistNames.add(artistName);

        const artistNameLocalized = removeBrackets(artistLink.querySelector('.subtext')?.textContent || '');
        artistNameLocalized && artistNames.add(artistNameLocalized);
      });

      const artistValidity = validateMultipleValues(artistNames, targetArtist);

      if (!targetRelease) return false;

      const value = (node.querySelector(releaseTitleSelector)?.textContent || '').trim();

      const releaseTitleValidity = validateRelease(value, targetRelease);

      if (!artistValidity || !releaseTitleValidity) return false;
      if (artistValidity === 'full' && releaseTitleValidity === 'full') return 'full';
      if (artistValidity === 'partial' || releaseTitleValidity === 'partial') return 'partial';

      return false;
    },
  },
  [ERYMEntityCode.Song]: {
    selectors: {
      artistNameSelector: '.infobox td:nth-child(2) table + span .ui_name_locale_original',
      artistNameSelectorFallback: '.infobox td:nth-child(2) table + span .ui_name_locale:not(.has_locale_name)',
      artistNameLocalizedSelector: '.infobox td:nth-child(2) table + span .ui_name_locale_language',
      trackNameSelector: '.infobox td:nth-child(2) table a.searchpage .ui_name_locale_original',
    },
    validate: function (node, { artist: targetArtist, track: targetTrack }) {
      const {
        artistNameSelector,
        artistNameSelectorFallback,
        artistNameLocalizedSelector,
        trackNameSelector,
      } = this.selectors;

      const artistNames: Set<string> = new Set();

      Array.from(node.querySelectorAll(artistNameSelector)).forEach(el => artistNames.add((el.textContent || '').trim()));
      Array.from(node.querySelectorAll(artistNameLocalizedSelector)).forEach(el => artistNames.add((el.textContent || '').trim()));
      Array.from(node.querySelectorAll(artistNameSelectorFallback)).forEach(el => artistNames.add((el.textContent || '').trim()));

      const trackName = node.querySelector(trackNameSelector)?.textContent || '';

      const artistValidity = validateMultipleValues(artistNames, targetArtist);

      if (!targetTrack) return false;

      const trackNameValidity = validateSingleValue(trackName, targetTrack);

      if (!artistValidity || !trackNameValidity) return false;
      if (artistValidity === 'full' && trackNameValidity === 'full') return 'full';
      if (artistValidity === 'partial' || trackNameValidity === 'partial') return 'partial';

      return false;
    },
  },
}

async function render(config: AddonOptions) {
  if (!config) return;

  const urlParams = new URLSearchParams(window.location.search);
  const strict = urlParams.get('strict');
  const searchType = urlParams.get('searchtype') as ERYMEntityCode;

  if (strict !== 'true' || !Object.values(ERYMEntityCode).includes(searchType)) return;

  const enhArtist = urlParams.get('enh_artist') || '';
  const enhRelease = urlParams.get('enh_release') || '';
  const enhTrack = urlParams.get('enh_track') || '';

  searchItems = document.querySelectorAll(SEARCH_ITEMS_SELECTOR);

  if (!searchItems.length) return;

  const targets = {} as {
    artist: TargetArtist;
    release?: ReleaseTitleExtras;
    track?: TargetTrack;
  };

  const targetArtistValues = new Set([enhArtist, ...enhArtist.split(/ feat\. | ft\. /)]);

  targets.artist = {
    values: targetArtistValues,
    valuesNormalized: new Set([...targetArtistValues].map(normalizeForSearch)),
  }

  if (searchType === ERYMEntityCode.Release) {
    targets.release = getReleaseTitleExtras(enhRelease);
  }

  if (searchType === ERYMEntityCode.Song) {
    targets.track = {
      value: enhTrack,
      valueNormalized: normalizeForSearch(enhTrack),
    }
  }

  Array.from(searchItems).forEach((item) => {
    item.classList.add('rym-search-strict--item');
    item.dataset.itemType = constants.RYM_ENTITY_CODES_INVERTED[searchType];

    const isReleaseSearch = searchType === ERYMEntityCode.Release;

    if (isReleaseSearch) {
      processReleaseItem(item);
    }

    const validity = validationRules[searchType].validate(item, targets);

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

  async function processReleaseItem(item: HTMLElement) {
    const releaseIdEl: HTMLElement | null = item.querySelector(validationRules[ERYMEntityCode.Release].selectors.releaseTitleSelector);
    const releaseId = extractNumbers(releaseIdEl?.title || '');

    if (!releaseId) return;

    item.style.order = releaseId;

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

      if (!header) return;

      const url = new URL(window.location.href);
      const page = url.searchParams.get('page') ?? '1';

      const warning = h('div', {
        className: ['rym-warning'],
      }, h('p', {}, `No direct matches found on the #${page} page.`));

      const navigation = h('div');

      if (searchType === ERYMEntityCode.Artist) {
        const p = h('p', {}, [
          'This artist may not be added yet into RYM database or too obscure.',
          h('a', {
            href: '/artist/profile_ac',
          }, 'Add artist'),
        ]);
        warning.appendChild(p);
      } else if (searchType === ERYMEntityCode.Release) {
        const p = h('p', {}, 'This release may not be added yet into RYM database or too obscure.');
        warning.appendChild(p);
      } else if (searchType === ERYMEntityCode.Song) {
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

      function createSearchArtistInsteadLink() {
        const url = new URL(window.location.href);
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('page');
        searchParams.set('searchtype', ERYMEntityCode.Artist);
        searchParams.set('searchterm', normalizeForSearch(searchParams.get('enh_artist') || ''));
        const newRelativeUrl = url.pathname + '?' + searchParams.toString();

        return h('a', {
          href: newRelativeUrl,
          className: ['btn', 'blue_btn', 'btn_small'],
        }, 'Search artist instead');
      }

      function createSearchReleaseInsteadLink() {
        const url = new URL(window.location.href);
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('page');
        searchParams.set('searchtype', ERYMEntityCode.Release);
        searchParams.set('searchterm', normalizeForSearch(searchParams.get('enh_release') || ''));
        const newRelativeUrl = url.pathname + '?' + searchParams.toString();

        return h('a', {
          href: newRelativeUrl,
          className: ['btn', 'blue_btn', 'btn_small'],
        }, 'Search release instead');
      }

      if (searchType === ERYMEntityCode.Release) {
        navigation.appendChild(createSearchArtistInsteadLink());
      }

      if (searchType === ERYMEntityCode.Song) {
        navigation.appendChild(createSearchArtistInsteadLink());
        navigation.appendChild(createSearchReleaseInsteadLink());
      }
    }
  }
}

function validateRelease(value: string, target: ReleaseTitleExtras) {
  const item = getReleaseTitleExtras(value);

  if (item.value === target.value) return 'full';
  if (item.normalized === target.normalized) return 'full';

  if (item.suffix || target.suffix) {
    if (item.suffix && target.suffix) {
      let baseValidity: ValidationResult = false;
      if (
        item.noSuffix === target.noSuffix
        || item.noSuffixNormalized === target.noSuffixNormalized
      ) baseValidity = 'full';
      else if (checkPartialStringsMatch(item.noSuffix, target.noSuffix)) baseValidity = 'partial';
      if (!baseValidity) return false;

      let suffixValidity: boolean = false;
      if (item.editionSuffix && target.editionSuffix) {
        if (item.editionSuffixType.intersection(target.editionSuffixType).size > 0) {
          suffixValidity = true;
        }
      }

      if (item.numericSuffix && target.numericSuffix) {
        if (item.numericSuffixType.intersection(target.numericSuffixType).size > 0) {
          if (item.numericSuffixValue === target.numericSuffixValue) {
            suffixValidity = true;
          }
        }
      }

      return suffixValidity ? baseValidity : 'partial';
    } else {
      if (item.noSuffix === target.noSuffix) return 'partial';
      if (checkPartialStringsMatch(item.noSuffix, target.noSuffix)) return 'partial';
    }
  }

  if (checkPartialStringsMatch(item.value, target.value)) return 'partial';
  if (checkPartialStringsMatch(item.normalized, target.normalized)) return 'partial';

  return false;
}

function validateMultipleValues(values: Set<string>, target: TargetValues) {
  const valuesNormalized: Set<string> = new Set();

  [...values].forEach((value) => valuesNormalized.add(normalizeForSearch(value)));

  // FULL MATCH
  if (values.intersection(target.values).size > 0) return 'full';
  if (valuesNormalized.intersection(target.valuesNormalized).size > 0) return 'full';

  // PARTIAL MATCH
  if ([...values].some(v1 => [...target.values].some(v2 => checkPartialStringsMatch(v1, v2)))) return 'partial';
  if ([...valuesNormalized].some(v1 => [...target.valuesNormalized].some(v2 => checkPartialStringsMatch(v1, v2)))) return 'partial';

  return false;
}

function validateSingleValue(value: string, target: TargetValue) {
  if (target.value === value) return 'full';

  const valueNormalized = normalizeForSearch(value);

  if (target.valueNormalized === valueNormalized) return 'full';

  if (checkPartialStringsMatch(value, target.value)) return 'partial';
  if (checkPartialStringsMatch(valueNormalized, target.valueNormalized)) return 'partial';

  return false;
}

export default {
  render,
  targetSelectors: [SEARCH_ITEMS_SELECTOR, LAST_ITEM_SELECTOR],
};
