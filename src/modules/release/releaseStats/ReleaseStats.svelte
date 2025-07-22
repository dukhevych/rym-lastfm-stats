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
  import { getReleaseInfo, RYMEntityLastfmMap } from '@/api/getReleaseInfo';
  import { deburrLight, cleanupReleaseEdition, cleanupSuffix } from '@/helpers/string';
  import DialogBase from '@/components/svelte/DialogBase.svelte';
  import ListStats from '@/components/svelte/ListStats.svelte';

  interface Props {
    config: ProfileOptions;
    releaseId: string;
    releaseTitle: string;
    releaseType: RYMReleaseType;
    artistNames: RYMArtistNames;
  }

  const {
    config,
    releaseId,
    artistNames,
    releaseType,
    releaseTitle,
  }: Props = $props();

  const releaseTitleDeburred = $derived(() => deburrLight(releaseTitle));

  const artistNamesFlat = $derived(() => {
    const variants = new Set<string>();

    artistNames.forEach(({ artistNameLocalized, artistName }) => {
      artistNameLocalized && variants.add(artistNameLocalized);
      artistName && variants.add(artistName);
    });

    return Array.from(variants);
  });

  const releaseTitleOptions = $derived(() => {
    const options = new Set<string>();
    const result = [];

    result.push({
      value: releaseTitle,
      label: releaseTitle,
    });
    options.add(releaseTitle);

    if (!options.has(releaseTitleDeburred())) {
      result.push({
        value: releaseTitleDeburred(),
        label: releaseTitleDeburred() + ' (Deburred)',
      });
      options.add(releaseTitleDeburred());
    }

    const cleanupReleaseEditionValue = cleanupReleaseEdition(releaseTitle);
    if (!options.has(cleanupReleaseEditionValue)) {
      result.push({
        value: cleanupReleaseEditionValue,
        label: cleanupReleaseEditionValue + ' (No edition suffix)',
      });
      options.add(cleanupReleaseEditionValue);
    }

    const cleanupSuffixValue = cleanupSuffix(releaseTitle);
    if (!options.has(cleanupSuffixValue)) {
      result.push({
        value: cleanupSuffixValue,
        label: cleanupSuffixValue + ' (No suffix at all)',
      });
      options.add(cleanupSuffixValue);
    }

    return result;
  });

  let isLoaded = $state(false);
  let isLoading = $state(false);
  let artistQuery = $state<string>('');
  let releaseTitleQuery = $state<string>('');
  let dialogVisible = $state(false);
  let isArtistQueryCached = $state(false);
  let isReleaseTitleQueryCached = $state(false);
  let allFailed = $state(false);

  const shouldShowDialog = $derived(() => {
    if (artistNamesFlat().length > 1) {
      return true;
    }

    if (releaseTitleOptions().length > 1) {
      return true;
    }

    return false;
  });

  interface ReleaseStats {
    playcount: number;
    listeners: number;
    userplaycount?: number | null;
    url: string;
    artist: {
      name: string;
    };
  }

  let releaseStatsData = $state<ReleaseStats | null>();
  const listeners = $derived(() => releaseStatsData?.listeners ?? 0);
  const playcount = $derived(() => releaseStatsData?.playcount ?? 0);
  const scrobbles = $derived(() => {
    if (!userName) return null;
    return releaseStatsData?.userplaycount ? +releaseStatsData.userplaycount : 0;
  });
  let timestamp = $state<number>(Date.now());
  let error = $state<string | null>(null);
  let userName = $state<string | null>(null);

  const moduleName = 'releaseStats';

  const releaseStatsCacheKey = $derived(() => generateStorageKey(moduleName, 'releaseStatsCache', releaseId, artistQuery, releaseTitleQuery));
  const artistQueryCacheKey = $derived(() => generateStorageKey(moduleName, 'artistQueryCache', releaseId));
  const releaseTitleQueryCacheKey = $derived(() => generateStorageKey(moduleName, 'releaseTitleQueryCache', releaseId));

  async function loadCache() {
    // await storageRemove(releaseStatsCacheKey(), 'local');
    const releaseStatsCache: ReleaseStatsCache | null = await storageGet(
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

  async function loadReleaseStats(artist: string = artistQuery, title: string = releaseTitleQuery) {
    isLoading = true;

    let data: ReleaseStats | null = null;

    const releaseStatsCache: ReleaseStatsCache | null = await loadCache();

    if (releaseStatsCache) {
      data = releaseStatsCache.data;
      timestamp = releaseStatsCache.timestamp;
    } else {
      const releaseInfoResponse = await getReleaseInfo({
        params: {
          artist,
          title,
          username: userName,
        },
        apiKey: config.lastfmApiKey || (process.env.LASTFM_API_KEY as string),
        releaseType,
      });

      if (releaseInfoResponse) {
        if (!releaseInfoResponse.error) {
          data = releaseInfoResponse[RYMEntityLastfmMap[releaseType]];
          timestamp = Date.now();
        } else {
          error = releaseInfoResponse.message ?? releaseInfoResponse.error.toString();
        }
      }

      await updateReleaseStatsCache({
        data,
        timestamp: Date.now(),
        userName,
      });
    }

    releaseStatsData = data;
    isLoading = false;
  }

  interface ReleaseStatsCache {
    data: ReleaseStats | null;
    timestamp: number;
    userName: string | null;
  }

  function checkCacheValidity(cache: ReleaseStatsCache) {
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

  async function updateReleaseStatsCache(value: ReleaseStatsCache) {
    await storageSet({
      [releaseStatsCacheKey()]: value,
    }, 'local');
  }

  async function updateArtistQueryCache(value: string) {
    await storageSet({
      [artistQueryCacheKey()]: value,
    }, 'local');
  }

  async function updateReleaseTitleQueryCache(value: string) {
    await storageSet({
      [releaseTitleQueryCacheKey()]: value,
    }, 'local');
  }

  async function initArtistQuery() {
    const artistQueryCache: string | null = await storageGet(artistQueryCacheKey(), 'local');

    if (artistQueryCache) {
      artistQuery = artistQueryCache;
      isArtistQueryCached = true;
    } else {
      artistQuery = artistNamesFlat()[0];
      await updateArtistQueryCache(artistQuery);
    }
  }

  async function initReleaseTitleQuery() {
    const releaseTitleQueryCache: string | null = await storageGet(releaseTitleQueryCacheKey(), 'local');

    if (releaseTitleQueryCache) {
      releaseTitleQuery = releaseTitleQueryCache;
      isReleaseTitleQueryCached = true;
    } else {
      releaseTitleQuery = releaseTitleOptions()[0].value;
      await updateReleaseTitleQueryCache(releaseTitleQuery);
    }
  }

  async function initReleaseStats() {
    for (const artistName of artistNamesFlat()) {
      await loadReleaseStats(artistName);
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
      initReleaseTitleQuery(),
    ]);

    userName = _userName;

    if (isArtistQueryCached && isReleaseTitleQueryCached) {
      await loadReleaseStats();
    } else {
      await initReleaseStats();
    }
    isLoaded = true;
  }

  let artistQueryField = $state<string>('');
  let releaseTitleQueryField = $state<string>('');

  $effect(() => {
    if (dialogVisible) {
      artistQueryField = artistQuery;
      releaseTitleQueryField = releaseTitleQuery;
    }
  });

  async function handleSubmit(event: Event) {
    event.preventDefault();

    let needUpdate = false;

    if (artistQueryField !== artistQuery) {
      artistQuery = artistQueryField;
      await updateArtistQueryCache(artistQuery);
      needUpdate = true;
    }

    if (releaseTitleQueryField !== releaseTitleQuery) {
      releaseTitleQuery = releaseTitleQueryField;
      await updateReleaseTitleQueryCache(releaseTitleQuery);
      needUpdate = true;
    }

    dialogVisible = false;

    if (needUpdate) {
      await loadReleaseStats(artistQuery, releaseTitleQuery);
    }
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
        listeners={listeners()}
        playcount={playcount()}
        scrobbles={scrobbles()}
        timestamp={timestamp}
      />
      <span class="separator" aria-hidden="true">|</span>
      <a
        class="lastfm-link"
        target="_blank"
        title={`View "${artistQuery}" on Last.fm`}
        aria-label={`View "${artistQuery}" on Last.fm`}
        href={releaseStatsData?.url}
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
        class="btn-icon"
        aria-label="Metadata settings"
        title="Metadata settings"
        onclick={() => dialogVisible = true}
      >
        <svg viewBox="0 0 24 24">
          <use xlink:href="#svg-settings-symbol"></use>
        </svg>
      </button>
    {/if}
  {/if}
</div>

{#if shouldShowDialog()}
  <DialogBase
    bind:visible={dialogVisible}
    title="Metadata settings"
  >
    <form onsubmit={handleSubmit} class="flex flex-col gap-4 p-6">
      <label class="flex flex-col gap-2">
        <strong>
          Artist
          {#if artistNamesFlat().length === 1}
            <span class="text-gray-500">
              (Only one option is available)
            </span>
          {/if}
        </strong>

        <select
          name="artist"
          class="rounded-md border border-gray-300 p-2"
          disabled={artistNamesFlat().length === 1}
          bind:value={artistQueryField}
        >
          {#each artistNamesFlat() as artist}
            <option value={artist}>{artist}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-2">
        <strong>
          Release title
          {#if releaseTitleOptions().length === 1}
            <span class="text-gray-500">
              (Only one option is available)
            </span>
          {/if}
        </strong>

        <select
          name="release-title"
          class="rounded-md border border-gray-300 p-2"
          disabled={releaseTitleOptions().length === 1}
          bind:value={releaseTitleQueryField}
        >
          {#each releaseTitleOptions() as title}
            <option value={title.value}>{title.label}</option>
          {/each}
        </select>
      </label>

      <div class="flex justify-end pt-4 gap-2">
        <button type="button" class="btn blue_btn btn_small is-transparent" onclick={() => dialogVisible = false}>Cancel</button>
        <button type="submit" class="btn blue_btn btn_small">Save</button>
      </div>
    </form>
  </DialogBase>
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
