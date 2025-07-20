<svelte:options runes={true} />

{#snippet loader()}
  <div class="loader">
    <svg viewBox="0 0 300 150"><use xlink:href="#svg-loader-symbol"></use></svg>
  </div>
{/snippet}

<div class="bubble_header top-albums-header">
  <div>
    Top Albums
    ({constants.PERIOD_LABELS_MAP[periodValue]})
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
  class="bubble_content top-albums"
  class:is-loading={isLoading}
  class:is-loaded={isLoaded}
  class:is-empty={isLoaded && albums.length === 0}
>
  {@render loader()}
  {#each albums as album, index (album.id)}
    <div class="album-wrapper">
      <div class="album-image">
        <img
          class="fade-in"
          class:loaded={loadedImages[album.id]}
          src={album.image}
          alt={album.title}
          loading="lazy"
          onload={(e) => handleImageLoad(e, album.id)}
          onerror={(e) => handleImageError(e, album.id)}
        />
        {@render loader()}
      </div>
      <div class="album-details">
        <a
          class="album-title"
          href={generateSearchUrl({
            artist: album.artist,
            releaseTitle: album.title,
          })}
          title={`${album.artist} - ${album.title}`}
        >
          {album.title}
        </a>
        <a
          class="album-artist"
          href={generateSearchUrl({
            artist: album.artist,
          })}
          title={album.artist}
        >
          {album.artist}
        </a>
        <span>{album.plays} plays</span>
      </div>
      <a
        class="album-link"
        href={generateSearchUrl({
          artist: album.artist,
          releaseTitle: album.title,
        })}
      >
        {album.artist} - {album.title}
      </a>
    </div>
  {/each}
  {#if !isLoaded}
    {@render loader()}
  {/if}
</div>

<script lang="ts">
import { generateSearchUrl } from '@/helpers/string';
import { storageGet, storageSet, storageRemove } from '@/helpers/storageUtils';
import * as constants from '@/helpers/constants';
import { getTopAlbums } from '@/api/getTopAlbums';
import type { TopAlbumsPeriod, TopAlbum } from '@/api/getTopAlbums';

const {
  config,
  userName,
} = $props<{
  config: ProfileOptions;
  userName: string;
}>();

let isLoaded = $state(false);
let isLoading = $state(false);
let loadedImages = $state<Record<string, boolean>>({});

let albumsData = $state<TopAlbum[]>([]);
let currentPeriod = $state<TopAlbumsPeriod>(config.topAlbumsPeriod);

const albums = $derived(albumsData.map((album, index) => ({
  id: `${album.name}-${album.artist.name}-${currentPeriod}-${index}`,
  image: album.image[2]['#text'],
  title: album.name,
  artist: album.artist.name,
  plays: album.playcount,
})));

function handleImageLoad(event: Event, albumId: string) {
  loadedImages[albumId] = true;
}

function handleImageError(event: Event, albumId: string) {
  const img = event.target as HTMLImageElement;
  img.src = 'https://lastfm.freetls.fastly.net/i/u/avatar300s/c6f59c1e5e7240a4c0d427abd71f3dbb.jpg';
  loadedImages[albumId] = true;
}

$effect(() => {
  if (currentPeriod) {
    loadedImages = {};
  }
});

let savedPeriodValue = $state(config.topAlbumsPeriod);
let periodValue = $state<TopAlbumsPeriod>(config.topAlbumsPeriod);
const cacheKey = $derived(() => `topAlbumsCache_${periodValue}`);

async function loadCache(periodValue: TopAlbumsPeriod) {
  const topAlbumsCache: TopAlbumsCache | null = await storageGet(cacheKey(), 'local');

  if (topAlbumsCache && checkCacheValidity(topAlbumsCache)) {
    return topAlbumsCache;
  } else {
    await storageRemove(cacheKey(), 'local');
    return null;
  }
}

async function loadTopAlbums(periodValue: TopAlbumsPeriod) {
  isLoading = true;

  let data: TopAlbum[] = [];
  const topAlbumsCache: TopAlbumsCache | null = await loadCache(periodValue);

  if (topAlbumsCache) {
    data = topAlbumsCache.data;
  } else {
    const topAlbumsResponse = await getTopAlbums({
      params: {
        username: userName,
        period: periodValue,
      },
      apiKey: config.lastfmApiKey,
    });
    data = topAlbumsResponse.topalbums.album;

    await storageSet({
      [`topAlbumsCache_${periodValue}`]: {
        data,
        timestamp: Date.now(),
        userName,
      },
    }, 'local');
  }

  if (currentPeriod !== periodValue) {
    currentPeriod = periodValue;
    loadedImages = {};
  }

  albumsData = data.slice();
  isLoading = false;
}

interface TopAlbumsCache {
  data: TopAlbum[];
  timestamp: number;
  userName: string;
  topAlbumsPeriod: TopAlbumsPeriod;
}

function checkCacheValidity(cache: TopAlbumsCache) {
  return (
    cache
    && cache.data
    && cache.timestamp
    && cache.userName === userName
    && Date.now() - cache.timestamp <= constants.TOP_ALBUMS_INTERVAL_MS
  );
}

async function init() {
  await loadTopAlbums(periodValue);
  isLoaded = true;
}

async function handlePeriodChange(event: Event) {
  const newPeriodValue = (event.target as HTMLSelectElement).value as TopAlbumsPeriod;
  await loadTopAlbums(newPeriodValue);
}

async function handlePeriodSave() {
  await storageSet({
    topAlbumsPeriod: periodValue,
  });
  savedPeriodValue = periodValue;
}

init();
</script>