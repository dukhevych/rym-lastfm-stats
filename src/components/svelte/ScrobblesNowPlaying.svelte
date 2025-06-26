<div
  class={containerClasses()}
  style={`--bg-image: url(${_track().coverExtraLargeUrl})`}
  data-element="rymstats-track-panel"
>
  <div id="profile_play_history_container" class="recent-tracks-current">
    <div
      class="play_history_item"
      class:is-now-playing={_track().nowPlaying}
      data-element="rymstats-track-item"
    >
      <div class="play_history_artbox" data-element="rymstats-track-artbox">
        <a
          href="{coverSearchUrl()}"
          title="{coverSearchHint()}"
          aria-label="{coverSearchHint()}"
        >
          <img
            class="play_history_item_art"
            data-element="rymstats-track-item-art"
            src="{_track().coverLargeUrl}"
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
                href="{searchLinks().searchArtistUrl}"
                title="{searchLinks().searchArtistHint}"
              >
                {_track().artistName}
              </a>
            </span>
            <span class="play_history_separator"> - </span>
            <a
              class="album play_history_item_release"
              data-element="rymstats-track-link"
              href="{searchLinks().searchTrackUrl}"
              title="{searchLinks().searchTrackHint}"
            >{_track().trackName}</a>
          </div>
        </div>
        <div class="custom-from-album" data-element="rymstats-from-album">
          {#if _track().albumName}
          <a
            href="{searchLinks().searchAlbumUrl}"
            title="{searchLinks().searchAlbumHint}"
          >{_track().albumName}</a>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="profile_view_play_history_btn">
    {#if config.recentTracksHistory}
      <button
        class="btn-lastfm-lock"
        class:is-locked={isScrobblesHistoryPinned}
        aria-label="Lock Last.fm scrobbles"
        onclick={onToggleScrobblesHistoryPinned}
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

  <button
    class="btn-bg-switcher"
    aria-label="Change background"
    onclick={onToggleBackground}
    data-option={backgroundName()}
    title={`Background option ${bgOption + 1} / ${bgOptionsQty}`}
  >
    <svg viewBox="0 0 24 24">
      <use xlink:href="#svg-brush-symbol"></use>
    </svg>
  </button>

  {#if !isLoaded}
    <div class="loader">
      <svg viewBox="0 0 300 150"><use xlink:href="#svg-loader-symbol"></use></svg>
    </div>
  {/if}
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
  isScrobblesHistoryPinned,
  onToggleScrobblesHistory,
  onToggleScrobblesHistoryPinned,
} = $props<{
  track: TrackDataNormalized;
  config: ProfileOptions;
  userName: string;
  isScrobblesHistoryPinned: boolean;
  onToggleScrobblesHistory: () => void;
  onToggleScrobblesHistoryPinned: () => void;
}>();

let albumsFromDB: IRYMRecordDBMatch[] = $state([]);
let isLoaded = $state(false);
let bgOption = $state(config.recentTracksBackground);

// COMPUTED
const _track = $derived(() => track ? track : {});

const containerClasses = $derived(() => {
  const classes = ['profile_listening_container'];

  if (_track().nowPlaying) {
    classes.push('is-now-playing');
  }

  if (isLoaded) {
    classes.push('is-loaded');
  }

  classes.push(`bg-option-${bgOption}`);

  return classes.join(' ');
});

let rating = $derived(() => {
  let value = 0;

  if (!config.isMyProfile) {
    console.warn('Rating is not available for non-my profile');
    return value;
  }

  if (!isLoaded) {
    return value;
  }

  if (albumsFromDB.length === 0) {
    console.warn('No albums found in user\'s RYM database');
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

const albumNameFallback = $derived(() => track?.albumName ? utils.cleanupReleaseEdition(_track().albumName) : '');

const searchLinks = $derived(() => {
  const {
    artistName = '',
    albumName = '',
    trackName = '',
  } = _track();

  return {
    searchArtistUrl: utils.generateSearchUrl({ artist: artistName }),
    searchArtistHint: utils.generateSearchHint([artistName]),
    searchAlbumUrl: albumName ? utils.generateSearchUrl({
      artist: artistName,
      releaseTitle: albumName,
    }) : '',
    searchAlbumHint: albumName ? utils.generateSearchHint([artistName, albumName]) : '',
    searchTrackUrl: utils.generateSearchUrl({
      artist: artistName,
      releaseTitle: albumName,
      trackTitle: trackName,
    }),
    searchTrackHint: utils.generateSearchHint([artistName, albumName, trackName]),
  };
});

const itemDateLabel = $derived(() => {
  if (!isLoaded) return '';

  const date = new Date((_track().timestamp as number) * 1000);
  const dateFormatted = formatDistanceToNow(date, { addSuffix: true });
  return _track().nowPlaying ? 'Scrobbling now' : `Last scrobble (${dateFormatted})`;
});

const itemDateTitle = $derived(() => {
  if (!isLoaded) return '';

  if (_track().nowPlaying) return '';

  const date = new Date((_track().timestamp as number) * 1000);
  return date.toLocaleString();
});

const coverSearchUrl = $derived(() => searchLinks().searchAlbumUrl || searchLinks().searchTrackUrl);
const coverSearchHint = $derived(() => searchLinks().searchAlbumHint || searchLinks().searchTrackHint);

const bgOptionsQty = 22;

const backgroundName = $derived(() => {
  return constants.RECENT_TRACK_BACKGROUND_NAMES[config.recentTracksBackground] ||
    `${config.recentTracksBackground + 1} / ${bgOptionsQty}`;
});

// COMPUTED END

// METHODS
const onToggleBackground = async () => {
  console.log('pre', bgOption);
  bgOption = bgOption === bgOptionsQty - 1 ? 0 : bgOption + 1;
  await utils.storageSet({
    recentTracksBackground: bgOption,
  });
  console.log('post', bgOption);
};

const getReleaseRYMData = async () => {
  albumsFromDB = await RecordsAPI.getByArtistAndTitle(
    _track().artistName,
    _track().albumName,
    albumNameFallback(),
  );

  isLoaded = true;
};
// METHODS END

// EFFECTS
$effect(() => {
  if (track) getReleaseRYMData();
});
// EFFECTS END
</script>

<style></style>

<svelte:options runes={true} />