<div
  class="profile_listening_container"
  class:is-now-playing={track.nowPlaying}
  style={`--bg-image: url(${track.coverExtraLargeUrl})`}
  data-element="rymstats-track-panel"
>
  <div id="profile_play_history_container" class="recent-tracks-current">
    <div
      class="play_history_item"
      class:is-now-playing={track.nowPlaying}
      class:is-loaded={albumsFromDB.length > 0}
      data-element="rymstats-track-item"
    >
      <div class="play_history_artbox" data-element="rymstats-track-artbox">
        <a
          href="{searchLinks.searchAlbumUrl || searchLinks.searchTrackUrl}"
          title="{searchLinks.searchAlbumHint || searchLinks.searchTrackHint}"
          aria-label="{searchLinks.searchAlbumHint || searchLinks.searchTrackHint}"
        >
          <img
            class="play_history_item_art"
            data-element="rymstats-track-item-art"
            src="{searchLinks.coverLargeUrl}"
            alt=""
          />
        </a>
      </div>
      <div class="play_history_infobox" data-element="rymstats-track-infobox">
        <div
          class="custom-my-rating"
          data-element="rymstats-track-rating"
          class:no-rating={config.isMyProfile && rating() === 0}
          class:has-ownership={config.isMyProfile && formats().size > 0}
        >
          {#if config.isMyProfile}
            <div
              data-element="rymstats-track-rating-stars"
              title={rating() > 0 ? `${rating() / 2} / 5` : ''}
            >
              <div
                class="stars-filled"
                data-element="rymstats-track-rating-stars-filled"
                style={rating() > 0 ? `width: ${rating() * 10}%` : ''}
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
            >
              {formatsLabel()}
            </div>
          {:else}
            {userName}
          {/if}
        </div>
        <div
          class="play_history_item_date"
          data-element="rymstats-track-item-date"
          data-label={itemDateLabel()}
          title={itemDateTitle()}
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
                href="{searchLinks.searchArtistUrl}"
                title="{searchLinks.searchArtistHint}"
              >
                {searchLinks.artistName}
              </a>
            </span>
            <span class="play_history_separator"> - </span>
            <a
              class="album play_history_item_release"
              data-element="rymstats-track-link"
              href="{searchLinks.searchTrackUrl}"
              title="{searchLinks.searchTrackHint}"
            >{track.trackName}</a>
          </div>
        </div>
        <div class="custom-from-album" data-element="rymstats-from-album">
          {#if track.albumName}
          <a
            href="{searchLinks.searchAlbumUrl}"
            title="{searchLinks.searchAlbumHint}"
          >{track.albumName}</a>
          {/if}
        </div>
      </div>
    </div>
    <div class="loader">
      <svg viewBox="0 0 300 150"><use xlink:href="#svg-loader-symbol"></use></svg>
    </div>
  </div>
  <div class="profile_view_play_history_btn">
    {#if config.recentTracksHistory}
      <button
        class="btn-lastfm-lock"
        class:is-locked={isScrobblesHistoryLocked}
        aria-label="Lock Last.fm scrobbles"
        onclick={onToggleScrobblesHistoryLock}
      >
        <svg><use href="#svg-unlock-symbol"></use></svg>
        <svg><use href="#svg-lock-symbol"></use></svg>
      </button>
      <button
        class="btn-lastfm btn blue_btn btn_small"
        data-element="rymstats-lastfm-button"
        aria-label="Toggle scrobbles list"
        onclick={onToggleScrobblesHistory}
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
      target="_blank"
    >
      <svg viewBox="0 0 24 24">
        <use xlink:href="#svg-lastfm-symbol"></use>
      </svg>
      Profile
    </a>
  </div>
  <button class="btn-bg-switcher">Text</button>
</div>

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';
import { RecordsAPI } from '@/helpers/records-api';
import { ERYMOwnershipStatus } from '@/helpers/enums';
import * as utils from '@/helpers/utils';
import * as constants from '@/helpers/constants';
import type {
  TrackDataNormalized,
} from '@/modules/profile/recentTracks/types';

const {
  track,
  config,
  userName,
  isScrobblesHistoryLocked,
  onToggleScrobblesHistory,
  onToggleScrobblesHistoryLock,
} = $props<{
  track: TrackDataNormalized;
  config: ProfileOptions;
  userName: string;
  isScrobblesHistoryLocked: boolean;
  onToggleScrobblesHistory: () => void;
  onToggleScrobblesHistoryLock: () => void;
}>();

let albumsFromDB: IRYMRecordDBMatch[] = $state([]);

// COMPUTED
let rating = $derived(() => {
  if (!config.isMyProfile) {
    console.warn('Rating is not available for non-my profile');
    return 0;
  }

  let value = 0;

  if (albumsFromDB.length === 0) {
    console.warn('No albums found for non-my profile');
    return value;
  }

  const albumsFromDBFullMatch: IRYMRecordDBMatch[] = [];
  const albumsFromDBPartialMatch: IRYMRecordDBMatch[] = [];

  albumsFromDB.forEach((album) => {
    if (album._match === 'full') {
      albumsFromDBFullMatch.push(album);
    } else if (album._match === 'partial') {
      albumsFromDBPartialMatch.push(album);
    } else {
      albumsFromDBPartialMatch.push(album);
    }
  });

  const earliestFullMatchRating = utils.getEarliestRating(albumsFromDBFullMatch);
  const earliestPartialMatchRating = utils.getEarliestRating(albumsFromDBPartialMatch);

  value = earliestFullMatchRating || earliestPartialMatchRating;

  return value;
});

const formats = $derived(() => {
  if (!config.isMyProfile) {
    console.warn('Formats are not available for non-my profile');
    return new Set<ERYMFormat>();
  }

  const set = new Set<ERYMFormat>();

  albumsFromDB.forEach((album) => {
    if (album.ownership === ERYMOwnershipStatus.InCollection && album.format) {
      set.add(album.format);
    }
  });

  return set;
});

const formatsLabel = $derived(() => Array.from(formats()).map(key => constants.RYMFormatsLabels[key] || key).join(', '));

const albumNameFallback = $derived(() => track.albumName ? utils.cleanupReleaseEdition(track.albumName) : '');

const searchLinks = $derived<TrackDataNormalized & {
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
  searchAlbumUrl: track.albumName ? utils.generateSearchUrl({
    artist: track.artistName,
    releaseTitle: track.albumName,
  }) : '',
  searchAlbumHint: track.albumName ? utils.generateSearchHint([track.artistName, track.albumName]) : '',
  searchTrackUrl: utils.generateSearchUrl({
    artist: track.artistName,
    releaseTitle: track.albumName,
    trackTitle: track.trackName,
  }),
  searchTrackHint: utils.generateSearchHint([track.artistName, track.albumName, track.trackName]),
});

const itemDateLabel = $derived(() => {
  const date = new Date((track.timestamp as number) * 1000);
  const dateFormatted = formatDistanceToNow(date, { addSuffix: true });
  return track.nowPlaying ? 'Scrobbling now' : `Last scrobble (${dateFormatted})`;
});

const itemDateTitle = $derived(() => {
  if (track.nowPlaying) return '';

  const date = new Date((track.timestamp as number) * 1000);
  return date.toLocaleString();
});
// COMPUTED END

// METHODS
const getReleaseRYMData = async () => {
  albumsFromDB = await RecordsAPI.getByArtistAndTitle(
    track.artistName,
    track.albumName,
    albumNameFallback(),
  );
};
// METHODS END

getReleaseRYMData();
</script>

<style></style>

<svelte:options runes={true} />