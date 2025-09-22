<svelte:options runes={true} />

<script lang="ts">
import { onDestroy } from 'svelte';

import * as api from '@/api';
import type { RecentTrack } from '@/api/getRecentTracks';
import { usePolling } from '@/composables/usePolling';
import { getImageColors, getColorsMap } from '@/helpers/colors';
import type { ColorsMap } from '@/helpers/colors';
import * as constants from '@/helpers/constants';
import { ERYMOwnershipStatus } from '@/helpers/enums';
import { RecordsAPI } from '@/helpers/records-api';
import { storageGet, storageSet, storageRemove, updateProfileOptions } from '@/helpers/storageUtils';
import { cleanupReleaseEdition } from '@/helpers/string';
import * as utils from '@/helpers/utils';

import ScrobblesHistory from './ScrobblesHistory.svelte';
import ScrobblesNowPlaying from './ScrobblesNowPlaying.svelte';

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

let isScrobblesHistoryOpen = $state($configStore.profileRecentTracksShowOnLoad);

const isScrobblesPollingEnabled = $derived(() => $configStore.profileRecentTracksPolling);
const isScrobblesHistoryPinned = $derived(() => $configStore.profileRecentTracksShowOnLoad);

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

  interface Result {
    latestTrack: TrackDataNormalized | null;
    latestTrackMetadata: {
      rating: number;
      formats: Set<ERYMFormat>;
      formatsLabel: string;
    };
    latestTrackColors: ColorsMap | null;
    scrobbles: TrackDataNormalized[];
  }

  const result: Result = {
    latestTrack: null,
    latestTrackMetadata: {
      rating: 0,
      formats: new Set(),
      formatsLabel: '',
    },
    latestTrackColors: null,
    scrobbles: [],
  };

  if (normalizedData.length === 0) return result;

  result.latestTrack = normalizedData[0];
  result.scrobbles = result.latestTrack.nowPlaying ? normalizedData.slice(1) : normalizedData.slice(0);

  if (result.latestTrack.covers.length > 0) {
    const colors = await getImageColors(result.latestTrack.covers.at(1)!);
    if (colors) {
      result.latestTrackColors = getColorsMap(colors);
    }
  }

  if (context.isMyProfile) {
    const albumNameFallback = result.latestTrack?.albumName ? cleanupReleaseEdition(result.latestTrack.albumName) : '';
    const albumsFromDB = await RecordsAPI.getByArtistAndTitle(
      result.latestTrack.artistName,
      result.latestTrack.albumName,
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

    result.latestTrackMetadata = {
      rating,
      formats,
      formatsLabel,
    };
  }

  return result;
}

onDestroy(() => {
  polling.cleanup();
});

async function loadRecentTracks() {
  abortController?.abort();
  abortController = new AbortController();

  try {
    const recentTracksResponse = await api.getRecentTracks({
      apiKey: context.lastfmApiKey,
      params: {
        username: context.userName,
        limit: $configStore.profileRecentTracksLimit,
        extended: true,
      },
      signal: abortController.signal,
    });

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
    timestamp = Date.now();

    await storageSet({
      recentTracksCache: {
        latestTrack: latestTrackData,
        latestTrackMetadata: latestTrackMetadataData,
        latestTrackColors: latestTrackColorsData,
        scrobbles: scrobblesData,
        timestamp,
        userName: context.userName,
      }
    }, 'local');

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
  if ($configStore.profileRecentTracksPolling) {
    polling.start();
  } else {
    polling.stop();
  }
});

$effect(() => {
  if ($configStore.profileRecentTracksRymHistoryHide) {
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
    updateProfileOptions({ profileRecentTracksShowOnLoad: !isScrobblesHistoryPinned() }),
    configStore.update((config) => ({
      ...config,
      profileRecentTracksShowOnLoad: !isScrobblesHistoryPinned(),
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
  {#if $configStore.profileRecentTracksLimit > 1}
    <ScrobblesHistory
      scrobbles={scrobbles}
      timestamp={timestamp}
      open={isScrobblesHistoryOpen}
    />
  {/if}
{/if}
