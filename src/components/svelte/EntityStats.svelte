<svelte:options runes={true} />

<script lang="ts">
  import { getReleaseInfo, RYMEntityLastfmMap } from '@/api/getReleaseInfo';
  import DialogBase from '@/components/svelte/DialogBase.svelte';
  import ListStats from '@/components/svelte/ListStats.svelte';
  import * as constants from '@/helpers/constants';
  import { ERYMReleaseType } from '@/helpers/enums';
  import {
    storageGet,
    storageSet,
    storageRemove,
    getLastfmUserName,
    generateStorageKey,
  } from '@/helpers/storageUtils';
  import { deburrLight, cleanupReleaseEdition, cleanupSuffix } from '@/helpers/string';
  import * as utils from '@/helpers/utils';

  interface Props {
    context: Record<string, any>;
    entityId: string;
    entityTitles: Set<string>;
    entityType: ERYMReleaseType;
    artistNames: RYMArtistNames;
    moduleName: string;
  }

  const {
    context,
    entityId,
    entityTitles,
    entityType,
    artistNames,
    moduleName,
  }: Props = $props();

  const artistNamesFlat = $derived(() => {
    const variants = new Set<string>();

    artistNames.forEach(({ artistNameLocalized, artistName }) => {
      artistNameLocalized && variants.add(artistNameLocalized);
      artistName && variants.add(artistName);
    });

    return Array.from(variants);
  });

  const entityTitlesDeburred = $derived(() => new Set(Array.from(entityTitles).map(deburrLight)));

  const entityTitlesOptions = $derived(() => {
    const options = new Set<string>();
    const result: { value: string, label: string }[] = [];

    Array.from(entityTitles).forEach((entityTitle) => {
      result.push({
        value: entityTitle,
        label: entityTitle,
      });
      options.add(entityTitle);
    });

    Array.from(entityTitlesDeburred()).forEach((entityTitle) => {
      if (!options.has(entityTitle)) {
        result.push({
          value: entityTitle,
          label: entityTitle + ' (Simplified)',
        });
        options.add(entityTitle);
      }
    });

    if (entityType === ERYMReleaseType.Album) {
      Array.from(entityTitles).forEach((entityTitle) => {
        const cleanupReleaseEditionValue = cleanupReleaseEdition(entityTitle);
        if (!options.has(cleanupReleaseEditionValue)) {
          result.push({
            value: cleanupReleaseEditionValue,
            label: cleanupReleaseEditionValue + ' (No edition suffix)',
          });
          options.add(cleanupReleaseEditionValue);
        }

        const cleanupSuffixValue = cleanupSuffix(entityTitle);
        if (!options.has(cleanupSuffixValue)) {
          result.push({
            value: cleanupSuffixValue,
            label: cleanupSuffixValue + ' (No suffix at all)',
          });
          options.add(cleanupSuffixValue);
        }
      });
    }

    return result;
  });

  let isLoaded = $state(false);
  let isLoading = $state(false);
  let artistQuery = $state<string>('');
  let entityTitleQuery = $state<string>('');
  let dialogVisible = $state(false);
  let isArtistQueryCached = $state(false);
  let isEntityTitleQueryCached = $state(false);
  // let allFailed = $state(false);

  const shouldShowDialog = $derived(() => {
    if (artistNamesFlat().length > 1) {
      return true;
    }

    if (entityTitlesOptions().length > 1) {
      return true;
    }

    return false;
  });

  interface EntityStats {
    playcount: number;
    listeners: number;
    userplaycount?: number | null;
    url: string;
    artist: {
      name: string;
    };
  }

  let entityStatsData = $state<EntityStats | null>();
  const listeners = $derived(() => entityStatsData?.listeners ?? 0);
  const playcount = $derived(() => entityStatsData?.playcount ?? 0);
  const scrobbles = $derived(() => {
    if (!userName) return null;
    return entityStatsData?.userplaycount ? +entityStatsData.userplaycount : 0;
  });
  let timestamp = $state<number>(Date.now());
  let error = $state<string | null>(null);
  let userName = $state<string | null>(null);

  const entityStatsCacheKey = $derived(() => {
    return generateStorageKey(
      moduleName,
      'entityStatsCache',
      entityId,
      artistQuery,
      entityTitleQuery,
    );
  });
  const artistQueryCacheKey = $derived(() => generateStorageKey(moduleName, 'artistQueryCache', entityId));
  const entityTitleQueryCacheKey = $derived(() => generateStorageKey(moduleName, 'entityTitleQueryCache', entityId));

  async function loadCache() {
    const entityStatsCache: EntityStatsCache | null = await storageGet(
      entityStatsCacheKey(),
      'local',
    );

    if (entityStatsCache && checkCacheValidity(entityStatsCache)) {
      return entityStatsCache;
    } else {
      await storageRemove(entityStatsCacheKey(), 'local');
      return null;
    }
  }

  async function loadEntityStats(artist: string = artistQuery, title: string = entityTitleQuery) {
    isLoading = true;

    let data: EntityStats | null = null;

    const entityStatsCache: EntityStatsCache | null = await loadCache();

    if (entityStatsCache) {
      data = entityStatsCache.data;
      timestamp = entityStatsCache.timestamp;
    } else {
      const entityInfoResponse = await getReleaseInfo({
        params: {
          artist,
          title,
          username: userName,
        },
        apiKey: context.lastfmApiKey || (process.env.LASTFM_API_KEY as string),
        entityType,
      });

      if (entityInfoResponse) {
        if (!entityInfoResponse.error) {
          data = entityInfoResponse[RYMEntityLastfmMap[entityType]];
          timestamp = Date.now();
        } else {
          error = entityInfoResponse.message ?? entityInfoResponse.error.toString();
        }
      }

      await updateEntityStatsCache({
        data,
        timestamp: Date.now(),
        userName,
      });
    }

    entityStatsData = data;
    isLoading = false;
  }

  interface EntityStatsCache {
    data: EntityStats | null;
    timestamp: number;
    userName: string | null;
  }

  function checkCacheValidity(cache: EntityStatsCache) {
    const cacheLifetime = constants.getStatsCacheLifetime(userName, context.lastfmApiKey);

    return (
      cache &&
      cache.data &&
      cache.timestamp &&
      cache.userName === userName &&
      Date.now() - cache.timestamp <= cacheLifetime
    );
  }

  async function updateEntityStatsCache(value: EntityStatsCache) {
    await storageSet({
      [entityStatsCacheKey()]: value,
    }, 'local');
  }

  async function updateArtistQueryCache(value: string) {
    await storageSet({
      [artistQueryCacheKey()]: value,
    }, 'local');
  }

  async function updateEntityTitleQueryCache(value: string) {
    await storageSet({
      [entityTitleQueryCacheKey()]: value,
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

  async function initEntityTitleQuery() {
    const entityTitleQueryCache: string | null = await storageGet(entityTitleQueryCacheKey(), 'local');

    if (entityTitleQueryCache) {
      entityTitleQuery = entityTitleQueryCache;
      isEntityTitleQueryCached = true;
    } else {
      entityTitleQuery = entityTitlesOptions()[0].value;
      await updateEntityTitleQueryCache(entityTitleQuery);
    }
  }

  async function initEntityStats() {
    for (const title of entityTitlesOptions()) {
      for (const artistName of artistNamesFlat()) {
        await loadEntityStats(artistName, title.value);
        if (entityStatsData) {
          await updateArtistQueryCache(artistName);
          await updateEntityTitleQueryCache(title.value);
          break;
        }
        await utils.wait(300);
      }
    }

    // if (!entityStatsData) {
    //   allFailed = true;
    // }
  }

  async function init() {
    const [_userName] = await Promise.all([
      getLastfmUserName(),
      initArtistQuery(),
      initEntityTitleQuery(),
    ]);

    userName = _userName;

    if (isArtistQueryCached && isEntityTitleQueryCached) {
      await loadEntityStats();
    } else {
      await initEntityStats();
    }
    isLoaded = true;
  }

  let artistQueryField = $state<string>('');
  let entityTitleQueryField = $state<string>('');

  $effect(() => {
    if (dialogVisible) {
      artistQueryField = artistQuery;
      entityTitleQueryField = entityTitleQuery;
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

    if (entityTitleQueryField !== entityTitleQuery) {
      entityTitleQuery = entityTitleQueryField;
      await updateEntityTitleQueryCache(entityTitleQuery);
      needUpdate = true;
    }

    dialogVisible = false;

    if (needUpdate) {
      await loadEntityStats(artistQuery, entityTitleQuery);
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
    {#if entityStatsData}
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
        title={`View "${artistQuery} - ${entityTitleQuery}" on Last.fm`}
        aria-label={`View "${artistQuery} - ${entityTitleQuery}" on Last.fm`}
        href={entityStatsData?.url}
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
          Title
          {#if entityTitlesOptions().length === 1}
            <span class="text-gray-500">
              (Only one option is available)
            </span>
          {/if}
        </strong>

        <select
          class="rounded-md border border-gray-300 p-2"
          disabled={entityTitlesOptions().length === 1}
          bind:value={entityTitleQueryField}
        >
          {#each entityTitlesOptions() as title}
            <option value={title.value}>{title.label}</option>
          {/each}
        </select>
      </label>

      <div class="flex justify-end pt-4 gap-4">
        <button type="button" class="link-alike" onclick={() => dialogVisible = false}>Cancel</button>
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
