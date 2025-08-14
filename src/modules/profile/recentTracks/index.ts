import './styles/recentTracks.css';
import { mount } from 'svelte';
import RecentTracks from './RecentTracks.svelte';
import type { RenderSettings } from '@/helpers/renderContent';
import { get } from 'svelte/store';

import errorMessages from './errorMessages.json';

const PARENT_SELECTOR = '.profile_listening_container';

async function render(settings: RenderSettings) {
  const { configStore, context } = settings;
  const config = get(configStore);

  if (!context) return;

  if (!context.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  const parent: HTMLElement | null = document.querySelector(PARENT_SELECTOR);
  if (!parent) {
    console.warn(errorMessages.noPanelContainer);
    return;
  }

  if (config.profileRecentTracksRymHistoryHide) {
    parent.classList.add('is-hidden');
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
};
