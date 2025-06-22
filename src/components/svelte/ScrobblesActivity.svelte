<svelte:options runes={true} />

<script lang="ts">
import ScrobblesHistory from './ScrobblesHIstory.svelte';
import ScrobblesNowPlaying from './ScrobblesNowPlaying.svelte';
import errorMessages from '@/modules/profile/recentTracks/errorMessages.json';
import type {
  TrackDataNormalized,
  PlayHistoryData,
} from '@/modules/profile/recentTracks/types';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import * as api from '@/api';

const { config, rymSyncTimestamp = null, userName } = $props<{
  config: ProfileOptions;
  rymSyncTimestamp?: number | null;
  userName: string;
}>();

let isScrobblesHistoryOpen: boolean = $state(config.recentTracksShowOnLoad);

let abortController: AbortController = new AbortController();
let failedToFetch: boolean = false;
let colors: VibrantUiColors | null = $state(null);
let isLoaded: boolean = $state(false);

let recentTracks = $state<TrackDataNormalized[]>([]);
let nowPlayingTrack = $derived(recentTracks[0]);
let tracksHistory = $derived(recentTracks[0].nowPlaying ? recentTracks.slice(1) : recentTracks);
let recentTracksTimestamp = $state<number>(0);

const init = async () => {
  const { recentTracksCache } = await utils.storageGet(['recentTracksCache', 'local']);

  if (
    recentTracksCache
    && recentTracksCache.data
    && recentTracksCache.timestamp
    && recentTracksCache.userName === userName
  ) {
    if (
      Date.now() - recentTracksCache.timestamp >
      constants.RECENT_TRACKS_INTERVAL_MS
    ) {
      // Cache is outdated, fetch new data
      await fetchAndRenderRecentTracks();
    } else {
      // await populateRecentTracks(recentTracksCache.data, recentTracksCache.timestamp);
      // latestTrack = {
      //   ...latestTrack,
      //   ...recentTracksCache.data[0],
      //   timestamp: recentTracksCache.timestamp,
      // };
      // uiElements.list.tracksWrapper.dataset.timestamp = `Updated at ${new Date(recentTracksCache.timestamp).toLocaleString()}`;
      // lastTimestamp = recentTracksCache.timestamp;
    }
  } else {
    // No cache available for this user, fetch new data
    if (document.visibilityState === 'visible') {
      await fetchAndRenderRecentTracks();
    }
  }

  isLoaded = true;
}

async function fetchAndRenderRecentTracks() {
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

    const normalizedData = data.map((item): TrackDataNormalized => ({
      nowPlaying: item["@attr"]?.nowplaying === 'true',
      coverUrl: item.image[0]['#text'],
      coverLargeUrl: item.image[3]['#text'],
      coverExtraLargeUrl: item.image[item.image.length - 1]['#text'],
      trackName: item.name,
      timestamp: item.date?.uts ? Number(item.date.uts) : null,
      albumName: item.album['#text'],
      artistName: item.artist['#text'],
    }));

    recentTracks = normalizedData;
    recentTracksTimestamp = timestamp;

    try {
      colors = await utils.getImageColors(nowPlayingTrack.coverExtraLargeUrl);
    } catch {
      console.warn(errorMessages.failedToFetchColors);
    }

    await utils.storageSet({
      recentTracksCache: {
        data: normalizedData,
        timestamp,
        userName: userName,
      }
    }, 'local');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      failedToFetch = true;
    }
  }
};

type CSSVarName = `--${string}`;

const colorsMap = $derived(colors ? getColorsMap(colors) : {});

function getColorsMap(colors: utils.VibrantUiColors) {
  const colorsMap: Record<CSSVarName, string> = {
    '--clr-light-bg': colors.light.bgColor,
    '--clr-light-bg-contrast': colors.light.bgColorContrast,
    '--clr-light-accent': colors.light.accentColor,
    '--clr-light-accent-contrast': colors.light.accentColorContrast,
    '--clr-dark-bg': colors.dark.bgColor,
    '--clr-dark-bg-contrast': colors.dark.bgColorContrast,
    '--clr-dark-accent': colors.dark.accentColor,
    '--clr-dark-accent-contrast': colors.dark.accentColorContrast,
    '--clr-light-accent-hue': String(Math.trunc(colors.light.accentColorHSL[0] * 360)),
    '--clr-light-accent-saturation': (colors.light.accentColorHSL[1] * 100).toFixed(2),
    '--clr-light-accent-lightness': (colors.light.accentColorHSL[2] * 100).toFixed(2),
    '--clr-dark-accent-hue': String(Math.trunc(colors.dark.accentColorHSL[0] * 360)),
    '--clr-dark-accent-saturation': (colors.dark.accentColorHSL[1] * 100).toFixed(2),
    '--clr-dark-accent-lightness': (colors.dark.accentColorHSL[2] * 100).toFixed(2),
  };

  Object.keys(colors.palette).forEach((key) => {
    if (colors.palette[key]?.hex) {
      colorsMap[`--clr-palette-${key.toLowerCase()}`] = colors.palette[key].hex;
    }
  });

  return colorsMap;
}

const setRootElement = (node: HTMLSpanElement) => {
  const target = node?.parentElement;
  if (!target) return;

  for (const [key, value] of Object.entries(colorsMap)) {
    target.style.setProperty(key, value as string);
  }
}

init();
</script>

<span style="display: contents" use:setRootElement></span>

{#if isLoaded}
  <ScrobblesNowPlaying
    track={nowPlayingTrack}
    userName={userName}
    config={config}
    bind:isScrobblesHistoryOpen
  />
  {isScrobblesHistoryOpen ? 'true' : 'false'}
  <ScrobblesHistory
    scrobbles={tracksHistory}
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
