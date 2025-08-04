import { mount } from 'svelte';
import RecentTracks from './RecentTracks.svelte';
import type { RenderSettings } from '@/helpers/renderContent';
import { get } from 'svelte/store';

import errorMessages from './errorMessages.json';

import './recentTracks.css';

const PARENT_SELECTOR = '.profile_listening_container';

async function render(settings: RenderSettings) {
  const { configStore, context } = settings;
  const config = get(configStore);

  if (!config.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn(errorMessages.noPanelContainer);
    return;
  }

  if (config.rymPlayHistoryHide) {
    parent.style.display = 'none';
  }

  const mountPoint = document.createElement('div');
  parent.insertAdjacentElement('afterend', mountPoint);

  mount(RecentTracks, {
    target: mountPoint,
    props: {
      configStore,
      context: context!,
      parent,
    },
  });
}

export default {
  render,
  targetSelectors: [ PARENT_SELECTOR ],
  order: 1,
};
