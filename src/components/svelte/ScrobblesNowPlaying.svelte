<svelte:options runes={true} />

<script lang="ts">
import * as utils from '@/helpers/utils';
import type {
  TrackDataNormalized,
} from '@/modules/profile/recentTracks/types';

let { track, config, userName, isScrobblesHistoryOpen = $bindable(true) } = $props<{
  track: TrackDataNormalized;
  config: ProfileOptions;
  userName: string;
  isScrobblesHistoryOpen: boolean;
}>();

const data = $derived<TrackDataNormalized & {
  searchArtistUrl: string;
  searchArtistHint: string;
  searchAlbumUrl: string;
  searchAlbumHint: string;
  searchTrackUrl: string;
  searchTrackHint: string;
}>({
  ...track,
  searchArtistUrl: utils.generateSearchUrl({ artist: track.artistName }),
  searchArtistHint: utils.generateSearchHint([track.artistName]),
  searchAlbumUrl: utils.generateSearchUrl({
    artist: track.artistName,
    releaseTitle: track.albumName,
  }),
  searchAlbumHint: utils.generateSearchHint([track.artistName, track.albumName]),
  searchTrackUrl: utils.generateSearchUrl({
    artist: track.artistName,
    releaseTitle: track.albumName,
    trackTitle: track.trackName,
  }),
  searchTrackHint: utils.generateSearchHint([track.artistName, track.albumName, track.trackName]),
});

// const emit = $dispatch(); // init dispatcher
</script>

<div
  class="profile_listening_container"
  class:is-now-playing={data.nowPlaying}
  style={`--bg-image: url(${data.coverExtraLargeUrl})`}
  data-element="rymstats-track-panel"
>
  <div id="profile_play_history_container" class="recent-tracks-current">
    <div
      class="play_history_item is-loaded"
      class:is-now-playing={data.nowPlaying}
      data-element="rymstats-track-item"
    >
      <div class="play_history_artbox" data-element="rymstats-track-artbox">
        <a
          href="{data.searchAlbumUrl}"
          title="{data.searchAlbumHint}"
          aria-label="{data.searchAlbumHint}"
        >
          <img
            class="play_history_item_art"
            data-element="rymstats-track-item-art"
            src="{data.coverLargeUrl}"
            alt=""
          />
        </a>
      </div>
      <div class="play_history_infobox" data-element="rymstats-track-infobox">
        <div
          class="custom-my-rating"
          data-element="rymstats-track-rating"
          title=""
        >
          <div data-element="rymstats-track-rating-stars" title="4 / 5">
            <div
              class="stars-filled"
              data-element="rymstats-track-rating-stars-filled"
              style="width: 80%;"
            >
              {#each Array(5) as _, i (i)}
                <svg viewBox="0 0 24 24"><use xlink:href="#svg-star-symbol"></use></svg>
              {/each}
            </div>
            <div
              class="stars-empty"
              data-element="rymstats-track-rating-stars-empty"
            >
              {#each Array(5) as _, i (i)}
                <svg viewBox="0 0 24 24"><use xlink:href="#svg-star-symbol"></use></svg>
              {/each}
            </div>
          </div>
          <div
            class="rymstats-track-format"
            data-element="rymstats-track-format"
          ></div>
        </div>
        <div
          class="play_history_item_date"
          data-element="rymstats-track-item-date"
          data-label="Scrobbling now"
          title=""
        >
          <span></span>
          <svg viewBox="0 0 40 40"><use xlink:href="#svg-volume-symbol"></use></svg>
        </div>
        <div
          class="play_history_infobox_lower"
          data-element="rymstats-track-infobox-lower"
        >
          <div
            class="play_history_item_release"
            data-element="rymstats-track-release"
          >
            <span
              class="play_history_item_artist"
              data-element="rymstats-track-artist"
              ><a
                data-element="rymstats-track-artist-link"
                href="{data.searchArtistUrl}"
                title="{data.searchArtistHint}"
              >
                {data.artistName}
              </a>
            </span>
            <span class="play_history_separator"> - </span>
            <a
              class="album play_history_item_release"
              data-element="rymstats-track-link"
              href="{data.searchTrackUrl}"
              title="{data.searchTrackHint}"
            >{data.trackName}</a>
          </div>
        </div>
        <div class="custom-from-album" data-element="rymstats-from-album">
          <a
            href="{data.searchAlbumUrl}"
            title="{data.searchAlbumHint}"
          >{data.albumName}</a>
        </div>
      </div>
    </div>
  </div>
  <div class="profile_view_play_history_btn">
    {isScrobblesHistoryOpen ? 'true' : 'false'}
    {#if config.recentTracksHistory}
      <button
        class="btn-lastfm-lock"
        class:is-locked={isScrobblesHistoryOpen}
        aria-label="Lock Last.fm scrobbles"
        onclick={() => isScrobblesHistoryOpen = true}
      >
        <svg><use href="#svg-unlock-symbol"></use></svg>
        <svg><use href="#svg-lock-symbol"></use></svg>
      </button>
      <button
        class="btn-lastfm btn blue_btn btn_small"
        aria-label="Toggle scrobbles list"
        onclick={() => isScrobblesHistoryOpen = !isScrobblesHistoryOpen}
      >
        <svg viewBox="0 0 24 24">
          <use xlink:href="#svg-playlist-symbol"></use>
        </svg>
      </button>
    {/if}
    <a
      class="btn-profile btn blue_btn btn_small"
      href="https://www.last.fm/user/{userName}"
      aria-label="Open Last.fm profile"
    >
      <svg viewBox="0 0 24 24">
        <use xlink:href="#svg-lastfm-symbol"></use>
      </svg>
      Profile
    </a>
  </div>
  <button class="btn-bg-switcher">Text</button>
</div>

<style>
@import '../../../modules/profile/recentTracks/recentTracks.css';
</style>
