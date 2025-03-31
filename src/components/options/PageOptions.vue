<template>
  <div
    id="app"
    class="flex h-full flex-col px-2"
  >
    <header
      class="mx-auto flex w-full max-w-[700px] items-center justify-between py-6"
    >
      <div class="flex items-center gap-3">
        <img
          src="/icons/icon48.png"
          alt=""
        >
        <h1 class="relative cursor-default select-none text-2xl font-bold">
          <span
            class="absolute right-0 top-0 -translate-y-1/2 text-[10px] font-bold"
          >{{ appVersion }}</span>
          <span class="text-red-600">RYM Last.fm Stats</span>
        </h1>
      </div>
      <div>
        <a
          href="mailto:landenmetal@gmail.com"
          target="_blank"
          class="
            font-bold
            hover:underline
          "
        >Contact me</a>
      </div>
    </header>

    <main class="flex flex-col">
      <div class="mx-auto max-w-[700px]">
        <div
          class="
            flex flex-col gap-2 rounded bg-gray-200 p-4
            dark:bg-gray-800
          "
        >
          <p>
            This extension allows you to display Last.fm stats on RateYourMusic
            artist and release pages, see your recent tracks and top albums on
            your profile.
          </p>
          <p>
            <a
              href="#"
              class="
                text-clr-rym font-bold
                hover:underline
              "
              @click.prevent="showModal = true"
            >How it works?</a>
          </p>
        </div>

        <!-- Modal -->
        <div
          v-show="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <div
            class="
              w-full max-w-md rounded-lg bg-white p-6 shadow-lg
              dark:bg-black
            "
          >
            <div class="mb-4 flex items-center justify-between">
              <h2 class="text-xl font-bold">
                How it works?
              </h2>
              <button
                class="
                  text-gray-500
                  hover:text-gray-700
                "
                @click="showModal = false"
              >
                &times;
              </button>
            </div>
            <div class="mb-4">
              <p>SCREENSHOTS</p>
            </div>
            <div class="flex justify-end">
              <button
                class="
                  rounded bg-blue-500 px-4 py-2 text-white
                  hover:bg-blue-700
                "
                @click="showModal = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <form
          v-if="!loading"
          class="flex flex-col gap-5 py-5"
          @submit.prevent="submit"
        >
          <div class="form-actions flex items-center justify-between gap-5">
            <div class="mr-auto flex gap-5">
              <div v-if="userData">
                Signed in as <strong>{{ userData.name }}</strong> (<a
                  href="#"
                  class="
                    text-clr-rym font-bold
                    hover:underline
                  "
                  @click.prevent="logout"
                >logout</a>)
              </div>
              <button
                v-if="!userData"
                class="
                  inline-flex min-w-[120px] items-center justify-center gap-3 rounded bg-blue-600
                  px-4 py-2 font-bold text-white transition-colors
                  hover:bg-blue-800
                "
                :class="{
                  'pointer-events-none': signinInProgress,
                  'bg-gray-400': signinInProgress,
                }"
                :disabled="signinInProgress"
                @click="openAuthPage"
              >
                <template v-if="signinInProgress">
                  In progress...
                </template>
                <template v-else>
                  <svg
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    class="h-6 w-6"
                  >
                    <path d="M14.131 22.948l-1.172-3.193c0 0-1.912 2.131-4.771 2.131-2.537 0-4.333-2.203-4.333-5.729 0-4.511 2.276-6.125 4.515-6.125 3.224 0 4.245 2.089 5.125 4.772l1.161 3.667c1.161 3.561 3.365 6.421 9.713 6.421 4.548 0 7.631-1.391 7.631-5.068 0-2.968-1.697-4.511-4.844-5.244l-2.344-0.511c-1.624-0.371-2.104-1.032-2.104-2.131 0-1.249 0.985-1.984 2.604-1.984 1.767 0 2.704 0.661 2.865 2.24l3.661-0.444c-0.297-3.301-2.584-4.656-6.323-4.656-3.308 0-6.532 1.251-6.532 5.245 0 2.5 1.204 4.077 4.245 4.807l2.484 0.589c1.865 0.443 2.484 1.224 2.484 2.287 0 1.359-1.323 1.921-3.828 1.921-3.703 0-5.244-1.943-6.124-4.625l-1.204-3.667c-1.541-4.765-4.005-6.531-8.891-6.531-5.287-0.016-8.151 3.385-8.151 9.192 0 5.573 2.864 8.595 8.005 8.595 4.14 0 6.125-1.943 6.125-1.943z" />
                  </svg>
                  <span>Sign in with Lastfm</span>
                </template>
              </button>
            </div>
            <div class="ml-auto flex items-center gap-5">
              <a
                href="https://github.com/dukhevych/rym-lastfm-stats/issues/new"
                target="_blank"
                class="
                  font-bold
                  hover:underline
                "
              >Report issue</a>
            </div>
          </div>

          <!-- MAIN SETTINGS -->
          <FormFieldset title="Last.fm API Key">
            <template #helper>
              <p>
                API Key is required for Profile enhancements and personal scrobbling stats on Artist and Release pages.
              </p>
            </template>

            <!-- LAST.FM API KEY -->
            <FormInput
              v-model="options.lastfmApiKey"
              name="lastfmApiKey"
              clearable
              placeholder="Add your lastfm API key here"
              min="32"
              max="32"
              @focus="(e) => e.target.select()"
              @blur="(e) => e.target.value = e.target.value.trim()"
            >
              <template #hint>
                With API Key you will get your
                <strong>personal scrobbling stats</strong>
                on your
                <strong>Profile page</strong>.
              </template>
            </FormInput>

            <div class="flex items-center justify-between gap-3">
              <a
                href="https://www.last.fm/api/account/create"
                class="
                  inline-flex min-w-[120px] justify-center rounded bg-blue-600 px-4 py-2 text-sm
                  font-bold text-white transition-colors
                  hover:bg-blue-800
                "
                target="_blank"
              >
                Create New
              </a>
              <a
                href="https://www.last.fm/api/accounts"
                class="
                  font-bold
                  hover:underline
                "
                target="_blank"
              >
                My API Keys
              </a>
            </div>
          </FormFieldset>

          <div
            v-if="!userData || !hasApiKey"
            class="flex items-center gap-3"
          >
            <svg
              class="h-6 w-6 shrink-0"
              fill="#cc3300"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              width="800px"
              height="800px"
              viewBox="0 0 478.125 478.125"
              xml:space="preserve"
            >
              <g>
                <g>
                  <g>
                    <circle
                      cx="239.904"
                      cy="314.721"
                      r="35.878"
                    />
                    <path
                      d="M256.657,127.525h-31.9c-10.557,0-19.125,8.645-19.125,19.125v101.975c0,10.48,8.645,19.125,19.125,19.125h31.9
				c10.48,0,19.125-8.645,19.125-19.125V146.65C275.782,136.17,267.138,127.525,256.657,127.525z"
                    />
                    <path
                      d="M239.062,0C106.947,0,0,106.947,0,239.062s106.947,239.062,239.062,239.062c132.115,0,239.062-106.947,239.062-239.062
				S371.178,0,239.062,0z M239.292,409.734c-94.171,0-170.595-76.348-170.595-170.596c0-94.248,76.347-170.595,170.595-170.595
				s170.595,76.347,170.595,170.595C409.887,333.387,333.464,409.734,239.292,409.734z"
                    />
                  </g>
                </g>
              </g>
            </svg>
            <p>
              To enable advanced features for your <strong>RYM Profile</strong> please
              <a
                v-if="!userData"
                href="#"
                class="
                  text-clr-rym font-bold
                  hover:underline
                "
                @click.prevent="openAuthPage"
              >sign in with Last.fm</a>
              <template v-else>
                sign in
              </template>
              and add your Last.fm API Key. You can create it by visiting <a
                href="https://www.last.fm/api/account/create"
                target="_blank"
                class="
                  text-clr-rym font-bold
                  hover:underline
                "
              >this link</a>
              (only "Application" field is required).
              If you already have an API Key, you can find it in your API Applications <a
                href="https://www.last.fm/api/accounts"
                target="_blank"
                class="
                  text-clr-rym font-bold
                  hover:underline
                "
              >here</a>.
            </p>
          </div>

          <!-- PROFILE -->
          <FormFieldset
            title="Profile"
            :disabled="!hasApiKey || !userData"
          >
            <template #helper>
              <p>
                Profile enhancements work only if you're signed in with Last.fm
              </p>
            </template>

            <!-- RECENT TRACKS -->
            <FormCheckbox
              v-model="options.recentTracks"
              name="recentTracks"
              label="Recent tracks"
            />

            <!-- RECENT TRACKS SHOW ON LOAD -->
            <FormCheckbox
              v-model="options.recentTracksShowOnLoad"
              name="recentTracksShowOnLoad"
              label="Show Recent tracks on page load"
            />

            <!-- RECENT TRACKS REPLACE -->
            <FormCheckbox
              v-model="options.recentTracksReplace"
              name="recentTracksReplace"
              label="Replace 'Listening to' (experimental)"
              :disabled="options.recentTracks === false"
            />

            <!-- RECENT TRACKS LIMIT -->
            <FormRange
              v-model="options.recentTracksLimit"
              name="recentTracksLimit"
              :label="`Recent tracks limit (${constants.RECENT_TRACKS_LIMIT_MIN}-${constants.RECENT_TRACKS_LIMIT_MAX})`"
              :min="constants.RECENT_TRACKS_LIMIT_MIN"
              :max="constants.RECENT_TRACKS_LIMIT_MAX"
              :disabled="options.recentTracks === false"
            />

            <FormSeparator />

            <!-- TOP ALBUMS -->
            <FormCheckbox
              v-model="options.topAlbums"
              name="topAlbums"
              label="Top albums"
            />

            <FormSeparator />

            <!-- TOP ARTISTS -->
            <FormCheckbox
              v-model="options.topArtists"
              name="topArtists"
              label="Top artists"
            />

            <!-- TOP ARTISTS LIMIT -->
            <FormRange
              v-model="options.topArtistsLimit"
              name="topArtistsLimit"
              :label="`Top artists limit (${constants.TOP_ARTISTS_LIMIT_MIN}-${constants.TOP_ARTISTS_LIMIT_MAX})`"
              :min="constants.TOP_ARTISTS_LIMIT_MIN"
              :max="constants.TOP_ARTISTS_LIMIT_MAX"
              :disabled="options.topArtists === false"
            />

            <FormSeparator />

            <!-- OTHER PROFILES -->
            <FormCheckbox
              v-model="options.parseOtherProfiles"
              name="parseOtherProfiles"
              label="Parse other users profiles"
              hint="Try to parse other users profiles on RYM and display their Last.fm stats if username found."
            />
          </FormFieldset>

          <div class="form-actions flex items-center justify-between gap-5">
            <div class="mr-auto flex items-center gap-5">
              <a
                href="#"
                class="
                  font-bold text-blue-600
                  hover:underline
                "
                @click.prevent="reset"
              >
                Reset Settings
              </a>
            </div>
            <div class="ml-auto flex items-center gap-5">
              <transition name="slide-fade">
                <div
                  v-show="saved"
                  class="text-green-700"
                >
                  <b>Saved!</b>
                </div>
              </transition>
            </div>
          </div>
        </form>
      </div>
    </main>

    <footer
      class="
        mt-auto flex flex-col items-center gap-2 bg-gray-100 py-6
        dark:bg-gray-800
      "
    >
      <div class="flex gap-6">
        <a
          href="https://open.spotify.com/user/11139279910/playlists"
          class="
            font-bold text-blue-500
            hover:underline
          "
          target="_blank"
        >
          <img
            src="/icons/spotify.svg"
            alt="Spotify"
            class="block h-6 w-6"
          >
        </a>
        <a
          href="https://rateyourmusic.com/~Landen"
          class="
            font-bold text-blue-500
            hover:underline
          "
          target="_blank"
        >
          <img
            src="/icons/rym.svg"
            alt="RYM"
            class="block h-6 w-6"
          >
        </a>
        <a
          href="https://www.linkedin.com/in/dukhevych/"
          class="
            font-bold text-blue-500
            hover:underline
          "
          target="_blank"
        >
          <img
            src="/icons/linkedin.svg"
            alt="LinkedIn"
            class="block h-6 w-6"
          >
        </a>
        <a
          href="https://github.com/dukhevych/rym-lastfm-stats"
          class="
            font-bold text-blue-500
            hover:underline
          "
          target="_blank"
        >
          <img
            src="/icons/github.svg"
            alt="Github"
            class="block h-6 w-6"
          >
        </a>
      </div>
      <div>{{ new Date().getFullYear() }} &copy; Landen</div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import * as utils from '@/helpers/utils.js';
