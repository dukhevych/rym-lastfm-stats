<svelte:options runes={true} />

{#snippet loader()}
  <div class="loader">
    <svg viewBox="0 0 300 150"><use xlink:href="#svg-loader-symbol"></use></svg>
  </div>
{/snippet}

<div class="bubble_header top-artists-header">
  <div>
    Top Artists ({constants.PERIOD_LABELS_MAP[periodValue]})
  </div>
  <div>
    <button
      style:display={periodValue !== savedPeriodValue ? 'block' : 'none'}
      onclick={handlePeriodSave}
    >
      Save
    </button>
    <select bind:value={periodValue} onchange={handlePeriodChange}>
      {#each constants.PERIOD_OPTIONS as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
</div>

<div
  class="bubble_content top-artists"
  style:--config-top-artists-limit={$configStore.topArtistsLimit}
  class:is-loading={isLoading}
  class:is-loaded={isLoaded}
  class:is-empty={isLoaded && artists.length === 0}
>
  {#each artists as artist, index}
    <a
      class="top-artist top-artists-fade-in"
      style:animation-delay={`${index * 0.07}s`}
      style:--hue={artist.hue}
      style:--playcountPercentage={artist.playcountPercentage}
      href={generateSearchUrl({ artist: artist.name })}
      title={artist.name}
    >
      <span class="artist-name">
        <TextEffect bind:text={artist.name} animationType="rotate" />
      </span>
      <span class="artist-scrobbles">{artist.playcount} play{artist.playcount > 1 ? 's' : ''}</span>
    </a>
  {/each}
  {#if !isLoaded}
    {@render loader()}
  {/if}
</div>

<script lang="ts">
import { storageGet, storageSet, storageRemove, updateSyncedOptions } from '@/helpers/storageUtils';
import { generateSearchUrl } from '@/helpers/string';
import * as constants from '@/helpers/constants';
import { getTopArtists } from '@/api/getTopArtists';
import type { TopArtistsPeriod, TopArtist } from '@/api/getTopArtists';
import type { Writable } from 'svelte/store';
import TextEffect from '@/components/svelte/TextEffect.svelte';

interface TopArtistWithPercentage extends TopArtist {
  playcountPercentage: number;
  playcountPercentageAbsolute: number;
  hue: number;
}

interface Props {
  configStore: Writable<AddonOptions>;
  context: Record<string, any>;
}

const {
  configStore,
  context,
}: Props = $props();

let isLoaded = $state(false);
let isLoading = $state(false);

const hueStart = 0;
const hueEnd = 240;

let artistsData = $state<TopArtist[]>([]);
const maxPlaycount = $derived(() => Math.max(...artistsData.map(artist => artist.playcount)));
const minPlaycount = $derived(() => Math.min(...artistsData.map(artist => artist.playcount)));
const playcountRange = $derived(() => maxPlaycount() - minPlaycount());

const artists = $derived<TopArtistWithPercentage[]>(artistsData.map(artist => ({
  ...artist,
  get playcountPercentage() { return (this.playcount / maxPlaycount()) * 100 },
  get playcountPercentageAbsolute() { return playcountRange() ? ((this.playcount - minPlaycount()) / playcountRange()) * 100 : 0 },
  get hue() { return Math.trunc(
    hueStart + (1 - this.playcountPercentageAbsolute / 100) * (hueEnd - hueStart)
  )},
})));

let savedPeriodValue = $state($configStore.topArtistsPeriod);
let periodValue = $state<TopArtistsPeriod>($configStore.topArtistsPeriod as TopArtistsPeriod);
const cacheKey = $derived(() => `topArtistsCache_${periodValue}`);

async function loadCache(periodValue: TopArtistsPeriod) {
  const topArtistsCache: TopArtistsCache | null = await storageGet(cacheKey(), 'local');

  if (topArtistsCache && checkCacheValidity(topArtistsCache)) {
    return topArtistsCache;
  } else {
    await storageRemove(cacheKey(), 'local');
    return null;
  }
}

async function loadTopArtists(periodValue: TopArtistsPeriod) {
  isLoading = true;

  let data: TopArtist[] = [];
  const topArtistsCache: TopArtistsCache | null = await loadCache(periodValue);

  if (topArtistsCache) {
    data = topArtistsCache.data;
  } else {
    const topArtistsResponse = await getTopArtists({
      params: {
        username: context.userName,
        period: periodValue,
        limit: $configStore.topArtistsLimit,
      },
      apiKey: $configStore.lastfmApiKey,
    });
    data = topArtistsResponse.topartists.artist;

    await storageSet({
      [`topArtistsCache_${periodValue}`]: {
        data,
        timestamp: Date.now(),
        userName: context.userName,
      },
    }, 'local');
  }

  artistsData = data.slice();

  isLoading = false;
}

interface TopArtistsCache {
  data: TopArtist[];
  timestamp: number;
  userName: string;
  topArtistsPeriod: TopArtistsPeriod;
}

function checkCacheValidity(cache: TopArtistsCache) {
  return (
    cache
    && cache.data
    && cache.timestamp
    && cache.userName === context.userName
    && Date.now() - cache.timestamp <= constants.TOP_ARTISTS_INTERVAL_MS
  );
}

async function init() {
  await loadTopArtists(periodValue);
  isLoaded = true;
}

async function handlePeriodChange(event: Event) {
  const periodValue = (event.target as HTMLSelectElement).value;
  await loadTopArtists(periodValue as TopArtistsPeriod);
}

async function handlePeriodSave() {
  await updateSyncedOptions({
    topArtistsPeriod: periodValue,
  });
  savedPeriodValue = periodValue;
}

init();
</script>
