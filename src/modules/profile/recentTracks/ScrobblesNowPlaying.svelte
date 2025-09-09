<svelte:options runes={true} />

<script lang="ts">
import { formatDistanceToNow } from 'date-fns';

import DialogBase from '@/components/svelte/DialogBase.svelte';
import TextEffect from '@/components/svelte/TextEffect.svelte';
import * as constants from '@/helpers/constants';
import { updateProfileOptions } from '@/helpers/storageUtils';
import { generateSearchUrl, generateSearchHint } from '@/helpers/string';
import * as utils from '@/helpers/utils';
import type { TrackDataNormalized } from '@/modules/profile/recentTracks/types';

import type { Writable } from 'svelte/store';

const openAddonOptions = () => {
  utils.openOptionsViaBG();
};

interface Props {
  track: TrackDataNormalized | null;
  rating: number;
  formats: Set<ERYMFormat>;
  formatsLabel: string;
  configStore: Writable<AddonOptions>;
  context: Record<string, any>;
  rymSyncTimestamp: number | null;
  isScrobblesHistoryPinned: boolean;
  onToggleScrobblesHistory: () => void;
  onToggleScrobblesHistoryPinned: () => void;
  pollingProgress: number;
}

const {
  track = {} as TrackDataNormalized,
  rating,
  formats,
  formatsLabel,
  configStore,
  context,
  rymSyncTimestamp,
  isScrobblesHistoryPinned,
  onToggleScrobblesHistory,
  onToggleScrobblesHistoryPinned,
  pollingProgress,
}: Props = $props();

let innerConfig = $state({ ...$configStore });
let bgOption = $derived(() => $configStore.profileRecentTracksBackground);
let settingsDialogVisible = $state(false);

$effect(() => {
  if (settingsDialogVisible) {
    innerConfig = { ...$configStore };
  }
});

const settingsBackgroundOptions = $derived(() => {
  return constants.RECENT_TRACK_BACKGROUND_NAMES.map((name, index) => ({
    label: name,
    value: index,
  }));
});

const isRymSyncOutdated = $derived(() => {
  if (!rymSyncTimestamp) return false;
  const date = new Date(rymSyncTimestamp);
  const now = new Date();
  return (
    now.getTime() - date.getTime() > constants.RYM_SYNC_OUTDATED_THRESHOLD_MS
  );
});

const pollingProgressAngle = $derived(() => {
  return Math.trunc(pollingProgress * 360);
});

const containerClasses = $derived(() => {
  const classes = ['profile_listening_container'];
  if (isNowPlaying()) classes.push('is-now-playing');
  if (track) classes.push('is-loaded');
  classes.push(`bg-option-${bgOption()}`);
  return classes.join(' ');
});

const searchLinks = $derived(() => {
  if (!track)
    return {
      searchArtistUrl: '',
      searchArtistHint: '',
      searchAlbumUrl: '',
      searchAlbumHint: '',
      searchTrackUrl: '',
      searchTrackHint: '',
    };

  const { artistName = '', albumName = '', trackName = '' } = track;

  return {
    searchArtistUrl: generateSearchUrl({ artist: artistName }),
    searchArtistHint: generateSearchHint([artistName]),
    searchAlbumUrl: albumName
      ? generateSearchUrl({
          artist: artistName,
          releaseTitle: albumName,
        })
      : '',
    searchAlbumHint: albumName
      ? generateSearchHint([artistName, albumName])
      : '',
    searchTrackUrl: generateSearchUrl({
      artist: artistName,
      releaseTitle: albumName,
      trackTitle: trackName,
    }),
    searchTrackHint: generateSearchHint([artistName, albumName, trackName]),
  };
});

const timestampDate = $derived(() => {
  if (!track?.timestamp) return null;
  return new Date((track.timestamp as number) * 1000);
});

const dateFormatted = $derived(() => {
  if (!timestampDate()) return '';
  return formatDistanceToNow(timestampDate() as Date, { addSuffix: true });
});

const itemDateTitle = $derived(() => {
  if (!timestampDate()) return '';
  return timestampDate()!.toLocaleString();
});

const coverSearchUrl = $derived(
  () => searchLinks().searchAlbumUrl || searchLinks().searchTrackUrl,
);
const coverSearchHint = $derived(
  () => searchLinks().searchAlbumHint || searchLinks().searchTrackHint,
);

const bgOptionsQty = +process.env.BACKGROUND_OPTIONS_QTY!;

const backgroundName = $derived(() => {
  return (
    constants.RECENT_TRACK_BACKGROUND_NAMES[bgOption()] ||
    `${bgOption() + 1} / ${bgOptionsQty}`
  );
});

const onToggleBackground = async () => {
  const newBgOption = bgOption() === bgOptionsQty - 1 ? 0 : bgOption() + 1;
  await Promise.all([
    updateProfileOptions({ profileRecentTracksBackground: newBgOption }),
    configStore.update((config) => ({
      ...config,
      profileRecentTracksBackground: newBgOption,
    })),
  ]);
};