import * as constants from '@/helpers/constants.js';
import * as api from '@/helpers/api.js';
import FormInput from '@/components/options/FormInput.vue';
import FormCheckbox from '@/components/options/FormCheckbox.vue';
import FormFieldset from '@/components/options/FormFieldset.vue';
import FormRange from './FormRange.vue';
import FormSeparator from './FormSeparator.vue';

import debounce from 'lodash/debounce';

const appVersion = process.env.APP_VERSION;
const SYSTEM_API_KEY = process.env.LASTFM_API_KEY;

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
const loading = ref(true);
const options = reactive(Object.assign({}, constants.OPTIONS_DEFAULT));

const config = ref(null);
const userData = ref(null);
const saved = ref(false);
const dirty = ref(false);
const signinInProgress = ref(false);
const showModal = ref(false);

const submit = async () => {
  const newConfig = JSON.parse(JSON.stringify(options));

  Object.keys(newConfig).forEach((key) => {
    if (newConfig[key] === config.value[key]) {
      delete newConfig[key];
    }
  });

  await browserAPI.storage.sync.set(newConfig);

  config.value = newConfig;
  saved.value = true;
  if (submit.timer) {
    clearTimeout(submit.timer);
  }
  submit.timer = setTimeout(() => {
    if (!dirty.value) {
      saved.value = false;
    }
  }, 3000);
  dirty.value = false;
};

