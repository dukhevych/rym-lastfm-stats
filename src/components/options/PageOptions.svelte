<svelte:options runes={true} />

<script lang="ts">
/* ────────────────────────────────────────────────────────────────────────────
 * Imports
 * ──────────────────────────────────────────────────────────────────────────── */
import { formatDistanceToNow } from 'date-fns';
import { tick, onMount, onDestroy } from 'svelte';
import browser from 'webextension-polyfill';

import { getTopArtists } from '@/api/getTopArtists';
import iconKeySvg from '@/assets/icons/iconKey.svg';
import iconSettingsSvg from '@/assets/icons/iconSettings.svg';
import iconSuccessSvg from '@/assets/icons/iconSuccess.svg';
import iconSwitchSvg from '@/assets/icons/iconSwitch.svg';
import DialogBase from '@/components/svelte/DialogBase.svelte';
import * as api from '@/helpers/api';
import * as constants from '@/helpers/constants';
import {
  storageSet,
  storageRemove,
  setModuleCustomizationConfig,
  setModuleToggleConfig,
  setLastFmApiKey,
} from '@/helpers/storageUtils';
import { withSvgClass } from '@/helpers/svg';
import * as utils from '@/helpers/utils';


import AppHeader from './AppHeader.svelte';
import AppStatusCard from './AppStatusCard.svelte';
import FormGroup from './FormGroup.svelte';
import FormInput from './FormInput.svelte';
import FormItem from './FormItem.svelte';
import FormSelect from './FormSelect.svelte';
import FormSlider from './FormSlider.svelte';
import FormToggle from './FormToggle.svelte';
import TabContent from './TabContent.svelte';

import type { Snippet } from 'svelte';

/* ────────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────────── */
interface OptionsProps {
  formModules: ModuleToggleConfig;
  formCustomization: ModuleCustomizationConfig;
  lastfmApiKeySaved: string;
  lastfmApiKey: string;
  userData: UserData;
  dbRecordsQty: number | null;
  rymSyncTimestamp: number | null;
}

type TabId = 'modules' | 'customization' | 'api-auth';

interface Tab {
  id: TabId;
  label: string;
  icon: Snippet;
  modified?: boolean;
}

