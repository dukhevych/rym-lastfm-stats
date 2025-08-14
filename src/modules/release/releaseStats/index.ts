import { mount } from 'svelte';
import EntityStats from '@/components/svelte/EntityStats.svelte';
import { createElement as h } from '@/helpers/dom';
import { ERYMReleaseType } from '@/helpers/enums';
import errorMessages from './errorMessages.json';

import {
  PARENT_SELECTOR,
  INFO_TABLE_SELECTOR,
  getArtistNames,
  getReleaseTitle,
  getReleaseType,
  getReleaseId,
} from '@/modules/release/targets';
import type { RenderSettings } from '@/helpers/renderContent';
import { get } from 'svelte/store';

async function render(settings: RenderSettings) {
  const { configStore, context } = settings;
  const config = get(configStore);

  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn(errorMessages.noParentElement);
    return;
  }

  if (!config) {
    console.warn(errorMessages.noConfig);
    return;
  }

  const entityId = getReleaseId(parent);
  if (!entityId) {
    console.warn(errorMessages.noReleaseId);
    return;
  }

  const artistNames = getArtistNames(parent);
  const entityType = getReleaseType(parent) ?? ERYMReleaseType.Album;
  const { title, titleLocalized } = getReleaseTitle(parent);

  if (artistNames.length === 0 || !title) {
    console.error(errorMessages.noArtistOrReleaseTitle);
    return;
  }

  const entityTitles = new Set([titleLocalized, title].filter(Boolean));

  const mountPoint = prepareMountPoint(parent);

  mount(EntityStats, {
    target: mountPoint,
    props: {
      context: context!,
      entityId,
      artistNames,
      entityType,
      entityTitles,
      moduleName: 'releaseStats',
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
