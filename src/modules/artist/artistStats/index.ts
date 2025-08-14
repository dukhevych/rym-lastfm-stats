import { mount } from 'svelte';
import ArtistStats from './ArtistStats.svelte';
import errorMessages from './errorMessages.json';
import { createElement as h } from '@/helpers/dom';
import {
  getArtistId,
  getArtistNames,
  PARENT_SELECTOR,
  ARTIST_INFO_SELECTOR,
} from '@/modules/artist/targets';
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

  const artistId = getArtistId(parent);
  if (!artistId) {
    console.warn(errorMessages.noArtistId);
    return;
  }

  const {
    artistName,
    artistNameLocalized,
    artistAkaNames,
    artistAdditionalNames,
  } = getArtistNames(parent);

  if (!artistName && !artistNameLocalized) {
    console.error(errorMessages.noArtistName);
    return;
  }

  function prepareMountPoint(parent: HTMLElement) {
    const artistInfoMain = parent.querySelector(ARTIST_INFO_SELECTOR)!;
    const heading = h('div', {
      className: 'info_hdr',
      id: 'lastfm_label',
    }, 'Last.fm');
    const mountPoint = h('div', { className: 'info_content' });
    artistInfoMain.append(heading, mountPoint);
    return mountPoint;
  }

  const mountPoint = prepareMountPoint(parent);

  mount(ArtistStats, {
    target: mountPoint,
    props: {
      context: context!,
      artistId,
      artistName,
      artistNameLocalized,
      artistAkaNames,
      artistAdditionalNames,
    },
  });
}

export default {
  render,
  targetSelectors: [PARENT_SELECTOR],
};