interface TabLinkProps {
  href: string;
  label: string;
  icon: (size?: number) => any;
  modified?: boolean;
  onClick: (e: MouseEvent) => void;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Props & Constants
 * ──────────────────────────────────────────────────────────────────────────── */
const props: OptionsProps = $props();
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY!;

/* ────────────────────────────────────────────────────────────────────────────
 * Local State
 * ──────────────────────────────────────────────────────────────────────────── */
let isLoading = $state(true);
let signinInProgress = $state(false);
let submitInProgress = $state(false);
let imagePreviewVisible = $state(false);
let imagePreviewSrc = $state('');

type ApiKeyInputComponent = {
  focus: () => void;
};
let lastfmApiKeyInput = {} as ApiKeyInputComponent;

let hashValue = window.location.hash ? window.location.hash.slice(1) : null;

/* ────────────────────────────────────────────────────────────────────────────
 * Forms: Modules & Customization (state + diffs)
 * ──────────────────────────────────────────────────────────────────────────── */
let formModulesSaved: ModuleToggleConfig = $state(props.formModules);
let formModules: ModuleToggleConfig = $state(props.formModules);
const formModulesChangedFields = $derived(() => {
  return Object.keys(formModules).filter(
    (key) =>
      formModules[key as keyof ModuleToggleConfig] !==
      formModulesSaved[key as keyof ModuleToggleConfig],
  );
});
const formModulesChanged = $derived(() => {
  return formModulesChangedFields().length > 0;
});

let formCustomizationSaved: ModuleCustomizationConfig = $state(
  props.formCustomization,
);
let formCustomization: ModuleCustomizationConfig = $state(
  props.formCustomization,
);
const formCustomizationChangedFields = $derived(() => {
  return Object.keys(formCustomization).filter(
    (key) =>
      formCustomization[key as keyof ModuleCustomizationConfig] !==
      formCustomizationSaved[key as keyof ModuleCustomizationConfig],
  );
});
const formCustomizationChanged = $derived(() => {
  return formCustomizationChangedFields().length > 0;
});

/* ────────────────────────────────────────────────────────────────────────────
 * Tabs
 * ──────────────────────────────────────────────────────────────────────────── */
const tabs: () => Tab[] = $derived(() => [
  {
    id: 'customization',
    label: 'Customization',
    icon: iconSettings,
    modified: formCustomizationChanged(),
  },
  {
    id: 'modules',
    label: 'Modules',
    icon: iconSwitch,
    modified: formModulesChanged(),
  },
  {
    id: 'api-auth',
    label: 'API & Auth',
    icon: iconKey,
  },
]);

function getInitialTab() {
  if (hashValue)
    return tabs().find((tab) => tab.id === hashValue)?.id || 'customization';
  return 'customization';
}

let activeTab = $state(getInitialTab());

/* ────────────────────────────────────────────────────────────────────────────
 * User data & RYM sync status
 * ──────────────────────────────────────────────────────────────────────────── */
let userData = $state<UserData | null>(props.userData);
const isLoggedIn = $derived(() => !!userData?.name);

let dbRecordsQty = $state<number | null>(props.dbRecordsQty ?? null);
const dbRecordsQtyLabel = $derived(() => {
  if (!dbRecordsQty) return 'No records yet';
  let str = `Records: ${dbRecordsQty}`;
  if (!rymSyncTimestamp) str += ' (so far)';
  return str;
});

let rymSyncTimestamp = $state<number | null>(props.rymSyncTimestamp);

const rymSyncTimestampLabel = $derived(() => {
  if (!rymSyncTimestamp) return 'No sync performed yet';
  return `Last sync ${formatDistanceToNow(rymSyncTimestamp, { addSuffix: true })}`;
});

const rymSyncLifetime = $derived(() => {
  if (!rymSyncTimestamp) return null;
  const date = new Date(rymSyncTimestamp);
  const now = new Date();
  return now.getTime() - date.getTime();
});

const rymSyncOutdatedSeverity = $derived(() => {
  if (!rymSyncLifetime()) return null;

  if (
    (rymSyncLifetime() as number) >
    constants.RYM_SYNC_OUTDATED_THRESHOLD_MS * 1.5
  ) return 'critical';

  if ((rymSyncLifetime() as number) > constants.RYM_SYNC_OUTDATED_THRESHOLD_MS)
    return 'warning';

  return null;
});
const rymSyncStatus = $derived(() => {
  if (!rymSyncLifetime()) return 'invalid';
  if (rymSyncOutdatedSeverity() === 'critical') return 'invalid';
  if (rymSyncOutdatedSeverity() === 'warning') return 'warning';
  if (!rymSyncOutdatedSeverity()) return 'valid';
  return 'invalid';
});
const isRymSyncOutdated = $derived(() => {
  if (!rymSyncTimestamp) return false;
  if (!rymSyncLifetime()) return false;
  return !!rymSyncOutdatedSeverity();
});
const hasRymSyncWarning = $derived(() => {
  if (!rymSyncTimestamp) return true;
  return isRymSyncOutdated();
});
const rymSyncStatusMessage = $derived(() => {
  if (rymSyncStatus() === 'invalid') {
    if (!rymSyncLifetime()) return 'Not completed';
    return 'Needs re-run';
  }
  if (rymSyncStatus() === 'warning') return 'Slightly outdated';
  if (rymSyncStatus() === 'valid') return 'Completed';
  return 'Not completed';
});

const setupProgress = $derived(
  () =>
    [isLoggedIn(), !!lastfmApiKeySaved, rymSyncTimestamp].filter(Boolean)
      .length,
);

/* ────────────────────────────────────────────────────────────────────────────
 * Last.fm API key (state + handlers)
 * ──────────────────────────────────────────────────────────────────────────── */
let lastfmApiKeySaved = $state(props.lastfmApiKey);
let lastfmApiKey = $state(props.lastfmApiKey);
let lastfmApiKeyValidationInProgress = $state(false);

async function removeApiKey() {
  const doConfirm = confirm('Are you sure you want to remove the API key?');
  if (!doConfirm) return;
  await setLastFmApiKey('');
  lastfmApiKeySaved = '';
  lastfmApiKey = '';
}

async function onSubmitLastFmApiKey(e: Event) {
  e.preventDefault();
  if (!lastfmApiKey) return;
  if (lastfmApiKey === lastfmApiKeySaved) return;
  if (lastfmApiKey.length !== 32) {
    alert('Invalid API key. It should be 32 characters long.');
    return;
  }

  lastfmApiKeyValidationInProgress = true;

  try {
    await getTopArtists({
      apiKey: lastfmApiKey,
      params: { limit: 1 },
    });

    await setLastFmApiKey(lastfmApiKey);
    lastfmApiKeySaved = lastfmApiKey;
  } catch (err) {
    console.error(err);
    alert('Please check your API key and try again');
    lastfmApiKeyInput.focus();
  }

  lastfmApiKeyValidationInProgress = false;
}

const identityApiSupported = !!(
  browser.identity && browser.identity.launchWebAuthFlow
);

function handleApiKeyFocus(e: Event) {
  (e.target as HTMLInputElement).select();
}

function handleApiKeyClick(e: Event) {
  (e.target as HTMLInputElement).select();
}

function handleApiKeyBlur(e: Event) {
  (e.target as HTMLInputElement).value = (
    e.target as HTMLInputElement
  ).value.trim();
}

/* ────────────────────────────────────────────────────────────────────────────
 * Forms: actions (reset / submit)
 * ──────────────────────────────────────────────────────────────────────────── */
function reset() {
  Object.assign(formModules, formModulesSaved);
  Object.assign(formCustomization, formCustomizationSaved);
}

async function submit() {
  submitInProgress = true;
  const newFormModules = $state.snapshot(formModules);
  const newFormCustomization = $state.snapshot(formCustomization);

  await Promise.all([
    setModuleToggleConfig(newFormModules),
    setModuleCustomizationConfig(newFormCustomization),
    utils.wait(150),
  ]);
  formModulesSaved = newFormModules;
  formCustomizationSaved = newFormCustomization;
  submitInProgress = false;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Auth flow (Last.fm via identity API) + fallbacks
 * ──────────────────────────────────────────────────────────────────────────── */
async function openAuthPage() {
  if (!SYSTEM_API_KEY) {
    alert('API Key is not set');
    return;
  }

  signinInProgress = true;

  try {
    const redirectUri = browser.identity.getRedirectURL();

    const authUrl = `https://www.last.fm/api/auth/?api_key=${SYSTEM_API_KEY}&cb=${encodeURIComponent(
      redirectUri,
    )}`;

    const redirectUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });

    const finalUrl = new URL(redirectUrl);
    const token = finalUrl.searchParams.get('token');

    if (!token) {
      throw new Error('No token returned');
    }

    const sessionKey = await utils.fetchSessionKey(token);
    if (!sessionKey) throw new Error('Invalid session key');

    const data = await api.fetchUserData(sessionKey, SYSTEM_API_KEY);

    if (!data) throw new Error('No data returned');

    const normalizedData = {
      name: data.name,
      url: data.url,
      image: data.image?.[1]?.['#text'],
      playcount: data.playcount ? +data.playcount : null,
      registered: data.registered ? +data.registered?.['#text'] : null,
      albums: data.album_count ? +data.album_count : null,
      artists: data.artist_count ? +data.artist_count : null,
      tracks: data.track_count ? +data.track_count : null,
    };

    userData = normalizedData;

    await storageSet({
      userData: normalizedData,
    });

    signinInProgress = false;
  } catch (err) {
    console.error('Auth failed:', err);
    signinInProgress = false;
  }
}

