<svelte:options runes={true} />

<script lang="ts">
  import { RYMReleaseType } from '@/helpers/enums';
  import * as utils from '@/helpers/utils';
  import {
    storageGet,
    storageSet,
    storageRemove,
    getLastfmUserName,
    generateStorageKey,
  } from '@/helpers/storageUtils';
  import * as constants from '@/helpers/constants';
  import { getReleaseInfo, ReleaseInfoMethodMap } from '@/api/getReleaseInfo';
  import DialogBase from '@/components/svelte/DialogBase.svelte';
  import ListStats from '@/components/svelte/ListStats.svelte';

  interface Props {
    config: ProfileOptions;
    songId: string;
    songTitle: string;
    artistNames: RYMArtistNames;
  }

  const {
    config,
    songId,
    songTitle,
    artistNames,
  }: Props = $props();

  const switchArtistLinkText = $derived(() => {
    let str = 'Switch artist';
    if (artistNames.length === 1) str += ' name';
    return str;
  });

  const artistNamesFlat = $derived(() => {
    const variants = new Set<string>();

    artistNames.forEach(({ artistNameLocalized, artistName }) => {
      artistNameLocalized && variants.add(artistNameLocalized);
      artistName && variants.add(artistName);
    });

    return Array.from(variants);
  });

  let isLoaded = $state(false);
  let isLoading = $state(false);
  let artistQuery = $state<string>('');
  let dialogVisible = $state(false);

  const shouldShowDialog = $derived(() => artistNamesFlat().length > 1);

  interface SongStats {
    playcount: number;
    listeners: number;
    userplaycount?: number | null;
    url: string;
    artist: {
      name: string;
    };
  }

  let songStatsData = $state<SongStats | null>();

  const stats = $derived(() => {
    if (!songStatsData) return [];

    interface StatsItem {
      title?: string;
      value: number;
      suffix?: string;
      prefix?: string;
      bold?: boolean;
      prefixBold?: boolean;
      suffixBold?: boolean;
    }

    const result: StatsItem[] = [
      {
        value: +songStatsData.listeners,
        suffix: 'listener' + (+songStatsData.listeners === 1 ? '' : 's'),
        bold: true,
      },
      {
        value: +songStatsData.playcount,
        suffix: 'play' + (+songStatsData.playcount === 1 ? '' : 's'),
        bold: true,
      },
    ];

    if (songStatsData.userplaycount) {
      result.push({
        value: +songStatsData.userplaycount,
        prefix: 'My scrobbles:',
        prefixBold: true,
        bold: true,
      });
    }

    return result;
  });

  let timestamp = $state<number>(Date.now());
  let error = $state<string | null>(null);
  let userName = $state<string | null>(null);

  const songStatsCacheKey = $derived(() => generateStorageKey('songStatsCache', songId, artistQuery));
  const artistQueryCacheKey = $derived(() => generateStorageKey('artistQueryCache', songId));
  const releaseType = ReleaseInfoMethodMap[RYMReleaseType.Single].split('.')[0];

  async function loadCache() {
    const songStatsCache: SongStatsCache | null = await storageGet(
      songStatsCacheKey(),
      'local',
    );

    if (songStatsCache && checkCacheValidity(songStatsCache)) {
      return songStatsCache;
    } else {
      await storageRemove(songStatsCacheKey(), 'local');
      return null;
    }
  }

  async function loadSongStats(artistName: string = artistQuery) {
    isLoading = true;

    let data: SongStats | null = null;

    const songStatsCache: SongStatsCache | null = await loadCache();

    if (songStatsCache) {
      data = songStatsCache.data;
      timestamp = songStatsCache.timestamp;
    } else {
      const songInfoResponse = await getReleaseInfo({
        params: {
          artist: artistName,
          title: songTitle,
          username: userName,
        },
        apiKey: config.lastfmApiKey || (process.env.LASTFM_API_KEY as string),
        releaseType: RYMReleaseType.Single,
      });

      if (songInfoResponse) {
        if (!songInfoResponse.error) {
          data = songInfoResponse[releaseType];
          timestamp = Date.now();
        } else {
          error = songInfoResponse.error.toString();
        }
      }

      await updateSongStatsCache({
        data,
        timestamp: Date.now(),
        userName,
      });
    }

    songStatsData = data;
    isLoading = false;
  }

  interface SongStatsCache {
    data: SongStats | null;
    timestamp: number;
    userName: string | null;
  }

  function checkCacheValidity(cache: SongStatsCache) {
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

  async function updateSongStatsCache(value: SongStatsCache) {
    await storageSet({
      [songStatsCacheKey()]: value,
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
    await loadSongStats();
  }

  let isArtistQueryCached = $state(false);

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

  let allFailed = $state(false);

  async function initSongStats() {
    for (const artistName of artistNamesFlat()) {
      await loadSongStats(artistName);
      if (songStatsData) {
        await updateArtistQueryCache(artistName);
        break;
      }
      await utils.wait(300);
    }

    if (!songStatsData) {
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
      await loadSongStats();
    } else {
      await initSongStats();
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
    {#if songStatsData}
      <ListStats
        items={stats()}
        timestamp={timestamp}
      />
      <span class="separator" aria-hidden="true">|</span>
      <a
        class="lastfm-link"
        target="_blank"
        title={`View ${artistQuery} on Last.fm`}
        aria-label={`View ${artistQuery} on Last.fm`}
        href={songStatsData?.url}
      >
        <svg viewBox="0 0 24 24">
          <use xlink:href="#svg-lastfm-square-symbol"></use>
        </svg>
        Last.fm
      </a>
    {:else}
      <span class="no-data-message">No Last.fm data found</span>
      {#if error}
        <span class="error-message">Error: {error}</span>
      {/if}
    {/if}

    {#if shouldShowDialog()}
      <span class="separator" aria-hidden="true">|</span>
      <button
        type="button"
        class="link-alike"
        aria-label={switchArtistLinkText()}
        onclick={() => dialogVisible = true}
      >
        <strong>{switchArtistLinkText()}</strong>
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