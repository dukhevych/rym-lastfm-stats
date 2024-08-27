<template>
  <header class="flex justify-between items-center py-6 max-w-[700px] mx-auto">
    <div class="flex gap-3 items-center">
      <img
        src="/icons/icon48.png"
        alt=""
      >
      <h1 class="text-2xl font-bold cursor-default select-none text-red-600">
        RYM Last.fm Stats
      </h1>
    </div>
    <div>
      <a
        href="mailto:landenmetal@gmail.com"
        class="font-bold hover:underline"
      >Contact</a>
    </div>
  </header>

  <main class="flex flex-col">
    <div class="max-w-[700px] mx-auto">
      <div class="bg-gray-200 dark:bg-gray-800 p-4 rounded flex flex-col gap-2">
        <p>
          This extension allows you to display Last.fm stats on RateYourMusic
          artist and release pages, see your recent tracks and top albums on
          your profile.
        </p>
        <p>More to come!</p>
      </div>

      <form
        v-if="!loading"
        class="flex flex-col py-5 gap-5"
        novalidate
        @submit.prevent="submit"
      >
        <div class="form-actions flex justify-between gap-5">
          <div
            v-if="saved"
            class="bg-green-100 grow border-l-4 border-green-500 text-green-700 p-2 rounded"
          >
            <p>Your settings have been saved.</p>
          </div>
          <div class="ml-auto flex gap-5">
            <button
              class="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 text-center rounded min-w-[120px]"
              @click.prevent="reset"
            >
              Reset
            </button>
            <button
              class="bg-blue-600 hover:bg-blue-800 text-white relative font-bold py-2 px-4 text-center rounded min-w-[120px] disabled:bg-gray-500"
              :class="{
                'cursor-not-allowed': !dirty,
                'active:scale-[0.9]': dirty,
              }"
              :disabled="!dirty"
              type="submit"
            >
              Save
            </button>
          </div>
        </div>

        <!-- MAIN SETTINGS -->
        <fieldset class="form-group focus-within:shadow-lg">
          <div
            class="form-group-header text-xl font-bold bg-rym-gradient text-white p-3"
          >
            Main settings
          </div>

          <div
            class="form-group-body border-x-2 border-b-2 p-3 flex flex-col gap-3 border-gray-300 dark:border-gray-700"
          >
            <!-- LAST.FM API KEY -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-label font-bold">
                <label for="lastfmApiKey">Last.fm API Key</label>
              </div>
              <div class="form-input">
                <input
                  id="lastfmApiKey"
                  v-model="options.lastfmApiKey"
                  type="text"
                  name="lastfmApiKey"
                  min="32"
                  max="32"
                  class="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded"
                  @focus="(e) => e.target.select()"
                >
              </div>
              <div class="form-hint text-sm">
                <p>
                  Click
                  <a
                    href="https://www.last.fm/api/account/create"
                    class="text-blue-600 font-bold hover:underline"
                    target="_blank"
                  >here</a>
                  to create a Last.fm API Key.
                  <code><strong>"Application name"</strong></code> field is
                  enough.
                </p>
              </div>
            </div>

            <!-- LAST.FM USERNAME -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-label font-bold">
                <label for="lastfmUsername">Last.fm Username</label>
              </div>
              <div class="form-input">
                <input
                  id="lastfmUsername"
                  v-model="options.lastfmUsername"
                  type="text"
                  class="w-full bg-gray-200 dark:bg-gray-800 p-2 rounded"
                  name="lastfmUsername"
                >
              </div>
            </div>
          </div>
        </fieldset>

        <!-- STATS -->
        <fieldset
          class="form-group"
          :class="{
            'pointer-events-none opacity-50':
              options.lastfmApiKey.length !== 32,
          }"
        >
          <div
            class="form-group-header text-xl font-bold bg-rym-gradient text-white p-3"
          >
            Last.fm Stats
          </div>

          <div
            class="form-group-body border-x-2 border-b-2 p-3 flex flex-col gap-3 border-gray-300 dark:border-gray-700"
          >
            <!-- ARTIST STATS -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-input">
                <div class="flex items-center space-x-2">
                  <label
                    for="artistStats"
                    class="flex items-center cursor-pointer gap-2"
                  >
                    <div class="relative">
                      <input
                        id="artistStats"
                        v-model="options.artistStats"
                        type="checkbox"
                        class="sr-only peer"
                      >
                      <div
                        class="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-focus-visible:ring-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-800 peer-checked:bg-blue-600"
                        :title="`Click to ${options.artistStats ? 'disable' : 'enable'}`"
                      />
                    </div>
                    <span class="text-lg font-bold">Artist page</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- RELEASE STATS -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-input">
                <div class="flex items-center space-x-2">
                  <label
                    for="releaseStats"
                    class="flex items-center cursor-pointer gap-2"
                  >
                    <div class="relative">
                      <input
                        id="releaseStats"
                        v-model="options.releaseStats"
                        type="checkbox"
                        class="sr-only peer"
                      >
                      <div
                        class="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-focus-visible:ring-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-800 peer-checked:bg-blue-600"
                      />
                    </div>
                    <span class="text-lg font-bold">Release page</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- PROFILE -->
        <fieldset
          class="form-group focus-within:shadow-lg"
          :class="{
            'pointer-events-none opacity-50':
              options.lastfmApiKey.length !== 32,
          }"
        >
          <div
            class="form-group-header text-xl font-bold bg-rym-gradient text-white p-3 flex justify-between items-center"
          >
            Profile
            <div class="group relative">
              <div
                class="w-5 h-5 rounded-full bg-white text-center text-blue-500 text-sm cursor-pointer"
              >
                ?
              </div>
              <div
                class="absolute right-0 transform mt-2 w-max p-3 bg-gray-700 text-white text-sm rounded hidden group-hover:flex flex-col gap-2 max-w-[250px]"
              >
                <p>
                  If you want to display this on your profile, add your Last.fm
                  username to the Main settings.
                </p>
                <p>
                  As a fallback, extension scans every User Profile for any
                  Last.fm link and uses it.
                </p>
              </div>
            </div>
          </div>

          <div
            class="form-group-body border-x-2 border-b-2 p-3 flex flex-col gap-3 border-gray-300 dark:border-gray-700"
          >
            <!-- RECENT TRACKS -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-input">
                <div class="flex items-center space-x-2">
                  <label
                    for="recentTracks"
                    class="flex items-center cursor-pointer gap-2"
                  >
                    <div class="relative">
                      <input
                        id="recentTracks"
                        v-model="options.recentTracks"
                        type="checkbox"
                        class="sr-only peer"
                      >
                      <div
                        class="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-focus-visible:ring-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-800 peer-checked:bg-blue-600"
                      />
                    </div>
                    <span class="text-lg font-bold">Recent tracks</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- RECENT TRACKS LIMIT -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-label font-bold">
                <label for="recentTracksLimit">Recent tracks limit ({{
                  constants.RECENT_TRACKS_LIMIT_MIN
                }}-{{ constants.RECENT_TRACKS_LIMIT_MAX }})</label>
              </div>
              <div class="form-input">
                <div class="form-range flex items-center gap-2">
                  <input
                    id="recentTracksLimit"
                    v-model="options.recentTracksLimit"
                    type="range"
                    name="recentTracksLimit"
                    class="w-[300px]"
                    :min="constants.RECENT_TRACKS_LIMIT_MIN"
                    :max="constants.RECENT_TRACKS_LIMIT_MAX"
                    :disabled="options.recentTracks === false"
                  >
                  <span
                    class="bg-gray-200 dark:bg-gray-800 py-2 px-4 rounded"
                  >{{ options.recentTracksLimit }}</span>
                </div>
              </div>
            </div>

            <!-- TOP ALBUMS -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-input">
                <div class="flex items-center space-x-2">
                  <label
                    for="topAlbums"
                    class="flex items-center cursor-pointer gap-2"
                  >
                    <div class="relative">
                      <input
                        id="topAlbums"
                        v-model="options.topAlbums"
                        type="checkbox"
                        class="sr-only peer"
                      >
                      <div
                        class="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-focus-visible:ring-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-800 peer-checked:bg-blue-600"
                      />
                    </div>
                    <span class="text-lg font-bold">Top albums</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- TOP ALBUMS LIMIT -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-label font-bold">
                <label for="topAlbumsLimit">Top albums limit ({{ constants.TOP_ALBUMS_LIMIT_MIN }}-{{
                  constants.TOP_ALBUMS_LIMIT_MAX
                }})</label>
              </div>
              <div class="form-input">
                <div class="form-range flex items-center gap-2">
                  <input
                    id="topAlbumsLimit"
                    v-model="options.topAlbumsLimit"
                    type="range"
                    class="w-[300px]"
                    name="topAlbumsLimit"
                    :min="constants.TOP_ALBUMS_LIMIT_MIN"
                    :max="constants.TOP_ALBUMS_LIMIT_MAX"
                    :disabled="options.topAlbums === false"
                  >
                  <span
                    class="bg-gray-200 dark:bg-gray-800 py-2 px-4 rounded"
                  >{{ options.topAlbumsLimit }}</span>
                </div>
              </div>
            </div>

            <!-- TOP ALBUMS PERIOD -->
            <div class="form-item flex flex-col gap-1">
              <div class="form-label font-bold">
                <label for="topAlbumsPeriod">Top albums default period</label>
              </div>
              <div class="form-input">
                <div class="form-select">
                  <select
                    id="topAlbumsPeriod"
                    v-model="options.topAlbumsPeriod"
                    name="topAlbumsPeriod"
                    class="w-full bg-gray-200 dark:bg-gray-800 p-2 h-10 rounded"
                  >
                    <option
                      v-for="item in constants.TOP_ALBUMS_PERIOD_OPTIONS"
                      :key="item.value"
                      :value="item.value"
                    >
                      {{ item.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        <div class="form-actions flex justify-between gap-5">
          <div
            v-if="saved"
            class="bg-green-100 grow border-l-4 border-green-500 text-green-700 p-2 rounded"
          >
            <p>Your settings have been saved.</p>
          </div>
          <div class="ml-auto flex gap-5">
            <button
              class="bg-red-600 hover:bg-red-800 text-white font-bold py-2 px-4 text-center rounded min-w-[120px]"
              @click.prevent="reset"
            >
              Reset
            </button>
            <button
              class="bg-blue-600 hover:bg-blue-800 text-white relative font-bold py-2 px-4 text-center rounded min-w-[120px] disabled:bg-gray-500"
              :class="{
                'cursor-not-allowed': !dirty,
                'active:scale-[0.9]': dirty,
              }"
              :disabled="!dirty"
              type="submit"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>

  <footer
    class="flex flex-col items-center bg-gray-200 dark:bg-gray-800 py-6 gap-2"
  >
    <div class="flex gap-8">
      <a
        href="https://open.spotify.com/user/11139279910/playlists"
        class="text-blue-500 font-bold hover:underline"
        target="_blank"
      >Impressive Sound</a>
      <a
        href="https://rateyourmusic.com/~Landen"
        class="text-blue-500 font-bold hover:underline"
        target="_blank"
      >My RYM Profile</a>
      <a
        href="https://www.linkedin.com/in/dukhevych/"
        class="text-blue-500 font-bold hover:underline"
        target="_blank"
      >LinkedIn</a>
    </div>
    <div>{{ new Date().getFullYear() }} &copy; Landen</div>
  </footer>
</template>

<script setup>
  import { ref, reactive, watch } from 'vue';
  import * as utils from '@/helpers/utils.js';
  import * as constants from '@/helpers/constants.js';

  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  const loading = ref(true);
  const options = reactive(Object.assign({}, constants.OPTIONS_DEFAULT));

  const config = ref(null);
  const saved = ref(false);
  const dirty = ref(false);

  const submit = async () => {
    await browserAPI.storage.sync.set(JSON.parse(JSON.stringify(options)));
    saved.value = true;
    dirty.value = false;
  };

  const reset = async () => {
    const doConfirm = confirm('Are you sure you want to reset all settings?');
    if (!doConfirm) return;
    Object.assign(options, constants.OPTIONS_DEFAULT);
    await submit();
  };

  utils.getStorageItems().then((items) => {
    config.value = items;
    Object.assign(options, config.value);

    watch(
      () => options,
      () => {
        saved.value = false;
        dirty.value = true;
      },
      { deep: true },
    );

    loading.value = false;
  });
</script>
