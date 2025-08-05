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
            src="{scrobble.coverLargeUrl}"
            alt="{scrobble.artistName} - {scrobble.albumName}"
          />
        </a>
      </div>
      <a
        class="track-title"
        href="{scrobble.searchTrackUrl}"
        title="{scrobble.searchTrackHint}"
      >{scrobble.trackName}</a>
      <div class="track-artist">
        <a
          href="{scrobble.searchArtistUrl}"
          title="{scrobble.searchArtistHint}"
        >{scrobble.artistName}</a>
      </div>
      <span class="track-date" title="{scrobble.timestampFormatted}">{scrobble.timestampRelative}</span>
    </li>
    {/each}
  </ul>
</div>
