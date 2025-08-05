<svelte:options runes={true} />

<script lang="ts">
import { onDestroy } from 'svelte';
import { usePolling } from '@/composables/usePolling';
import * as utils from '@/helpers/utils';
import { getImageColors, getColorsMap } from '@/helpers/colors';
import { storageGet, storageSet, storageRemove, updateSyncedOptions } from '@/helpers/storageUtils';
import * as constants from '@/helpers/constants';
import * as api from '@/api';

import ScrobblesNowPlaying from './ScrobblesNowPlaying.svelte';
import ScrobblesHistory from './ScrobblesHistory.svelte';
import errorMessages from './errorMessages.json';
import type { TrackDataNormalized } from './types';
import type { Writable } from 'svelte/store';

const polling = usePolling(loadRecentTracks, constants.RECENT_TRACKS_INTERVAL_MS, true, true);
const { progress } = polling;

interface Props {
  configStore: Writable<AddonOptions>;
  context: Record<string, any>;
  parent: HTMLElement;
}

const {
  configStore,
  context,
  parent,
}: Props = $props();

let isScrobblesHistoryOpen = $state($configStore.recentTracksShowOnLoad);

const isScrobblesPollingEnabled = $derived(() => $configStore.recentTracksPollingEnabled);
const isScrobblesHistoryPinned = $derived(() => $configStore.recentTracksShowOnLoad);

let abortController: AbortController = new AbortController();
let failedToFetch: boolean = $state(false);
let colors: VibrantUiColors | null = $state(null);
let isLoaded: boolean = $state(false);
let recentTracks = $state<TrackDataNormalized[]>([]);
let recentTracksTimestamp = $state<number>(0);

const nowPlayingTrack = $derived(() => recentTracks[0]);
const scrobbles = $derived(() => recentTracks[0]?.nowPlaying ? recentTracks.slice(1) : recentTracks);

interface RecentTracksCache {
  data: TrackDataNormalized[];
  timestamp: number;
  colors: VibrantUiColors;
  userName: string;
}

const checkCacheValidity = (cache: RecentTracksCache | null): boolean => {
  return !!(
    cache
    && cache.data
    && cache.timestamp
    && cache.colors
    && cache.userName === context.userName
    && Date.now() - cache.timestamp <= constants.RECENT_TRACKS_INTERVAL_MS
  );
}

async function init() {
  const recentTracksCache: RecentTracksCache | null = await storageGet('recentTracksCache', 'local');

  if (recentTracksCache && checkCacheValidity(recentTracksCache)) {
    recentTracks = recentTracksCache.data;
    recentTracksTimestamp = recentTracksCache.timestamp;
    colors = recentTracksCache.colors;
  } else {
    await storageRemove('recentTracksCache', 'local');
    await loadRecentTracks();
  }

  isLoaded = true;

  if (isScrobblesPollingEnabled()) {
    polling.start();
  }
}

async function onPollingToggle() {
  await Promise.all([
    updateSyncedOptions({
      recentTracksPollingEnabled: !isScrobblesPollingEnabled(),
    }),
    configStore.update((config) => ({
      ...config,
      recentTracksPollingEnabled: !isScrobblesPollingEnabled(),
    })),
  ])

  if (isScrobblesPollingEnabled()) {
    polling.start();
  } else {
    polling.stop();
  }
}

onDestroy(() => {
  polling.cleanup();
});

async function trySetColorsFromTrack(track: TrackDataNormalized | undefined) {
  const coverUrl = track?.coverExtraLargeUrl;
  if (!coverUrl) return null;
  try {
    return await getImageColors(coverUrl);
  } catch {
    console.warn(errorMessages.failedToFetchColors);
    return null;
  }
}

async function loadRecentTracks() {
  abortController?.abort();
  abortController = new AbortController();

  try {
    const recentTracksResponse = await api.getRecentTracks({
      apiKey: $configStore.lastfmApiKey,
      params: {
        username: context.userName,
        limit: $configStore.recentTracksLimit,
      },
      signal: abortController.signal,
    });

    // await utils.wait(500000);

    const { recenttracks: { track: data } } = recentTracksResponse;
    const timestamp = Date.now();
    const normalizedData = data.map(utils.normalizeLastFmTrack);

    colors = await trySetColorsFromTrack(normalizedData[0]);
    recentTracks = normalizedData;
    recentTracksTimestamp = timestamp;

    await storageSet({
      recentTracksCache: {
        data: normalizedData,
        colors: $state.snapshot(colors),
        timestamp,
        userName: context.userName,
      }
    }, 'local');

    failedToFetch = false;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      if (recentTracks.length === 0) {
        failedToFetch = true;
      }
    }
  }
};

const colorsMap = $derived(() => colors ? getColorsMap(colors) : {});

let rootTarget: HTMLElement | null = null;

const setRootElement = (node: HTMLSpanElement) => {
  rootTarget = node?.parentElement ?? null;
};

$effect(() => {
  if ($configStore.recentTracksPollingEnabled) {
    polling.start();
  } else {
    polling.stop();
  }
});

$effect(() => {
  if ($configStore.rymPlayHistoryHide) {
    parent.classList.add('is-hidden');
  } else {
    parent.classList.remove('is-hidden');
  }
});

$effect(() => {
  if (!rootTarget) return;
  for (const [key, value] of Object.entries(colorsMap())) {
    rootTarget.style.setProperty(key, String(value));
  }
});

const onToggleScrobblesHistoryPinned = async () => {
  await Promise.all([
    updateSyncedOptions({ recentTracksShowOnLoad: !isScrobblesHistoryPinned() }),
    configStore.update((config) => ({
      ...config,
      recentTracksShowOnLoad: !isScrobblesHistoryPinned(),
    })),
  ]);

  if (isScrobblesHistoryPinned()) {
    isScrobblesHistoryOpen = true;
  }
}

const onToggleScrobblesHistory = () => {
  isScrobblesHistoryOpen = !isScrobblesHistoryOpen;
}

init();
</script>

<span style="display: contents" use:setRootElement></span>

{#if !failedToFetch}
  <ScrobblesNowPlaying
    track={nowPlayingTrack()}
    configStore={configStore}
    context={context}
    rymSyncTimestamp={context.rymSyncTimestamp}
    isScrobblesHistoryPinned={isScrobblesHistoryPinned()}
    onToggleScrobblesHistory={onToggleScrobblesHistory}
    onToggleScrobblesHistoryPinned={onToggleScrobblesHistoryPinned}
    onPollingToggle={onPollingToggle}
    isScrobblesPollingEnabled={isScrobblesPollingEnabled()}
    pollingProgress={$progress}
  />
  <ScrobblesHistory
    scrobbles={scrobbles()}
    timestamp={recentTracksTimestamp}
    open={isScrobblesHistoryOpen}
  />
{/if}