const reset = async () => {
  const doConfirm = confirm('Are you sure you want to reset all settings?');
  if (!doConfirm) return;
  Object.assign(options, constants.PROFILE_OPTIONS_DEFAULT);
  await submit();
};

const openAuthPage = () => {
  if (!SYSTEM_API_KEY) {
    alert('API Key is not set');
    return;
  }

  signinInProgress.value = true;

  browserAPI.windows.create({
    url: `https://www.last.fm/api/auth/?api_key=${SYSTEM_API_KEY}&source=rym-lastfm-stats`,
    type: 'popup',
    width: 500,
    height: 600,
  });

  browserAPI.runtime.onMessage.addListener((message) => {
    if (message.type === 'lastfm_auth') {
      api.fetchUserData(message.value, SYSTEM_API_KEY).then((data) => {
        userData.value = data;
        browserAPI.storage.sync.set({ userData: { name: data.name } });
        signinInProgress.value = false;
      });
    }
  });
};

const init = async () => {
  try {
    const syncedOptions = await utils.getSyncedOptions();

    config.value = syncedOptions;

    Object.assign(options, config.value);

    const syncedUserData = await utils.getSyncedUserData();

    userData.value = syncedUserData;

    const debouncedSubmit = debounce(() => {
      submit();
    }, 300);

    watch(
      () => options,
      () => {
        saved.value = false;
        dirty.value = true;
        debouncedSubmit();
      },
      { deep: true },
    );
    loading.value = false;
  } catch (error) {
    console.error(error);
  }
};

const hasApiKey = computed(() => {
  return options.lastfmApiKey && options.lastfmApiKey.length === 32;
});

const logout = async () => {
  const doConfirm = confirm('Are you sure you want to logout?');
  if (!doConfirm) return;
  await browserAPI.storage.sync.remove('userData');
  userData.value = null;
};

init();
</script>

<style>
.slide-fade-enter-active {
  transition: all 0.15s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.5s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
}
.slide-fade-enter-from {
  transform: translateY(-100%);
}
.slide-fade-leave-to {
  transform: translateY(100%);
}

body {
  font-size: inherit;
  font-family: inherit;
}
</style>
