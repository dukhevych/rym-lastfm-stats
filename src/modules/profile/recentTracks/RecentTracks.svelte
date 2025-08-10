<svelte:options runes={true} />

<script lang="ts">
import { onDestroy } from 'svelte';

import * as api from '@/api';
import { usePolling } from '@/composables/usePolling';
import { getImageColors, getColorsMap } from '@/helpers/colors';
import { RecordsAPI } from '@/helpers/records-api';
import * as constants from '@/helpers/constants';
import { storageGet, storageSet, storageRemove, updateSyncedOptions } from '@/helpers/storageUtils';
import * as utils from '@/helpers/utils';
import { cleanupReleaseEdition } from '@/helpers/string';

import errorMessages from './errorMessages.json';
import ScrobblesHistory from './ScrobblesHistory.svelte';
import ScrobblesNowPlaying from './ScrobblesNowPlaying.svelte';

import type { TrackDataNormalized } from './types';
import type { Writable } from 'svelte/store';
import { ERYMOwnershipStatus } from '@/helpers/enums';
import type { RecentTrack } from '@/api/getRecentTracks';
import type { ColorsMap } from '@/helpers/colors';

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

let latestTrack = $state<TrackDataNormalized | null>(null);
let latestTrackMetadata = $state<{
  rating: number;
  formats: Set<ERYMFormat>;
  formatsLabel: string;
}>({
  rating: 0,
  formats: new Set(),
  formatsLabel: '',
});
let latestTrackColors = $state<ColorsMap | null>(null);
let scrobbles = $state<TrackDataNormalized[]>([]);
let timestamp = $state<number>(0);

interface RecentTracksCache {
  latestTrack: TrackDataNormalized;
  latestTrackMetadata: {
    rating: number;
    formats: Set<ERYMFormat>;
    formatsLabel: string;
  };
  latestTrackColors: ColorsMap;
  scrobbles: TrackDataNormalized[];
  timestamp: number;
  userName: string;
}

const checkCacheValidity = (cache: RecentTracksCache | null): boolean => {
  return !!(
    cache
    && cache.userName === context.userName
    && cache.timestamp
    && Date.now() - cache.timestamp <= constants.RECENT_TRACKS_INTERVAL_MS
  );
}

async function init() {
  const dataCache: RecentTracksCache | null = await storageGet('recentTracksCache', 'local');

  if (dataCache && checkCacheValidity(dataCache)) {
    latestTrack = dataCache.latestTrack;
    latestTrackMetadata = dataCache.latestTrackMetadata;
    latestTrackColors = dataCache.latestTrackColors;
    scrobbles = dataCache.scrobbles;
    timestamp = dataCache.timestamp;
  } else {
    await storageRemove('recentTracksCache', 'local');
    await loadRecentTracks();
  }

  if (isScrobblesPollingEnabled()) {
    polling.start();
  }
}

async function processData(data: RecentTrack[]) {
  const normalizedData = data.length > 0 ? data.map(utils.normalizeLastFmTrack) : [];
  let latestTrack: TrackDataNormalized | null = null;
  let latestTrackMetadata: {
    rating: number;
    formats: Set<ERYMFormat>;
    formatsLabel: string;
  } = {
    rating: 0,
    formats: new Set(),
    formatsLabel: '',
  };
  let latestTrackColors: ColorsMap | null = null;
  let scrobbles: TrackDataNormalized[] = [];

  if (normalizedData.length === 0) {
    return {
      latestTrack,
      latestTrackMetadata,
      latestTrackColors,
      scrobbles,
    };
  }

  latestTrack = normalizedData[0];

  scrobbles = latestTrack.nowPlaying ? normalizedData.slice(1) : normalizedData.slice(0);

  const colors = await trySetColorsFromTrack(latestTrack);
  latestTrackColors = colors ? getColorsMap(colors) : null;

  if (context.isMyProfile) {
    const albumNameFallback = latestTrack?.albumName ? cleanupReleaseEdition(latestTrack.albumName) : '';
    const albumsFromDB = await RecordsAPI.getByArtistAndTitle(
      latestTrack.artistName,
      latestTrack.albumName,
      albumNameFallback,
    );
    let rating = 0;
    let formats = new Set<ERYMFormat>();
    let formatsLabel = '';

    const albumsFromDBFullMatch: IRYMRecordDBMatch[] = [];
    const albumsFromDBPartialMatch: IRYMRecordDBMatch[] = [];

    const albumsMatchMap = {
      full: albumsFromDBFullMatch,
      partial: albumsFromDBPartialMatch,
    };

    albumsFromDB.forEach((album) => {
      albumsMatchMap[album._match as keyof typeof albumsMatchMap]?.push(album);
      if (album.ownership === ERYMOwnershipStatus.InCollection && album.format) {
        formats.add(album.format);
      }
    });

    const earliestFullMatchRating = utils.getEarliestRating(albumsFromDBFullMatch);
    const earliestPartialMatchRating = utils.getEarliestRating(albumsFromDBPartialMatch);

    rating = earliestFullMatchRating || earliestPartialMatchRating;
    formatsLabel = Array.from(formats).map(key => constants.RYMFormatsLabels[key] || key).join(', ');

    latestTrackMetadata = {
      rating,
      formats,
      formatsLabel,
    };
  }

  return {
    latestTrack,
    latestTrackMetadata,
    latestTrackColors,
    scrobbles,
  };
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

    const {
      latestTrack: latestTrackData,
      latestTrackMetadata: latestTrackMetadataData,
      latestTrackColors: latestTrackColorsData,
      scrobbles: scrobblesData,
    } = await processData(data);

    latestTrack = latestTrackData;
    latestTrackMetadata = latestTrackMetadataData;
    latestTrackColors = latestTrackColorsData;
    scrobbles = scrobblesData;
    const newTimestamp = Date.now();
    timestamp = newTimestamp;

    await storageSet({
      recentTracksCache: {
        latestTrack: latestTrackData,
        latestTrackMetadata: latestTrackMetadataData,
        latestTrackColors: latestTrackColorsData,
        scrobbles: scrobblesData,
        timestamp: newTimestamp,
        userName: context.userName,
      }
    }, 'local');

    console.log('written to cache');

    failedToFetch = false;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      if (!latestTrack) {
        failedToFetch = true;
      }
    }
  }
};

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
  for (const [key, value] of Object.entries(latestTrackColors || {})) {
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
    track={latestTrack}
    rating={latestTrackMetadata.rating}
    formats={latestTrackMetadata.formats}
    formatsLabel={latestTrackMetadata.formatsLabel}
    configStore={configStore}
    context={context}
    rymSyncTimestamp={context.rymSyncTimestamp}
    isScrobblesHistoryPinned={isScrobblesHistoryPinned()}
    onToggleScrobblesHistory={onToggleScrobblesHistory}
    onToggleScrobblesHistoryPinned={onToggleScrobblesHistoryPinned}
    pollingProgress={$progress}
  />
  {#if $configStore.recentTracksLimit > 1}
    <ScrobblesHistory
      scrobbles={scrobbles}
      timestamp={timestamp}
      open={isScrobblesHistoryOpen}
    />
  {/if}
{/if}