async function fallbackLogin() {
  const username = prompt('Enter your Last.fm username');

  if (!username) return;

  signinInProgress = true;

  try {
    const data = await api.fetchUserDataByName(username, SYSTEM_API_KEY!);

    if (data && data.name) {
      const normalizedData = {
        name: data.name,
        url: data.url,
        image: data.image?.[1]?.['#text'],
        playcount: data.playcount ? +data.playcount : null,
        registered: data.registered ? +data.registered?.['#text'] : null,
        albums: data.album_count ? +data.album_count : null,
        artists: data.artist_count ? +data.artist_count : null,
        tracks: data.track_count ? +data.track_count : null,
      };

      userData = normalizedData;

      await storageSet({
        userData: normalizedData,
      });
    } else {
      alert('Failed to load profile.');
    }
  } catch (error) {
    console.error(error);
    alert('Failed to load profile.');
  }

  signinInProgress = false;
}

async function logout() {
  const doConfirm = confirm('Are you sure you want to logout?');
  if (!doConfirm) return;
  await storageRemove('userData');
  userData = null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Module settings previews (static data)
 * ──────────────────────────────────────────────────────────────────────────── */
const moduleSettingsPreviews = {
  'artist-stats': [
    {
      type: 'animation',
      on: '/images/options/artist-stats-on.jpg',
      off: '/images/options/artist-stats-off.jpg',
    },
  ],
  'release-stats': [
    {
      type: 'animation',
      on: '/images/options/release-stats-on.jpg',
      off: '/images/options/release-stats-off.jpg',
    },
  ],
  'song-stats': [
    {
      type: 'animation',
      on: '/images/options/song-stats-on.jpg',
      off: '/images/options/options/song-stats-off.jpg', // keep original path if it was correct
    },
  ],
  'recent-tracks': [
    '/images/options/recent-tracks-1-playing.jpg',
    '/images/options/recent-tracks-2-playing.jpg',
    '/images/options/recent-tracks-3-playing.jpg',
    '/images/options/recent-tracks-1-stopped.jpg',
  ],
  'top-albums': ['/images/options/top-albums.jpg'],
  'top-artists': ['/images/options/top-artists.jpg'],
};

let activePreviewKey = $state('');

/* ────────────────────────────────────────────────────────────────────────────
 * Misc helpers
 * ──────────────────────────────────────────────────────────────────────────── */
function init() {
  isLoading = false;
}

function openRymSync() {
  window.open('https://rateyourmusic.com/music_export?sync', '_blank');
}

/* ────────────────────────────────────────────────────────────────────────────
 * Init
 * ──────────────────────────────────────────────────────────────────────────── */
init();

/* ────────────────────────────────────────────────────────────────────────────
 * Lifecycle
 * ──────────────────────────────────────────────────────────────────────────── */
onMount(() => {
  const handler = (event: BeforeUnloadEvent) => {
    if (formModulesChanged() || formCustomizationChanged()) {
      event.preventDefault();
    }
  };

  window.addEventListener('beforeunload', handler);

  onDestroy(() => {
    window.removeEventListener('beforeunload', handler);
  });
});
</script>

{#snippet tabLink({
  href,
  label,
  icon,
  modified = false,
  onClick,
}: TabLinkProps)}
  <a {href} onclick={onClick}>
    <span class="relative">
      <span
        class="
          absolute
          top-1/2
          -translate-y-1/2
          right-full
          mr-2
          hidden
          sm:block
        ">{@render icon()}</span
      >
      {label}
      <span
        class="
          absolute
          top-1/2
          -translate-y-1/2
          left-full
          ml-2
          bg-current
          rounded-full
          transition-opacity
          w-1.5
          h-1.5
          {modified ? 'opacity-100' : 'opacity-0'}
        "
      ></span>
    </span>
  </a>
{/snippet}

