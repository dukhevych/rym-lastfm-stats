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
  import ListStats from '@/components/svelte/ListStats.svelte';
  import DialogBase from '@/components/svelte/DialogBase.svelte';

  interface Props {
    config: ProfileOptions;
    releaseId: string;
    releaseTitle: string;
    artistNames: RYMArtistNames;
  }

  const {
    config,
    releaseId,
    artistNames,
    releaseType,
    releaseTitle,
  }: Props = $props();

  console.log('releaseId', releaseId);
  console.log('artistNames', artistNames);
  console.log('releaseType', releaseType);
  console.log('releaseTitle', releaseTitle);

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

  interface releaseStats {
    playcount: number;
    listeners: number;
    userplaycount?: number | null;
    url: string;
    artist: {
      name: string;
    };
  }

  let releaseStatsData = $state<releaseStats | null>();

  const stats = $derived(() => {
    if (!releaseStatsData) return [];

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
        value: +releaseStatsData.listeners,
        suffix: 'listener' + (+releaseStatsData.listeners === 1 ? '' : 's'),
        bold: true,
      },
      {
        value: +releaseStatsData.playcount,
        suffix: 'play' + (+releaseStatsData.playcount === 1 ? '' : 's'),
        bold: true,
      },
    ];

    if (releaseStatsData.userplaycount) {
      result.push({
        value: +releaseStatsData.userplaycount,
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

  const releaseStatsCacheKey = $derived(() => generateStorageKey('releaseStatsCache', releaseId, artistQuery));
  const artistQueryCacheKey = $derived(() => generateStorageKey('artistQueryCache', releaseId));

  async function loadCache() {
    const releaseStatsCache: releaseStatsCache | null = await storageGet(
      releaseStatsCacheKey(),
      'local',
    );

    if (releaseStatsCache && checkCacheValidity(releaseStatsCache)) {
      return releaseStatsCache;
    } else {
      await storageRemove(releaseStatsCacheKey(), 'local');
      return null;
    }
  }

  async function loadreleaseStats(artistName: string = artistQuery) {
    isLoading = true;

    let data: releaseStats | null = null;

    const releaseStatsCache: releaseStatsCache | null = await loadCache();

    if (releaseStatsCache) {
      data = releaseStatsCache.data;
      timestamp = releaseStatsCache.timestamp;
    } else {
      const releaseInfoResponse = await getReleaseInfo({
        params: {
          artist: artistName,
          title: releaseTitle,
          username: userName,
        },
        apiKey: config.lastfmApiKey || (process.env.LASTFM_API_KEY as string),
        releaseType: RYMReleaseType.Single,
      });

      if (releaseInfoResponse) {
        if (!releaseInfoResponse.error) {
          data = releaseInfoResponse[releaseType];
          timestamp = Date.now();
        } else {
          error = releaseInfoResponse.error.toString();
        }
      }

      await updatereleaseStatsCache({
        data,
        timestamp: Date.now(),
        userName,
      });
    }

    releaseStatsData = data;
    isLoading = false;
  }

  interface releaseStatsCache {
    data: releaseStats | null;
    timestamp: number;
    userName: string | null;
  }

  function checkCacheValidity(cache: releaseStatsCache) {
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

  async function updatereleaseStatsCache(value: releaseStatsCache) {
    await storageSet({
      [releaseStatsCacheKey()]: value,
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
    await loadreleaseStats();
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

  async function initreleaseStats() {
    for (const artistName of artistNamesFlat()) {
      await loadreleaseStats(artistName);
      if (releaseStatsData) {
        await updateArtistQueryCache(artistName);
        break;
      }
      await utils.wait(300);
    }

    if (!releaseStatsData) {
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
      await loadreleaseStats();
    } else {
      await initreleaseStats();
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
    {#if releaseStatsData}
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
        href={releaseStatsData?.url}
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