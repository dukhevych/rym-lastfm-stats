<svelte:options runes={true} />

<script lang="ts">
  import * as utils from '@/helpers/utils';
  import {
    storageGet,
    storageSet,
    storageRemove,
    getLastfmUserName,
    generateStorageKey,
  } from '@/helpers/storageUtils';
  import * as constants from '@/helpers/constants';
  import { getArtistInfo } from '@/api/getArtistInfo';
  import DialogBase from '@/components/svelte/DialogBase.svelte';
  import ListStats from '@/components/svelte/ListStats.svelte';

  interface Props {
    config: ProfileOptions;
    artistId: string;
    artistName: string;
    artistNameLocalized: string;
    artistAkaNames: string[];
    artistAdditionalNames: string[];
  }

  const {
    config,
    artistId,
    artistName,
    artistNameLocalized,
    artistAkaNames,
    artistAdditionalNames,
  }: Props = $props();

  const moduleName = 'artistStats';

  const artistNamesFlat = $derived(() => {
    const variants = new Set<string>();

    artistNameLocalized && variants.add(artistNameLocalized);

    artistName && variants.add(artistName);

    artistAkaNames.forEach((name) => {
      variants.add(name);
    });

    artistAdditionalNames.forEach((name) => {
      variants.add(name);
    });

    return Array.from(variants);
  });

  let isLoaded = $state(false);
  let isLoading = $state(false);
  let artistQuery = $state<string>('');
  let dialogVisible = $state(false);
  let isArtistQueryCached = $state(false);
  let allFailed = $state(false);

  const shouldShowDialog = $derived(() => artistNamesFlat().length > 1);

  interface Stats {
    playcount: number;
    listeners: number;
    userplaycount?: number | null;
    url: string;
  }

  let statsData = $state<Stats | null>();
  const listeners = $derived(() => statsData?.listeners ?? 0);
  const playcount = $derived(() => statsData?.playcount ?? 0);
  const scrobbles = $derived(() => {
    if (!userName) return null;
    return statsData?.userplaycount ? +statsData.userplaycount : 0;
  });
  let timestamp = $state<number>(Date.now());
  let error = $state<string | null>(null);
  let userName = $state<string | null>(null);

  const statsCacheKey = $derived(() => generateStorageKey(moduleName, 'statsCache', artistId, artistQuery));
  const artistQueryCacheKey = $derived(() => generateStorageKey(moduleName, 'artistQueryCache', artistId));

  interface StatsCache {
    data: Stats | null;
    timestamp: number;
    userName: string | null;
  }

  function checkCacheValidity(cache: StatsCache) {
    const cacheLifetime = userName
      ? constants.STATS_CACHE_LIFETIME_MS
      : constants.STATS_CACHE_LIFETIME_GUEST_MS;

    return (
      cache &&
      cache.data &&
      cache.timestamp &&
      cache.userName === userName &&
      Date.now() - cache.timestamp <= cacheLifetime
    );
  }

  async function loadCache() {
    const statsCache: StatsCache | null = await storageGet(
      statsCacheKey(),
      'local',
    );

    if (statsCache && checkCacheValidity(statsCache)) {
      return statsCache;
    } else {
      await storageRemove(statsCacheKey(), 'local');
      return null;
    }
  }

  async function loadStats(artistName: string = artistQuery) {
    isLoading = true;

    let data: Stats | null = null;

    const statsCache: StatsCache | null = await loadCache();

    if (statsCache) {
      data = statsCache.data;
      timestamp = statsCache.timestamp;
    } else {
      const artistInfoResponse = await getArtistInfo({
        params: {
          artist: artistName,
          username: userName,
        },
        apiKey: config.lastfmApiKey || (process.env.LASTFM_API_KEY as string),
      });

      if (artistInfoResponse) {
        if (!artistInfoResponse.error) {
          data = artistInfoResponse.artist.stats;
          timestamp = Date.now();
        } else {
          error = artistInfoResponse.message ?? artistInfoResponse.error.toString();
        }
      }

      await updateStatsCache({
        data,
        timestamp: Date.now(),
        userName,
      });
    }

    statsData = data;
    isLoading = false;
  }

  async function updateStatsCache(value: StatsCache) {
    await storageSet({
      [statsCacheKey()]: value,
    }, 'local');
  }

  async function updateArtistQueryCache(value: string) {
    await storageSet({
      [artistQueryCacheKey()]: value,
    }, 'local');
  }

  async function handleVariantClick(artistName: string) {
    artistQuery = artistName;
    await updateArtistQueryCache(artistQuery);
    await loadStats();
  }

  async function initArtistQuery() {
    const artistQueryCache: string | null = await storageGet(artistQueryCacheKey(), 'local');

    if (artistQueryCache) {
      artistQuery = artistQueryCache;
      isArtistQueryCached = true;
    } else {
      artistQuery = artistNamesFlat()[0];

      await storageSet({
        [artistQueryCacheKey()]: artistQuery,
      }, 'local');
    }
  }

  async function initStats() {
    for (const artistName of artistNamesFlat()) {
      await loadStats(artistName);
      if (statsData) {
        await updateArtistQueryCache(artistName);
        break;
      }
      await utils.wait(300);
    }

    if (!statsData) {
      allFailed = true;
    }
  }

  async function init() {
    const [_userName] = await Promise.all([
      getLastfmUserName(),
      initArtistQuery(),
    ]);

    userName = _userName;

    if (isArtistQueryCached) {
      await loadStats();
    } else {
      await initStats();
    }
    isLoaded = true;
  }

  init();
</script>

<div
  class="stats-wrapper"
  class:is-updating={isLoaded && isLoading}
>
  {#if !isLoaded}
    {#if isLoading}
      <div class="loading-message">Loading...</div>
    {:else}
      <div class="no-data-message">Please wait...</div>
    {/if}
  {/if}

  {#if isLoaded}
    {#if statsData}
      <ListStats
        listeners={listeners()}
        playcount={playcount()}
        scrobbles={scrobbles()}
        timestamp={timestamp}
      />
      <span class="separator" aria-hidden="true">|</span>
      <a
        class="lastfm-link clr-lastfm"
        target="_blank"
        title={`View "${artistQuery}" on Last.fm`}
        aria-label={`View "${artistQuery}" on Last.fm`}
        href={statsData?.url}
      >
        <svg viewBox="0 0 24 24">
          <use xlink:href="#svg-lastfm-square-symbol"></use>
        </svg>
        Last.fm
      </a>
    {:else}
      <span class="no-data-message" title={error}>No Last.fm data found</span>
    {/if}

    {#if shouldShowDialog()}
      <span class="separator" aria-hidden="true">|</span>
      <button
        type="button"
        class="link-alike"
        aria-label="Switch artist name"
        onclick={() => dialogVisible = true}
      >
        <strong>Switch artist name</strong>
      </button>
    {/if}
  {/if}
</div>

{#if shouldShowDialog()}
  <DialogBase
    bind:visible={dialogVisible}
    title="Choose artist name"
    items={artistNamesFlat()}
    selected={artistQuery}
    handleVariantClick={handleVariantClick}
  />
{/if}

<style>
.stats-wrapper {
  position: relative;
  display: flex;
  align-items: center;

  &.is-updating {
    opacity: 0.5;
    pointer-events: none;
  }

  .lastfm-link {
    transition: color .15s ease-in-out;
    display: inline-flex;
    font-weight: bold;
    gap: 0.5rem;

    &[href=""] { display: none; }

    svg {
      width: 20px;
      height: 20px;
      display: block;
    }
  }
}
</style>