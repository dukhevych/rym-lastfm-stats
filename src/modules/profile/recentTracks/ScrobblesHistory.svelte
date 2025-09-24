<svelte:options runes={true} />

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';

import { generateSearchUrl, generateSearchHint } from '@/helpers/string';
import type { TrackDataNormalized } from '@/modules/profile/recentTracks/types';

const { scrobbles = [], timestamp, open = true } = $props<{
  scrobbles: TrackDataNormalized[];
  timestamp: number;
  open: boolean;
}>();

const timestampFormatted = $derived(new Date(timestamp).toLocaleString());
const scrobblesEnriched = $derived(scrobbles.map((scrobble: TrackDataNormalized) => ({
  ...scrobble,
  timestampFormatted: scrobble.timestamp
    ? new Date((scrobble.timestamp) * 1000).toLocaleString()
    : null,
  timestampRelative: scrobble.timestamp
    ? formatDistanceToNow(new Date((scrobble.timestamp) * 1000), { addSuffix: true })
    : null,
  searchArtistUrl: generateSearchUrl({
    artist: scrobble.artistName,
  }),
  searchArtistHint: generateSearchHint([
    scrobble.artistName,
  ]),
  searchAlbumUrl: generateSearchUrl({
    artist: scrobble.artistName,
    releaseTitle: scrobble.albumName,
  }),
  searchAlbumHint: generateSearchHint([
    scrobble.artistName,
    scrobble.albumName,
  ]),
  searchTrackUrl: generateSearchUrl({
    artist: scrobble.artistName,
    releaseTitle: scrobble.albumName,
    trackTitle: scrobble.trackName,
  }),
  searchTrackHint: generateSearchHint([
    scrobble.artistName,
    scrobble.albumName,
    scrobble.trackName,
  ]),
})));
</script>

<div
  class="profile_listening_container lastfm-tracks-wrapper"
  class:is-active={open}
  data-timestamp="Updated at {timestampFormatted}"
>
  <ul>
    {#each scrobblesEnriched as scrobble (scrobble.timestamp)}
    <li data-id="{scrobble.id}">
      <div class="track-image">
        <a
          href="{scrobble.searchAlbumUrl}"
          title="{scrobble.searchAlbumHint}"
        >
          <img
            src="{scrobble.covers[2]}"
            alt="{scrobble.artistName} - {scrobble.albumName}"
          />
        </a>
      </div>
      <div class="w-[60%] relative">
        <a
          href="{scrobble.searchTrackUrl}"
          title="{scrobble.searchTrackHint}"
          class="absolute inset-0 z-1 hover:bg-white/5 transition-colors duration-200"
        >
          <span class="sr-only">{scrobble.searchTrackHint}</span>
        </a>
        <div class="flex items-center gap-4 relative">
          <strong>{scrobble.trackName}</strong>
          <button
            type="button"
            class="
              cursor-pointer
              p-1
              inline-flex
              appearance-none
              z-2
              border-none
              bg-transparent
              m-0
              p-0
              opacity-50
              hover:opacity-100
              transition-opacity
              duration-200
              hover:*:fill-lastfm
            "
            onclick={() => {
              alert(1);
            }}
          >
            <span class="sr-only">
              {scrobble.loved ? 'Remove from loved tracks' : 'Add to loved tracks'}
            </span>
            <svg class={[
              'w-6 h-6 text-lastfm',
              scrobble.loved ? 'fill-lastfm' : 'fill-transparent',
            ]}>
              <use href="#svg-love-symbol" />
            </svg>
          </button>
        </div>
      </div>
      <div class="w-[40%]">
        <a
          href="{scrobble.searchArtistUrl}"
          title="{scrobble.searchArtistHint}"
        >
          <strong>{scrobble.artistName}</strong>
        </a>
      </div>
      <span class="track-date" title="{scrobble.timestampFormatted}">{scrobble.timestampRelative}</span>
    </li>
    {/each}
  </ul>
</div>
