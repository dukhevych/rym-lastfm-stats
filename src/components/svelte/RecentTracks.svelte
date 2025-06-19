<svelte:options runes={true} />

<script lang="ts">
import errorMessages from '@/modules/profile/recentTracks/errorMessages.json';
import type {
  TrackDataNormalized,
  PlayHistoryData,
} from '@/modules/profile/recentTracks/types';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import * as api from '@/api';

const { config, rymSyncTimestamp = null, userName } = $props<{
  config: ProfileOptions;
  rymSyncTimestamp?: number | null;
  userName: string;
}>();

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastTick: number = 0;
let lastTimestamp: number;
let progressLoopActive: boolean = false;
let abortController: AbortController = new AbortController();
let failedToFetch: boolean = false;
let colors: VibrantUiColors;
let isLoaded: boolean = false;

let recentTracks = $state<TrackDataNormalized[]>([]);
let latestTrack = $derived(recentTracks[0]);
let recentTracksTimestamp = $state<number>(0);

const searchReleaseUrl = $derived(() => utils.generateSearchUrl({
  artist: latestTrack.artistName,
  releaseTitle: latestTrack.albumName,
}));
const searchReleaseHint = $derived(() => getSearchLinkHint([
  latestTrack.artistName,
  latestTrack.albumName,
]));

const searchArtistUrl = $derived(() => utils.generateSearchUrl({ artist: latestTrack.artistName }));
const searchArtistHint = $derived(() => getSearchLinkHint([latestTrack.artistName]));

const searchTrackUrl = $derived(() => utils.generateSearchUrl({
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

const init = async () => {
  const { recentTracksCache } = await utils.storageGet(['recentTracksCache', 'local']);

  if (
    recentTracksCache
    && recentTracksCache.data
    && recentTracksCache.timestamp
    && recentTracksCache.userName === userName
  ) {
    if (
      Date.now() - recentTracksCache.timestamp >
      constants.RECENT_TRACKS_INTERVAL_MS
    ) {
      // Cache is outdated, fetch new data
      await fetchAndRenderRecentTracks();
    } else {
      // await populateRecentTracks(recentTracksCache.data, recentTracksCache.timestamp);
      // latestTrack = {
      //   ...latestTrack,
      //   ...recentTracksCache.data[0],
      //   timestamp: recentTracksCache.timestamp,
      // };
      // uiElements.list.tracksWrapper.dataset.timestamp = `Updated at ${new Date(recentTracksCache.timestamp).toLocaleString()}`;
      // lastTimestamp = recentTracksCache.timestamp;
    }
  } else {
    // No cache available for this user, fetch new data
    if (document.visibilityState === 'visible') {
      await fetchAndRenderRecentTracks();
    }
  }

  isLoaded = true;
}

async function fetchAndRenderRecentTracks() {
  abortController?.abort();
  abortController = new AbortController();

  try {
    const recentTracksResponse = await api.getRecentTracks({
      apiKey: config.lastfmApiKey,
      params: {
        username: userName,
        limit: config.recentTracksLimit,
      },
      signal: abortController.signal,
    });

    const { recenttracks: { track: data } } = recentTracksResponse;

    const timestamp = Date.now();

    const normalizedData = data.map((item): TrackDataNormalized => ({
      nowPlaying: item["@attr"]?.nowplaying === 'true',
      coverUrl: item.image[0]['#text'],
      coverLargeUrl: item.image[3]['#text'],
      coverExtraLargeUrl: item.image[item.image.length - 1]['#text'],
      trackName: item.name,
      timestamp: item.date?.uts ? Number(item.date.uts) : null,
      albumName: item.album['#text'],
      artistName: item.artist['#text'],
    }));

    recentTracks = normalizedData;
    recentTracksTimestamp = timestamp;

    try {
      colors = await utils.getImageColors(latestTrack.coverExtraLargeUrl);
    } catch {
      console.warn(errorMessages.failedToFetchColors);
    }

    if (latestTrack.nowPlaying) {

    }

    await utils.storageSet({
      recentTracksCache: {
        data: normalizedData,
        timestamp,
        userName: userName,
      }
    }, 'local');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name !== 'AbortError') {
      failedToFetch = true;
    }
  }
};

init();
</script>

<div class="recent-tracks-container" class:is-now-playing={latestTrack.nowPlaying}>
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
          >{latestTrack.trackName}</a>
        </div>
      </div>
    </div>
  </div>
  <div class="profile_view_play_history_btn">
    {#if listEnabled}
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
    {/if}
    {#if userName}
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
    {/if}
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
