<svelte:options runes={true} />

<script lang="ts">
import { onDestroy } from 'svelte';
import { usePolling } from '@/composables/usePolling';

import ScrobblesHistory from './ScrobblesHIstory.svelte';
import ScrobblesNowPlaying from './ScrobblesNowPlaying.svelte';
import errorMessages from '@/modules/profile/recentTracks/errorMessages.json';
import type { TrackDataNormalized } from '@/modules/profile/recentTracks/types';
import * as utils from '@/helpers/utils';
import { storageGet, storageSet, storageRemove } from '@/helpers/storageUtils';
import * as constants from '@/helpers/constants';
import * as api from '@/api';

const polling = usePolling(loadRecentTracks, constants.RECENT_TRACKS_INTERVAL_MS, true, true);
const { progress } = polling;

const { config, rymSyncTimestamp = null, userName } = $props<{
  config: ProfileOptions;
  rymSyncTimestamp: number | null;
  userName: string;
}>();

let isScrobblesHistoryOpen: boolean = $state(config.recentTracksShowOnLoad);
let isScrobblesHistoryPinned: boolean = $state(config.recentTracksShowOnLoad);
let isScrobblesPollingEnabled: boolean = $state(config.recentTracksPollingEnabled);

let abortController: AbortController = new AbortController();
let failedToFetch: boolean = $state(false);
let colors: VibrantUiColors | null = $state(null);
let isLoaded: boolean = $state(false);
let recentTracks = $state<TrackDataNormalized[]>([]);
let recentTracksTimestamp = $state<number>(0);

const nowPlayingTrack = $derived(() => recentTracks[0]);
const tracksHistory = $derived(() => recentTracks[0]?.nowPlaying ? recentTracks.slice(1) : recentTracks);

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
    && cache.userName === userName
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

  if (isScrobblesPollingEnabled) {
    polling.start();
  }
}

async function onPollingToggle() {
  isScrobblesPollingEnabled = !isScrobblesPollingEnabled;

  await storageSet({
    recentTracksPollingEnabled: isScrobblesPollingEnabled,
  });

  if (isScrobblesPollingEnabled) {
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
    return await utils.getImageColors(coverUrl);
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
      apiKey: config.lastfmApiKey,
      params: {
        username: userName,
        limit: config.recentTracksLimit,
      },
      signal: abortController.signal,
    });

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
        userName,
      }
    }, 'local');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      failedToFetch = true;
    }
  }
};

const colorsMap = $derived(() => colors ? utils.getColorsMap(colors) : {});

let rootTarget: HTMLElement | null = null;

const setRootElement = (node: HTMLSpanElement) => {
  rootTarget = node?.parentElement ?? null;
};

$effect(() => {
  if (!rootTarget) return;
  for (const [key, value] of Object.entries(colorsMap())) {
    rootTarget.style.setProperty(key, String(value));
  }
});

const onToggleScrobblesHistoryPinned = async () => {
  isScrobblesHistoryPinned = !isScrobblesHistoryPinned;
  await storageSet({
    recentTracksShowOnLoad: isScrobblesHistoryPinned,
  });
  if (isScrobblesHistoryPinned) {
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
  config={config}
  userName={userName}
  isRymSynced={rymSyncTimestamp !== null}
  isScrobblesHistoryPinned={isScrobblesHistoryPinned}
  onToggleScrobblesHistory={onToggleScrobblesHistory}
  onToggleScrobblesHistoryPinned={onToggleScrobblesHistoryPinned}
  onPollingToggle={onPollingToggle}
  isScrobblesPollingEnabled={isScrobblesPollingEnabled}
  pollingProgress={$progress}
/>
<ScrobblesHistory
  scrobbles={tracksHistory()}
  timestamp={recentTracksTimestamp}
  open={isScrobblesHistoryOpen}
  config={config}
/>
{/if}

<!-- <style>
  .recent-tracks-container {
    display: flex;
    flex-flow: row nowrap;
    justify-content: flex-start;
    align-items: center;
    flex-basis: 100%;
    border: solid 1px rgba(0, 0, 0, 0.1);
    background-color: var(--mono-f);
    border-radius: 6px;
    padding: 0.5em;
    padding-right: 1rem;
    transition: all 0.3s ease-out;
    transition-property: background-color, color, border-radius;
    position: relative;
    margin: 0.4em;
    overflow: hidden;
  }
</style> -->
