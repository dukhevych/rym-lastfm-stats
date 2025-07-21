import { mount } from 'svelte';
import ReleaseStats from './ReleaseStats.svelte';
import { createElement as h } from '@/helpers/dom';
import { RYMReleaseType } from '@/helpers/enums';
import errorMessages from './errorMessages.json';

import {
  PARENT_SELECTOR,
  INFO_TABLE_SELECTOR,
  getArtistNames,
  getReleaseTitle,
  getReleaseType,
  getReleaseId,
} from '@/modules/release/targets';

async function render(config: ProfileOptions) {
  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn(errorMessages.noParentElement);
    return;
  }

  if (!config) {
    console.warn(errorMessages.noConfig);
    return;
  }

  const releaseId = getReleaseId(parent);
  if (!releaseId) {
    console.warn(errorMessages.noReleaseId);
    return;
  }

  const artistNames = getArtistNames(parent);
  const releaseType = getReleaseType(parent) ?? RYMReleaseType.Album;
  const releaseTitle = getReleaseTitle(parent);

  if (artistNames.length === 0 || !releaseTitle) {
    console.error(errorMessages.noArtistOrReleaseTitle);
    return;
  }

  const mountPoint = prepareMountPoint(parent);

  mount(ReleaseStats, {
    target: mountPoint,
    props: {
      config,
      releaseId,
      artistNames,
      releaseType,
      releaseTitle,
    },
  });
}

function prepareMountPoint(parent: HTMLElement) {
  let mountPoint: HTMLElement;
  const row = h('tr', {}, [
    h('th', { className: 'info_hdr' }, 'Last.fm'),
    mountPoint = h(
      'td',
      { className: 'release_pri_descriptors', colspan: '2' },
    ),
  ]);
  const infoTable = parent.querySelector(INFO_TABLE_SELECTOR) as HTMLTableElement;
  infoTable.appendChild(row);
  return mountPoint;
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};
