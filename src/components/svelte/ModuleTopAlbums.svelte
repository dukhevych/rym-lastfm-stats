<svelte:options runes={true} />

<div class="bubble_header top-albums-header">
  <div>
    Top Albums
    ({constants.PERIOD_LABELS_MAP[periodValue]})
  </div>
  <div>
    <button
      style:display={periodValue !== config.topAlbumsPeriod ? 'block' : 'none'}
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

<div class="bubble_content top-albums">
  {#each albums as album}
    <div class="album-wrapper">
      <div class="album-image">
        <img
          class="fade-in loaded"
          src={album.image}
          alt={album.title}
          onload={imgOnLoad}
          onerror={imgOnError}
        />
      </div>
      <div class="album-details">
        <a
          class="album-title"
          href="{utils.generateSearchUrl({
            artist: album.artist,
            releaseTitle: album.title,
          })}"
          title="{album.artist} - {album.title}"
        >
          {album.title}
        </a>
        <a
          class="album-artist"
          href="{utils.generateSearchUrl({
            artist: album.artist,
          })}"
          title={album.artist}
        >
          {album.artist}
        </a>
        <span>{album.plays} plays</span>
      </div>
      <a
        class="album-link"
        href="{utils.generateSearchUrl({
          artist: album.artist,
          releaseTitle: album.title,
        })}"
      >
        {album.artist} - {album.title}
      </a>
    </div>
  {/each}
  {#if !isLoaded}
    <div class="loader">
      <svg viewBox="0 0 300 150"><use xlink:href="#svg-loader-symbol"></use></svg>
    </div>
  {/if}
</div>

<script lang="ts">
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import { getTopAlbums } from '@/api/getTopAlbums';
import type { TopAlbumsPeriod, TopAlbum } from '@/api/getTopAlbums';

const {
  config,
  userName,
} = $props();

let isLoaded = $state(false);
let albumsData = $state<TopAlbum[]>([]);
let periodValue = $state<TopAlbumsPeriod>(config.topAlbumsPeriod);
const albums = $derived(albumsData.map(album => ({
  image: album.image[0]['#text'],
  title: album.name,
  artist: album.artist.name,
  plays: album.playcount,
})));

async function loadTopAlbums(periodValue: TopAlbumsPeriod) {
  const topAlbumsResponse = await getTopAlbums({
    params: {
      username: userName,
      period: periodValue,
    },
    apiKey: config.lastfmApiKey,
  });

  const data = topAlbumsResponse.topalbums.album;
  const timestamp = Date.now();
  albumsData = data;

  await utils.storageSet({
    topAlbumsCache: {
      data,
      timestamp,
      userName,
      topAlbumsPeriod: periodValue,
    },
  }, 'local');
}

async function init() {
  await loadTopAlbums(config.topAlbumsPeriod);
  isLoaded = true;
}

async function handlePeriodChange(event: Event) {
  const periodValue = (event.target as HTMLSelectElement).value;
  await loadTopAlbums(periodValue as TopAlbumsPeriod);
}

async function handlePeriodSave() {
  config.topAlbumsPeriod = periodValue;
  await utils.storageSet({
    topAlbumsPeriod: periodValue,
  });
}

function imgOnLoad() {
  isLoaded = true;
}

function imgOnError() {
  isLoaded = true;
}

init();
</script>