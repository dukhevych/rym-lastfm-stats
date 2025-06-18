<script lang="ts">
  import {
    generateSearchUrl,
  } from '@/helpers/utils';

  let count = $state(0);
  count = 5;

  const { config, rymSyncTimestamp = null, userName } = $props<{
    config: ProfileOptions;
    rymSyncTimestamp?: number | null;
    userName: string;
  }>();

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastTick: number = 0;
  let abortController: AbortController = new AbortController();
  let progressLoopActive: boolean = false;
  let failedToFetch: boolean = false;

  const latestTrack = $state({
    albumName: '',
    artistName: '',
    coverExtraLargeUrl: '',
    coverLargeUrl: '',
    coverUrl: '',
    nowPlaying: false,
    timestamp: 0,
    trackName: '',
  });

  const searchReleaseUrl = $derived(() => generateSearchUrl({
    artist: latestTrack.artistName,
    releaseTitle: latestTrack.albumName,
  }));
  const searchReleaseHint = $derived(() => getSearchLinkHint([
    latestTrack.artistName,
    latestTrack.albumName,
  ]));

  const searchArtistUrl = $derived(() => generateSearchUrl({ artist: latestTrack.artistName }));
  const searchArtistHint = $derived(() => getSearchLinkHint([latestTrack.artistName]));

  const searchTrackUrl = $derived(() => generateSearchUrl({
    artist: latestTrack.artistName,
    releaseTitle: latestTrack.albumName,
    trackTitle: latestTrack.trackName,
  }));
  const searchTrackHint = $derived(() => getSearchLinkHint([
    latestTrack.artistName,
    latestTrack.albumName,
    latestTrack.trackName,
  ]));

  const getSearchLinkHint = (strings: string[]) => `Search for "${strings.join(' - ')}" on RateYourMusic`;
</script>

<div class="recent-tracks-container">
  <!--
  <svg viewBox="0 0 40 40">
    <use href="#svg-volume-symbol"></use>
  </svg>
  <svg>
    <use href="#svg-star-symbol"></use>
  </svg>
   -->

  {count} count
  <div id="profile_play_history_container" class="recent-tracks-current">
    <div
      class="play_history_item is-now-playing is-loaded"
      data-element="rymstats-track-item"
    >
      <div class="play_history_artbox" data-element="rymstats-track-artbox">
        <a
          href="{searchReleaseUrl()}"
          title="{searchReleaseHint()}"
          aria-label="{searchReleaseHint()}"
        >
          <img
            class="play_history_item_art"
            data-element="rymstats-track-item-art"
            src="{latestTrack.coverLargeUrl}"
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
                href="{searchArtistUrl()}"
                title="{searchArtistHint()}"
              >
                {latestTrack.artistName}
              </a>
            </span>
            <span class="play_history_separator"> - </span>
            <a
              class="album play_history_item_release"
              data-element="rymstats-track-link"
              href="{searchReleaseUrl()}"
              title="{searchReleaseHint()}"
            >{latestTrack.albumName}</a>
          </div>
        </div>
        <div class="custom-from-album" data-element="rymstats-from-album">
          <a
            href="{searchTrackUrl()}"
            title="{searchTrackHint()}"
            >{latestTrack.trackName}</a
          >
        </div>
      </div>
    </div>
  </div>
  <div class="profile_view_play_history_btn">
    <button class="btn-lastfm-lock" aria-label="Lock Last.fm scrobbles">
      <svg><use href="#svg-unlock-symbol"></use></svg>
      <svg><use href="#svg-lock-symbol"></use></svg>
    </button>
    <button
      class="btn-lastfm btn blue_btn btn_small"
      aria-label="Toggle scrobbles list"
    >
      <svg viewBox="0 0 24 24">
        <use xlink:href="#svg-playlist-symbol"></use>
      </svg>
    </button>
    <a
      class="btn-profile btn blue_btn btn_small"
      href="https://www.last.fm/user/{{ userName }}"
      aria-label="Open Last.fm profile"
    >
      <svg viewBox="0 0 24 24">
        <use xlink:href="#svg-lastfm-symbol"></use>
      </svg>
    </a>
  </div>
  <button class="btn-bg-switcher">Text</button>
</div>

<style>
  .recent-tracks-container {
    display: flex;
    flex-flow: row nowrap;
    justify-content: flex-start;
    align-items: center;
    flex-basis: 100%;
    border: solid 1px rgba(0, 0, 0, 0.1);
    background-color: var(--mono-f);
    border-radius: 6px;
    padding: 0.5em;
    padding-right: 1rem;
    transition: all 0.3s ease-out;
    transition-property: background-color, color, border-radius;
    position: relative;
    margin: 0.4em;
    overflow: hidden;
  }
</style>