const handleSettingsSubmit = async (e: Event) => {
  e.preventDefault();
  await Promise.all([
    updateProfileOptions({ ...innerConfig }),
    configStore.update((config) => ({ ...config, ...innerConfig })),
  ]);
  settingsDialogVisible = false;
};

const isNowPlaying = $derived(() => {
  if ($configStore.profileRecentTracksAnimation === 'on') return true;
  if ($configStore.profileRecentTracksAnimation === 'off') return false;
  return track?.nowPlaying;
});

let currentCoverSrc = $state('');
let isCoverTransitioning = $state(false);

$effect(() => {
  if (!currentCoverSrc) {
    currentCoverSrc = track?.covers[2] || '';
  } else if (track?.covers[2] !== currentCoverSrc) {
    isCoverTransitioning = true;
    currentCoverSrc = track?.covers[2] || '';

    setTimeout(() => {
      isCoverTransitioning = false;
    }, 300);
  }
});
</script>

{#if track}
  <DialogBase bind:visible={settingsDialogVisible} title="Widget settings">
    <form onsubmit={handleSettingsSubmit} class="flex flex-col gap-6 p-6">
      <label class="flex gap-2">
        <input
          type="checkbox"
          id="recent-tracks-polling"
          name="recent-tracks-polling"
          bind:checked={innerConfig.profileRecentTracksPolling}
        />
        <strong
          >Auto update (every {constants.RECENT_TRACKS_INTERVAL_MS / 1000} seconds)</strong
        >
      </label>

      <div class="flex gap-6 *:grow *:basis-0">
        <label class="flex flex-col gap-2">
          <strong>"Disc rotation" animation</strong>

          <select
            class="rounded-md border border-gray-300 p-2"
            bind:value={innerConfig.profileRecentTracksAnimation}
          >
            {#each constants.NOW_PLAYING_ANIMATION_OPTIONS as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>

        <label class="flex flex-col gap-2">
          <strong>Background style</strong>

          <select
            class="rounded-md border border-gray-300 p-2"
            bind:value={innerConfig.profileRecentTracksBackground}
          >
            {#each settingsBackgroundOptions() as title}
              <option value={title.value}>{title.label}</option>
            {/each}
          </select>
        </label>
      </div>

      <label class="flex gap-2">
        <input
          type="checkbox"
          id="rym-play-history-hide"
          name="rym-play-history-hide"
          bind:checked={innerConfig.profileRecentTracksRymHistoryHide}
        />
        <strong>Hide original RYM's "Play History"</strong>
      </label>

      <div class="flex justify-between items-center pt-4">
        <div>
          <button type="button" class="link-alike text-rym-user hoverable:hover:underline" onclick={openAddonOptions}
            >Go to Addon options</button
          >
        </div>
        <div class="flex gap-4">
          <button
            type="button"
            class="link-alike"
            onclick={() => (settingsDialogVisible = false)}>Cancel</button
          >
          <button type="submit" class="btn blue_btn btn_small">Save</button>
        </div>
      </div>
    </form>
  </DialogBase>
{/if}

<div
  class={containerClasses()}
  style={track?.covers.at(-1) && `--bg-image: url(${track.covers.at(-1)})`}
  data-element="rymstats-track-panel"
>
  {#if track}
    <div id="profile_play_history_container" class="recent-tracks-current">
      <div
        class="play_history_item"
        class:is-now-playing={isNowPlaying()}
        data-element="rymstats-track-item"
      >
        <div
          class="play_history_artbox"
          data-element="rymstats-track-artbox"
          class:is-transitioning={isCoverTransitioning}
        >
          <a
            href={coverSearchUrl()}
            title={coverSearchHint()}
            aria-label={coverSearchHint()}
          >
            <img
              class="play_history_item_art"
              data-element="rymstats-track-item-art"
              src={currentCoverSrc}
              alt={`${track.artistName} - ${track.albumName || track.trackName}`}
            />
          </a>
        </div>
        <div class="play_history_infobox" data-element="rymstats-track-infobox">
          <div
            class="custom-my-rating"
            data-element="rymstats-track-rating"
            class:no-rating={context.isMyProfile && rating === 0}
            class:has-ownership={context.isMyProfile && formats.size > 0}
          >
            {#if context.isMyProfile}
              <div
                data-element="rymstats-track-rating-stars"
                title={rating > 0 ? `${rating / 2} / 5` : ''}
              >
                <div
                  class="stars-filled"
                  data-element="rymstats-track-rating-stars-filled"
                  style={rating > 0 ? `width: ${rating * 10}%` : ''}
                >
                  {#each Array(5)}
                    <svg viewBox="0 0 24 24"
                      ><use xlink:href="#svg-star-symbol"></use></svg
                    >
                  {/each}
                </div>
                <div
                  class="stars-empty"
                  data-element="rymstats-track-rating-stars-empty"
                >
                  {#each Array(5)}
                    <svg viewBox="0 0 24 24"
                      ><use xlink:href="#svg-star-symbol"></use></svg
                    >
                  {/each}
                </div>
              </div>
              <div
                class="rymstats-track-format"
                data-element="rymstats-track-format"
              >
                {formatsLabel}
              </div>
              {#if !rymSyncTimestamp || isRymSyncOutdated()}
                <span
                  class="rymstats-rym-sync-hint-icon"
                  title="Some ratings may not be available until RYM sync is run"
                  >⚠️</span
                >
                <a
                  href="https://rateyourmusic.com/music_export?sync"
                  target="_blank"
                  class="rymstats-rym-sync-hint">Run RYM sync</a
                >
              {/if}
            {:else}
              {context.userName}
            {/if}
          </div>
          <div
            class="play_history_item_date"
            data-element="rymstats-track-item-date"
            title={itemDateTitle()}
          >
            <span>
              {#if track.nowPlaying}
                Scrobbling now
              {:else if dateFormatted()}
                Last scrobble ({dateFormatted()})
              {:else}
                Scrobbled recently
              {/if}
            </span>
            {#if track.nowPlaying}
              <svg viewBox="0 0 40 40"
                ><use xlink:href="#svg-volume-symbol"></use></svg
              >
            {/if}
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
                  href={searchLinks().searchArtistUrl}
                  title={searchLinks().searchArtistHint}
                >
                  <TextEffect text={track.artistName} animationType="rotate" />
                </a>
              </span>
              <span class="play_history_separator"> - </span>
              <a
                class="album play_history_item_release"
                data-element="rymstats-track-link"
                href={searchLinks().searchTrackUrl}
                title={searchLinks().searchTrackHint}
                ><TextEffect text={track.trackName} animationType="rotate" /></a
              >
            </div>
          </div>
          <div class="custom-from-album" data-element="rymstats-from-album">
            {#if track.albumName}
              <a
                href={searchLinks().searchAlbumUrl}
                title={searchLinks().searchAlbumHint}
                data-element="rymstats-track-album-link"
                ><TextEffect text={track.albumName} animationType="rotate" /></a
              >
            {/if}
          </div>
        </div>
      </div>
    </div>
    <div class="profile_view_play_history_btn">
      {#if $configStore.profileRecentTracksLimit > 1}
        <div class="profile_view_play_history_btn_group">
          <button
            class="btn-toggle-icon btn-toggle-history-pinned"
            class:is-active={isScrobblesHistoryPinned}
            aria-label="Lock Last.fm scrobbles"
            title="Lock Last.fm scrobbles"
            onclick={onToggleScrobblesHistoryPinned}
          >
            <svg><use href="#svg-unlock-symbol"></use></svg>
            <svg><use href="#svg-lock-symbol"></use></svg>
          </button>

          <button
            class="btn-lastfm btn blue_btn btn_small"
            data-element="rymstats-lastfm-button"
            aria-label="Toggle scrobbles list"
            title="Toggle scrobbles list"
            style={`--progress: ${pollingProgressAngle()}deg`}
            class:is-fetching={pollingProgress >= 1}
            onclick={onToggleScrobblesHistory}
          >
            <svg
              viewBox="0 0 300 150"
              style:display={pollingProgress >= 1 ? 'block' : 'none'}
            >
              <use xlink:href="#svg-loader-symbol"></use>
            </svg>
            <svg
              viewBox="0 0 24 24"
              style:display={pollingProgress < 1 ? 'block' : 'none'}
            >
              <use xlink:href="#svg-playlist-symbol"></use>
            </svg>
          </button>
        </div>
      {/if}
      <a
        class="btn-profile btn blue_btn btn_small"
        href="https://www.last.fm/user/{context.userName}"
        aria-label="Open Last.fm profile"
        title="Open Last.fm profile"
        target="_blank"
      >
        <svg viewBox="0 0 24 24">
          <use xlink:href="#svg-lastfm-symbol"></use>
        </svg>
        Profile
      </a>
    </div>

    <button
      type="button"
      class="btn-icon btn-settings"
      aria-label="Now Playing settings"
      title="Now Playing settings"
      onclick={() => (settingsDialogVisible = true)}
    >
      <svg viewBox="0 0 24 24">
        <use xlink:href="#svg-settings-symbol"></use>
      </svg>
    </button>

    <button
      class="btn-bg-switcher"
      aria-label="Change background"
      onclick={onToggleBackground}
      data-option={backgroundName()}
      title={`Background option ${bgOption() + 1} / ${bgOptionsQty}`}
    >
      <svg viewBox="0 0 24 24">
        <use xlink:href="#svg-brush-symbol"></use>
      </svg>
    </button>
  {/if}

  {#if !track}
    <div class="loader">
      <svg viewBox="0 0 300 150"
        ><use xlink:href="#svg-loader-symbol"></use></svg
      >
    </div>
  {/if}
</div>
