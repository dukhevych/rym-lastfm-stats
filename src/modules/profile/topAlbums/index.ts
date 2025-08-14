import './topAlbums.css';
import { mount } from 'svelte';
import { get } from 'svelte/store';
import TopAlbums from './TopAlbums.svelte';
import errorMessages from './errorMessages.json';
import type { RenderSettings } from '@/helpers/renderContent';
import * as constants from '@/helpers/constants';

const PROFILE_CONTAINER_SELECTOR = '.bubble_header.profile_header + .bubble_content';

export async function render(settings: RenderSettings) {
  const { configStore, context } = settings;

  if (!context?.lastfmApiKey) {
    console.warn(errorMessages.noApiKey);
    return;
  }

  const mountPoint = document.createElement('div');
  const target = document.querySelector(PROFILE_CONTAINER_SELECTOR)!;
  target.insertAdjacentElement('afterend', mountPoint);

  mount(TopAlbums, {
    target: mountPoint,
    props: {
      configStore,
      context: context!,
    },
  });
}

export default {
  render,
  targetSelectors: [PROFILE_CONTAINER_SELECTOR],
};
