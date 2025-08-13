import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { ERYMOwnershipStatus } from '@/helpers/enums';
import { normalizeForSearch } from '@/helpers/string';
import { RecordsAPI } from '@/helpers/records-api';
import {
  getReleaseYear,
  getReleaseTitle,
  getArtistNames,
  getReleaseId,
  PARENT_SELECTOR,
} from './modules/release/targets';

interface UIElements {
  parent: HTMLElement;
}

interface State {
  releaseId: string;
  rymRatingPath: string;
  rymCatalogPath: string;
}

const uiElements = {} as UIElements;
const state = {} as State;

interface SyncedData {
  rating: number;
  ownership: ERYMOwnershipStatus;
  format: ERYMFormat;
}

async function syncWithDB(data: Record<string, any>) {
  const { rating } = data[state.rymRatingPath];
  const { ownership, format } = data[state.rymCatalogPath];
  const dbRecord = await RecordsAPI.getById(state.releaseId);

  const parsedRecord = prepareFullData({
    rating,
    ownership,
    format,
  });

  constants.isDev && console.log('DB RECORD', dbRecord, 'PARSED RECORD', parsedRecord);

  if (!dbRecord) {
    if (
      rating > 0 ||
      ownership !== 'n'
    ) {
      if (constants.isDev) console.log('ADDING NEW RECORD', parsedRecord);
      await RecordsAPI.add(parsedRecord);
      return;
    } else {
      if (constants.isDev) console.log('NOTHING TO ADD');
      return;
    }
  }

  if (utils.shallowEqual(utils.omit(dbRecord, ['_raw']), parsedRecord)) {
    if (constants.isDev) console.log('NOTHING TO UPDATE');
    return;
  }

  if (constants.isDev) {
    console.log('UPDATING RECORD', state.releaseId);
    console.log('OLD RECORD', JSON.stringify(dbRecord, null, 2));
    console.log('NEW RECORD', JSON.stringify(parsedRecord, null, 2));
  }

  await RecordsAPI.update(state.releaseId, parsedRecord);
}

function prepareFullData(syncedData: SyncedData): IRYMRecordDB {
  const artistNames = getArtistNames(uiElements.parent);
  const { artistName, artistNameLocalized } = utils.combineArtistNames(artistNames);

  const { title } = getReleaseTitle(uiElements.parent);

  return {
    id: state.releaseId,
    title,
    releaseDate: getReleaseYear(uiElements.parent),
    artistName,
    artistNameLocalized: artistNameLocalized,
    $artistName: normalizeForSearch(artistName),
    $artistNameLocalized: normalizeForSearch(artistNameLocalized),
    $title: normalizeForSearch(title),
    ...syncedData,
  };
};

(async function () {
  window.addEventListener('load', async () => {
    const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);

    if (!parent) {
      console.warn(`Element with selector '${PARENT_SELECTOR}' not found.`);
      return;
    }

    uiElements.parent = parent;

    state.releaseId = getReleaseId(uiElements.parent);
    state.rymRatingPath = 'rating_l_' + state.releaseId;
    state.rymCatalogPath = 'catalog_l_' + state.releaseId;

    const { initialValue } = await utils.getWindowData([
      `${state.rymRatingPath}.rating`,
      `${state.rymCatalogPath}.ownership`,
      `${state.rymCatalogPath}.format`,
    ], async updatedData => {
      // Fix for the runtime RYM bug when setting [not catalogued] and `format` is not being reset
      if (updatedData[state.rymCatalogPath].ownership === ERYMOwnershipStatus.NotCataloged) {
        updatedData[state.rymCatalogPath].format = '';
      }

      await syncWithDB(updatedData);
    });

    await syncWithDB(initialValue);
  });
})();
