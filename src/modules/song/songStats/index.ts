import { mount } from 'svelte';
import { createElement as h } from '@/helpers/dom';
import EntityStats from '@/components/svelte/EntityStats.svelte';
import { insertElement } from '@/helpers/dom';
import { ERYMReleaseType } from '@/helpers/enums';
import type { RenderSettings } from '@/helpers/renderContent';
import { get } from 'svelte/store';

import {
  PARENT_SELECTOR,
  MOUNT_TARGET_SELECTOR,
  getArtistNames,
  getSongTitle,
  getSongId,
} from '@/modules/song/targets';

async function render(settings: RenderSettings) {
  const { configStore } = settings;
  const config = get(configStore);

  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn('No parent element found.');
    return;
  }

  if (!config) {
    console.warn('No config found.');
    return;
  }

  const entityId = getSongId(parent);
  if (!entityId) {
    console.warn('No song ID found.');
    return;
  }

  const entityTitle = getSongTitle(parent);
  const artistNames = getArtistNames(parent);

  if (artistNames.length === 0 || !entityTitle) {
    console.error('No artist or song title found.');
    return;
  }

  const mountPoint = h('div', { className: 'page_song_header_info_rest' });
  const mountTarget = parent.querySelector(MOUNT_TARGET_SELECTOR);

  if (!mountTarget) return; // TODO: add additional fallback mount targets

  insertElement({
    target: mountTarget,
    element: mountPoint,
    position: 'beforebegin',
  });

  mount(EntityStats, {
    target: mountPoint,
    props: {
      config,
      entityId,
      entityTitle,
      artistNames,
      entityType: ERYMReleaseType.Single,
      moduleName: 'songStats',
    },
  });
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};