{#snippet iconKey(classes = '')}
  {@html withSvgClass(iconKeySvg, `h-4 w-4 ${classes}`)}
{/snippet}

{#snippet iconSwitch(classes = '')}
  {@html withSvgClass(iconSwitchSvg, `h-4 w-4 ${classes}`)}
{/snippet}

{#snippet iconSettings(classes = '')}
  {@html withSvgClass(iconSettingsSvg, `h-4 w-4 ${classes}`)}
{/snippet}

{#snippet iconSuccess(classes = '')}
  {@html withSvgClass(iconSuccessSvg, `h-4 w-4 text-green-600 ${classes}`)}
{/snippet}

<div
  class="min-h-viewport flex flex-col {isLoading ? 'opacity-50 blur-xs' : ''}"
  style:display={isLoading ? 'none' : 'block'}
>
  <AppHeader />
  <main
    class="max-w-screen-lg mx-auto w-full flex flex-grow flex-col gap-4 lg:gap-6 pb-6"
  >
    <!-- STATUS CARDS -->
    <section
      aria-label="Extension Status"
      class="
        grid
        grid-cols-1
        md:grid-cols-3
        gap-2 lg:gap-4
        max-lg:[&>*:first-child]:rounded-tl-none
        max-lg:[&>*:first-child]:rounded-bl-none
        max-lg:[&>*:last-child]:rounded-tr-none
        max-lg:[&>*:last-child]:rounded-br-none
        max-md:*:rounded-none
      "
    >
      <AppStatusCard
        status={isLoggedIn() ? 'valid' : 'invalid'}
        title="Last.fm"
        statusMessage={isLoggedIn() ? 'Connected' : 'Not connected'}
        note={userData?.name ? ['Username:', userData.name] : 'Guest'}
        action={identityApiSupported ? openAuthPage : fallbackLogin}
        loading={signinInProgress}
      />
      <AppStatusCard
        status={lastfmApiKeySaved ? 'valid' : 'invalid'}
        title="Last.fm API Key"
        statusMessage={lastfmApiKeySaved ? 'Configured' : 'Not configured'}
        action={() => {
          activeTab = 'api-auth';
          tick().then(() => {
            lastfmApiKeyInput?.focus();
          });
        }}
      />
      <AppStatusCard
        status={rymSyncStatus()}
        title="RYM Sync"
        statusMessage={rymSyncStatusMessage()}
        note={[rymSyncTimestampLabel(), dbRecordsQtyLabel()]}
        action={openRymSync}
      />
    </section>

    {#if rymSyncOutdatedSeverity() === 'critical'}
      <blockquote
        class="text-sm text-zinc-500 text-center text-balance flex flex-col gap-4"
      >
        <p class="font-bold text-white font-bold">
          Keep your data fresh and up to date!
        </p>
        <p class="font-bold font-mono">
          &gt;
          <a
            href="https://rateyourmusic.com/music_export?sync"
            target="_blank"
            class="
              inline-flex
              gap-2
              cursor-pointer
              px-5
              py-2.5
              text-sm
              font-bold
              text-white
              inline-flex
              items-center
              bg-lastfm
              hoverable:hover:bg-lastfm-light
              focus-visible:ring-4
              focus-visible:outline-none
              focus-visible:ring-orange-300
              rounded-lg
              text-center
              animate-[periodic-shake-rotate_5s_ease-in-out_infinite]
            "
          >
            Re-run RYM Sync
          </a>
          &lt;
        </p>
        <p>
          RYM Last.fm Stats <strong>automatically</strong> tracks your RYM
          ratings whenever you rate a release. In addition, it parses your
          Profile and Collection pages when you visit them, adding new records
          to its internal database. Keep in mind that the RateYourMusic database
          is <em>constantly changing</em> — some releases may be updated or even
          removed. To ensure your data stays accurate, it’s recommended to run
          RYM Sync periodically (<strong>at least once a month</strong>).
        </p>
      </blockquote>
    {/if}

    <!-- SETUP PROGRESS -->
    {#if setupProgress() < 3}
      <h2 class="text-zinc-400 text-lg text-center flex flex-col">
        <strong>You're almost there!</strong>
        <span class="text-sm text-white/50">{setupProgress()} / 3</span>
        <span class="text-sm text-white/50"
          >Configure the remaining settings to complete the setup and get the
          most out of the extension:</span
        >
      </h2>
    {/if}

    <!-- CONTENT AREA -->
    <div
      class="
        flex flex-col bg-zinc-900 border-zinc-700
        p-2 md:p-4 lg:p-6
        border-t-1 border-b-1 lg:border-1
        lg:rounded-2xl
      "
    >
      <!-- gap-1 md:gap-2 lg:gap-3 -->
      <nav
        aria-label="Extension Settings Navigation"
        class="max-md:-mt-2 max-md:-mx-2"
      >
        <ul
          class="
            flex
            *:grow
            *:basis-0
            md:gap-1
            lg:gap-2
            rounded-2xl
            max-md:rounded-none
            md:p-0.5
            lg:p-1
            bg-zinc-800
          "
        >
          {#each tabs() as tab}
            <li
              class="
                *:flex
                *:transition-colors
                *:items-center
                *:gap-2
                *:justify-center
                *:rounded-xl
                *:px-1
                *:py-2
                lg:*:py-1
                *:text-sm
                max-md:*:rounded-none
                {activeTab === tab.id
                ? '*:bg-zinc-600 pointer-events-none'
                : '*:opacity-50 hoverable:*:hover:opacity-100'}
              "
            >
              {@render tabLink({
                href: `#${tab.id}`,
                label: tab.label,
                icon: tab.icon,
                modified: tab.modified,
                onClick: () => (activeTab = tab.id),
              })}
            </li>
          {/each}
        </ul>
      </nav>

      <!-- TAB CONTENT -->
      <div>
        <TabContent
          active={activeTab === 'customization'}
          icon={iconSettings}
          title="Customization"
          description="Profile modules customization"
        >
          <div
            class="max-md:flex max-md:flex-col md:columns-2 max-md:gap-4 md:*:break-inside-avoid md:*:mb-10"
          >
            <FormGroup title="Global">
              <FormInput
                label="Last.fm link label"
                bind:value={formCustomization.mainHeaderLastfmLinkLabel}
                placeholder="Last.fm"
                name="mainHeaderLastfmLinkLabel"
              >
                {#snippet description()}
                  Use <code class="px-0.5 py-0.5 bg-zinc-700 rounded-md"
                    >$username</code
                  > to display your Last.fm username
                {/snippet}
              </FormInput>
            </FormGroup>

            <FormGroup
              title={`Top Artists Widget ${!formModulesSaved.profileTopArtists ? '(Disabled)' : ''}`}
            >
              <FormSlider
                label="How many artists to show?"
                description="Change the number of top artists to show on profile"
                bind:value={formCustomization.profileTopArtistsLimit}
                min={constants.TOP_ARTISTS_LIMIT_MIN}
                max={constants.TOP_ARTISTS_LIMIT_MAX}
                name="profileTopArtistsLimit"
                disabled={!formModulesSaved.profileTopArtists}
              />

              <FormSelect
                label="Time period"
                description="Default value for filter by specific time period"
                bind:value={formCustomization.profileTopArtistsPeriod}
                name="profileTopArtistsPeriod"
                options={constants.PERIOD_OPTIONS}
                disabled={!formModulesSaved.profileTopArtists}
              />
            </FormGroup>

            <FormGroup
              title={`Top Albums Widget ${!formModulesSaved.profileTopAlbums ? '(Disabled)' : ''}`}
            >
              <FormSelect
                label="Time period"
                description="Default value for filter by specific time period"
                bind:value={formCustomization.profileTopAlbumsPeriod}
                name="profileTopAlbumsPeriod"
                options={constants.PERIOD_OPTIONS}
                disabled={!formModulesSaved.profileTopAlbums}
              />
            </FormGroup>

            <FormGroup
              title={`Recent Tracks Widget ${!formModulesSaved.profileRecentTracks ? '(Disabled)' : ''}`}
            >
              <FormToggle
                label="Open tracks list on load"
                description="Pre-open the list of recent tracks on profile load"
                bind:checked={formCustomization.profileRecentTracksShowOnLoad}
                name="profileRecentTracksShowOnLoad"
                disabled={!formModulesSaved.profileRecentTracks}
              />

              <FormToggle
                label="Real-time updates"
                description="Update recent tracks list periodically"
                bind:checked={formCustomization.profileRecentTracksPolling}
                name="profileRecentTracksPolling"
                disabled={!formModulesSaved.profileRecentTracks}
              />

              <FormToggle
                label="Hide RYM history"
                description="Hides the default RYM Play History widget on user profiles"
                bind:checked={
                  formCustomization.profileRecentTracksRymHistoryHide
                }
                name="profileRecentTracksRymHistoryHide"
                disabled={!formModulesSaved.profileRecentTracks}
              />

              <FormSlider
                label="Tracks limit"
                description="Select how many of recent scrobbles to fetch"
                bind:value={formCustomization.profileRecentTracksLimit}
                min={constants.RECENT_TRACKS_LIMIT_MIN}
                max={constants.RECENT_TRACKS_LIMIT_MAX}
                name="profileRecentTracksLimit"
                disabled={!formModulesSaved.profileRecentTracks}
              />

              <FormSelect
                label="Disc rotation animation"
                description="Toggle the animation of the disc rotation"
                bind:value={formCustomization.profileRecentTracksAnimation}
                name="profileRecentTracksAnimation"
                options={constants.NOW_PLAYING_ANIMATION_OPTIONS}
                disabled={!formModulesSaved.profileRecentTracks}
              />

              <FormSelect
                label="Background style"
                bind:value={formCustomization.profileRecentTracksBackground}
                name="profileRecentTracksBackground"
                options={constants.RECENT_TRACK_BACKGROUND_OPTIONS}
                disabled={!formModulesSaved.profileRecentTracks}
              />
            </FormGroup>
          </div>
        </TabContent>

        <TabContent
          active={activeTab === 'modules'}
          icon={iconSwitch}
          title="Modules"
          description="Enable or disable specific enhancement modules."
        >
          <DialogBase bind:visible={imagePreviewVisible} size="dynamic">
            <img
              src={imagePreviewSrc}
              class="block max-w-[90vw] max-h-[90vh]"
              alt="Module visual preview"
            />
          </DialogBase>

          <div class="flex flex-col gap-8">
            <FormGroup>
              {#snippet title()}
                Global modules <span class="text-zinc-400 text-xs">(rendered on all pages)</span>
              {/snippet}
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <FormToggle
                    label="Last.fm profile Link"
                    description="Adds link to the header of all RYM pages"
                    bind:checked={formModules.mainHeaderLastfmLink}
                    name="mainHeaderLastfmLink"
                    newOption
                  />
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Last.fm Stats (core functionality)">
              {#snippet note()}
                Updates once in &lt; <strong>{utils.msToHuman(
                  constants.getStatsCacheLifetime(
                    userData?.name,
                    lastfmApiKeySaved,
                  ),
                )}</strong> &gt;
              {/snippet}
              {#snippet warning()}
                {#if !isLoading && (!lastfmApiKeySaved || !isLoggedIn())}
                  <div class="text-xs text-orange-200 flex flex-col gap-1">
                    {#if !lastfmApiKeySaved}
                      <p>Add a Last.fm API key to increase rate limit</p>
                    {/if}
                    {#if !isLoggedIn()}
                      <p>
                        Connect to Last.fm to <strong
                          >enable personal scrobbling</strong
                        > stats
                      </p>
                    {/if}
                  </div>
                {/if}
              {/snippet}

              <div class="grid grid-cols-3 items-stretch gap-3">
                <div class="flex flex-col gap-2 p-2 bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    class={[
                      'cursor-zoom-in border border-zinc-700 rounded-xl grow overflow-hidden flex items-center',
                      formModules.artistArtistStats ? '' : 'grayscale opacity-50'
                    ]}
                    onclick={() => {
                      imagePreviewSrc = '/images/options/artist-stats-on.jpg';
                      imagePreviewVisible = true;
                    }}
                  >
                    <img
                      src="/images/options/artist-stats-on.jpg"
                      alt="Artist Statistics"
                    >
                  </button>

                  <FormToggle
                    label="Artist Statistics"
                    description="Show Last.fm stats on artist pages"
                    bind:checked={formModules.artistArtistStats}
                    name="artistArtistStats"
                  />
                </div>

                <div class="flex flex-col gap-2 p-2 bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    class={[
                      'cursor-zoom-in border border-zinc-700 rounded-xl grow overflow-hidden flex items-center',
                      formModules.releaseReleaseStats ? '' : 'grayscale opacity-50'
                    ]}
                    onclick={() => {
                      imagePreviewSrc = '/images/options/release-stats-on.jpg';
                      imagePreviewVisible = true;
                    }}
                  >
                    <img
                      src="/images/options/release-stats-on.jpg"
                      alt="Release Statistics"
                    >
                  </button>
                  <FormToggle
                    label="Release Statistics"
                    description="Show Last.fm stats on release pages"
                    bind:checked={formModules.releaseReleaseStats}
                    name="releaseReleaseStats"
                  />
                </div>

                <div class="flex flex-col gap-2 p-2 bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    class={[
                      'cursor-zoom-in border border-zinc-700 rounded-xl grow overflow-hidden flex items-center',
                      formModules.songSongStats ? '' : 'grayscale opacity-50'
                    ]}
                    onclick={() => {
                      imagePreviewSrc = '/images/options/song-stats-on.jpg';
                      imagePreviewVisible = true;
                    }}
                  >
                    <img
                      src="/images/options/song-stats-on.jpg"
                      alt="Song Statistics"
                    >
                  </button>
                  <FormToggle
                    label="Song Statistics"
                    description="Show Last.fm stats on song pages"
                    bind:checked={formModules.songSongStats}
                    name="songSongStats"
                    newOption
                  />
                </div>
              </div>
            </FormGroup>

            <FormGroup title="Profile widgets">
              {#snippet note()}
                {#if !isLoading && !lastfmApiKeySaved}
                  <span class="text-orange-200 not-italic">
                    ⚠️ Last.fm API key is required
                  </span>
                {/if}
              {/snippet}

              <div class="grid grid-cols-3 gap-3">
                <div class="flex flex-col gap-2 p-2 bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    class={[
                      'cursor-zoom-in border border-zinc-700 rounded-xl grow overflow-hidden flex items-center',
                      formModules.profileRecentTracks ? '' : 'grayscale opacity-50'
                    ]}
                    onclick={() => {
                      imagePreviewSrc = '/images/options/recent-tracks-1-playing.jpg';
                      imagePreviewVisible = true;
                    }}
                  >
                    <img
                      src="/images/options/recent-tracks-1-playing.jpg"
                      alt="Recent Tracks"
                    >
                  </button>
                  <FormToggle
                    label="Recent Tracks Widget"
                    description="Show recent tracks on profile"
                    bind:checked={formModules.profileRecentTracks}
                    disabled={!lastfmApiKeySaved}
                    name="profileRecentTracks"
                  />
                </div>

                <div class="flex flex-col gap-2 p-2 bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    class={[
                      'cursor-zoom-in border border-zinc-700 rounded-xl grow overflow-hidden flex items-center',
                      formModules.profileTopAlbums ? '' : 'grayscale opacity-50'
                    ]}
                    onclick={() => {
                      imagePreviewSrc = '/images/options/top-albums.jpg';
                      imagePreviewVisible = true;
                    }}
                  >
                    <img
                      src="/images/options/top-albums.jpg"
                      alt="Top Albums"
                    >
                  </button>
                  <FormToggle
                    label="Top Albums Widget"
                    description="Show top albums on profile"
                    bind:checked={formModules.profileTopAlbums}
                    disabled={!lastfmApiKeySaved}
                    name="profileTopAlbums"
                  />
                </div>

                <div class="flex flex-col gap-2 p-2 bg-zinc-800 rounded-xl">
                  <button
                    type="button"
                    class={[
                      'cursor-zoom-in border border-zinc-700 rounded-xl grow overflow-hidden flex items-center',
                      formModules.profileTopArtists ? '' : 'grayscale opacity-50'
                    ]}
                    onclick={() => {
                      imagePreviewSrc = '/images/options/top-artists.jpg';
                      imagePreviewVisible = true;
                    }}
                  >
                    <img
                      src="/images/options/top-artists.jpg"
                      alt="Top Artists"
                    >
                  </button>
                  <FormToggle
                    label="Top Artists Widget"
                    description="Show top artists on profile"
                    bind:checked={formModules.profileTopArtists}
                    disabled={!lastfmApiKeySaved}
                    name="profileTopArtists"
                  />
                </div>

                <FormToggle
                  label="Strict Search Results"
                  description="Enhanced search filtering"
                  bind:checked={formModules.searchStrictResults}
                  disabled={!lastfmApiKeySaved}
                  name="searchStrictResults"
                />
              </div>
            </FormGroup>

            <FormGroup title="RYM Ratings">
              {#snippet note()}
                {#if !isLoading && hasRymSyncWarning()}
                  <span class="text-orange-200 not-italic">
                    ⚠️
                    {#if !rymSyncTimestamp}RYM Sync is required{/if}
                    {#if isRymSyncOutdated()}RYM Sync is outdated{/if}
                  </span>
                {/if}
              {/snippet}

              <div class="grid grid-cols-3 gap-3">
                <FormToggle
                  label="List User Ratings"
                  description="Show user ratings in lists"
                  bind:checked={formModules.listUserRating}
                  name="listUserRating"
                  newOption
                />

                <FormToggle
                  label="Chart User Ratings"
                  description="Show ratings in charts"
                  bind:checked={formModules.chartsUserRating}
                  name="chartsUserRating"
                  newOption
                />
              </div>
            </FormGroup>
          </div>
        </TabContent>

        <TabContent
          active={activeTab === 'api-auth'}
          icon={iconKey}
          title="API & Auth"
          description="Configure the API and authentication settings"
        >
          <div
            class="max-md:flex max-md:flex-col md:columns-2 max-md:gap-4 md:*:break-inside-avoid md:*:mb-10"
          >
            <div>
              <form
                autocomplete="off"
                onsubmit={onSubmitLastFmApiKey}
                class="flex flex-col gap-3 items-start rounded-xl"
              >
                <FormInput
                  label="Last.fm API Key"
                  type="text"
                  class="
                    font-mono
                    tracking-widest
                    [-webkit-text-security:disc]
                    focus:[-webkit-text-security:none]
                    read-only:cursor-default
                  "
                  bind:value={lastfmApiKey}
                  name="lastfmApiKey"
                  placeholder="PASTE API KEY HERE"
                  onfocus={handleApiKeyFocus}
                  onblur={handleApiKeyBlur}
                  onclick={handleApiKeyClick}
                  disabled={lastfmApiKeyValidationInProgress}
                  readonly={!!lastfmApiKeySaved}
                  bind:this={lastfmApiKeyInput}
                />
                <div class="flex gap-4 px-4 items-center w-full">
                  {#if !lastfmApiKeySaved}
                    <button
                      type="submit"
                      disabled={lastfmApiKeyValidationInProgress ||
                        !!lastfmApiKeySaved}
                      class="
                        inline-flex
                        gap-2
                        cursor-pointer
                        px-5
                        py-2
                        text-sm
                        font-medium
                        text-white
                        items-center
                        border-1
                        bg-yellow-900/50
                        border-yellow-800
                        hoverable:hover:bg-yellow-800/50
                        disabled:opacity-50
                        disabled:pointer-events-none
                        focus-visible:ring-2
                        focus-visible:outline-none
                        focus-visible:ring-blue-300
                        rounded-lg
                        text-center
                      "
                    >
                      {@render iconKey()}
                      Verify API Key
                    </button>
                  {/if}
                  {#if lastfmApiKeySaved}
                    <button
                      type="button"
                      onclick={removeApiKey}
                      class="
                        inline-flex
                        ml-auto
                        gap-2
                        cursor-pointer
                        p-0
                        text-sm
                        font-medium
                        items-center
                        hoverable:hover:text-red-400
                        focus-visible:ring-2
                        focus-visible:outline-none
                        focus-visible:ring-blue-300
                        hoverable:hover:underline
                      "
                    >
                      Remove API Key
                    </button>
                  {/if}
                  {#if !lastfmApiKeySaved}
                    <div class="flex items-center ml-auto gap-3">
                      <a
                        href="https://www.last.fm/api/account/create"
                        target="_blank"
                        class="text-zinc-400 text-xs hoverable:hover:text-zinc-300 flex items-center gap-2"
                      >
                        <svg
                          width="800px"
                          height="800px"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-4 h-4"
                        >
                          <line
                            x1="10.8492"
                            y1="13.0606"
                            x2="19.435"
                            y2="4.47485"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M19.7886 4.12134L20.1421 8.01042"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M19.7886 4.12134L15.8995 3.76778"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M18 13.1465V17.6465C18 19.3033 16.6569 20.6465 15 20.6465H6C4.34315 20.6465 3 19.3033 3 17.6465V8.64648C3 6.98963 4.34315 5.64648 6 5.64648H10.5"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                        Create new API key
                      </a>
                      <a
                        href="https://www.last.fm/api/accounts"
                        target="_blank"
                        class="text-zinc-400 text-xs hoverable:hover:text-zinc-300 flex items-center gap-2"
                      >
                        <svg
                          width="800px"
                          height="800px"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          class="w-4 h-4"
                        >
                          <line
                            x1="10.8492"
                            y1="13.0606"
                            x2="19.435"
                            y2="4.47485"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M19.7886 4.12134L20.1421 8.01042"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M19.7886 4.12134L15.8995 3.76778"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                          <path
                            d="M18 13.1465V17.6465C18 19.3033 16.6569 20.6465 15 20.6465H6C4.34315 20.6465 3 19.3033 3 17.6465V8.64648C3 6.98963 4.34315 5.64648 6 5.64648H10.5"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                        See my API keys
                      </a>
                    </div>
                  {/if}
                </div>

                {#if lastfmApiKeySaved}
                  <div
                    class="flex items-center gap-2 border-zinc-600 text-sm text-balance border rounded-xl p-4"
                  >
                    {@render iconSuccess('shrink-0')}
                    API key configured successfully. Enhanced features and higher
                    Last.fm API rate limits are now available.
                  </div>
                {/if}

                {#if !lastfmApiKeySaved}
                  <div class="text-xs text-zinc-400 px-4">
                    Optional: Provides access to additional Last.fm features and
                    higher rate limits
                  </div>
                {/if}
              </form>
            </div>
            <div class="flex flex-col gap-3">
              {#if !isLoggedIn()}
                <div
                  class="flex gap-2 items-center justify-between rounded-xl bg-zinc-800 p-4 border-2 border-zinc-700"
                >
                  {#if identityApiSupported}
                    <button
                      disabled={signinInProgress}
                      onclick={openAuthPage}
                      class="
                        inline-flex
                        gap-2
                        cursor-pointer
                        px-5
                        py-2.5
                        text-sm
                        text-shadow-sm
                        transition-colors
                        text-white
                        inline-flex
                        items-center
                        bg-lastfm
                        hoverable:hover:bg-lastfm-light
                        focus-visible:ring-4
                        focus-visible:outline-none
                        focus-visible:ring-blue-300
                        rounded-lg
                        text-center
                        focus-visible:ring-blue-800
                        font-bold
                        disabled:opacity-50
                        disabled:pointer-events-none
                      "
                    >
                      {@render iconKey()}
                      Login via Last.fm
                    </button>

                    <span>or</span>
                  {/if}

                  <button
                    onclick={fallbackLogin}
                    class="
                      px-5
                      py-2.5
                      bg-white/5
                      cursor-pointer
                      text-sm
                      rounded-lg
                      text-zinc-300
                      hoverable:hover:underline
                      font-bold
                    "
                  >
                    Manual Login
                  </button>
                </div>
              {:else if userData}
                <FormItem label="Logged in as:">
                  <a
                    href={userData.url}
                    target="_blank"
                    class="
                      h-10
                      w-full
                      flex
                      items-center
                      justify-between
                      bg-zinc-700/50
                      pr-2.5
                      rounded-r-lg
                      rounded-l-[2.5rem]
                      hoverable:hover:bg-zinc-700/70
                      transition-colors
                      text-zinc-400
                      hoverable:hover:text-white
                    "
                  >
                    <span class="flex items-center gap-2 h-full">
                      <img
                        src={userData.image}
                        alt={userData.name?.[1]?.toUpperCase() || ''}
                        class="h-10 w-10 bg-zinc-700 text-center rounded-full outline outline-1 outline-zinc-300"
                      />
                      <strong class="text-white">{userData.name}</strong>
                    </span>
                    <span class="text-xs">Click to open profile</span>
                  </a>
                </FormItem>
                <div class="flex grow flex-col gap-3">
                  <div class="flex gap-2 px-2.5">
                    <button
                      type="button"
                      onclick={logout}
                      class="
                        inline-flex ml-auto gap-2 cursor-pointer p-0 text-sm font-medium items-center
                        hoverable:hover:text-red-400 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-blue-300
                        hoverable:hover:underline
                      "
                    >
                      Logout
                    </button>
                  </div>
                  <div
                    class="flex items-center text-balance gap-2 border-zinc-600 text-sm border rounded-xl p-4"
                  >
                    {@render iconSuccess('shrink-0')}
                    Successfully logged in with last.fm OAuth. Personal scrobbling
                    stats and additional Profile features are now available.
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </TabContent>
      </div>
    </div>

    <!-- ACTIONS -->
    <div
      class="actions-panel"
      class:is-sticky={formModulesChanged() || formCustomizationChanged()}
    >
      <div
        class="actions-panel-inner flex gap-6 justify-between items-center p-6"
      >
        {#if formModulesChanged() || formCustomizationChanged()}
          <button
            class="
              text-sm p-2 border-2 border-orange-700/50 rounded-lg relative
              hoverable:hover:[&_.button-label]:opacity-100 cursor-pointer hoverable:hover:bg-orange-700/20
              hoverable:hover:[&_.unsaved-changes]:opacity-0
            "
            onclick={reset}
          >
            <span class="unsaved-changes transition-opacity opacity-100"
              >{formModulesChangedFields().length +
                formCustomizationChangedFields().length} unsaved changes</span
            >
            <span
              class="
                transition-opacity
                button-label
                absolute
                inset-0
                flex
                items-center
                justify-center
                opacity-0
              ">Undo</span
            >
          </button>
        {/if}
        <div class="ml-auto">
          <button
            type="submit"
            disabled={submitInProgress}
            class="
              inline-flex gap-2 cursor-pointer px-5 py-2.5 text-sm font-bold text-white inline-flex items-center
              focus-visible:ring-4 focus-visible:outline-none focus-visible:ring-blue-800
              rounded-lg text-center
              disabled:opacity-50 disabled:pointer-events-none
              border-1 bg-yellow-900/50
              border-yellow-800
              hoverable:hover:bg-yellow-800/50
              relative
              active:t-[2px]
            "
            onclick={submit}
          >
            {@render iconSettings()}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  </main>

  <footer class="flex flex-col gap-6 py-4 px-6 bg-zinc-900">
    <div class="max-w-screen-lg mx-auto w-full">
      <div class="text-xs text-zinc-400 flex gap-1 justify-between">
        <div>
          <strong>Disclaimer:</strong> This extension is a third-party tool and it's
          not affiliated with Last.fm or RYM.
        </div>
        <div class="text-white">
          <a
            class="hoverable:hover:underline"
            href="mailto:landenmetal@gmail.com">Contact developer</a
          >&nbsp;&nbsp;|&nbsp;&nbsp;<span
            >RYM Last.fm Stats © {new Date().getFullYear()}</span
          >
        </div>
      </div>
    </div>
  </footer>
</div>

<style lang="postcss">
@reference "../../assets/styles/options.css";

/* fix for Chrome default extension font style */
:global(body) {
  font-size: inherit;
  font-family: inherit;
}

@keyframes fadeA {
  0%,
  89.99% {
    opacity: 1;
  }
  90%,
  100% {
    opacity: 0;
  }
}
@keyframes fadeB {
  0%,
  89.99% {
    opacity: 0;
  }
  90%,
  100% {
    opacity: 1;
  }
}

.animate-fadeA {
  animation: fadeA 5s infinite ease-in-out;
}
.animate-fadeB {
  animation: fadeB 5s infinite ease-in-out;
}

.actions-panel-inner {
  @apply border-1 border-transparent;
}

.actions-panel.is-sticky {
  container-type: scroll-state;
  position: sticky;
  bottom: 0;
  z-index: 100;

  @supports (container-type: scroll-state) {
    .actions-panel-inner {
      @container scroll-state(stuck: bottom) {
        @apply border-zinc-700 bg-zinc-900 shadow-2xl rounded-t-2xl;
      }
    }
  }

  @supports not (container-type: scroll-state) {
    .actions-panel-inner {
      @apply border-zinc-700 bg-zinc-900 shadow-2xl rounded-2xl;
    }
  }
}
</style>
