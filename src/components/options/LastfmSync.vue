<template>
  <div>
    <div
      v-if="hasIncompleteDownload && !isDownloading"
      class="resume-notice"
    >
      <p>You have an incomplete download ({{ formatNumber(downloadProgress.downloaded) }} of {{ formatNumber(downloadProgress.total) }} scrobbles).</p>
      <button
        class="resume-btn"
        @click="resumeDownload"
      >
        Resume Download
      </button>
    </div>

    <div
      v-if="isDownloading"
      class="progress-container"
    >
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: progressPercentage + '%' }"
        />
      </div>
      <div class="progress-stats">
        <span>{{ formatNumber(downloadProgress.downloaded) }} / {{ formatNumber(downloadProgress.total) }} scrobbles</span>
        <span>{{ progressPercentage.toFixed(1) }}%</span>
      </div>
      <div
        v-if="downloadSpeed"
        class="download-speed"
      >
        <span>{{ downloadSpeed }} scrobbles/sec</span>
        <span>Estimated time remaining: {{ estimatedTimeRemaining }}</span>
      </div>
      <button
        class="stop-btn"
        @click="stopDownload"
      >
        Stop Download
      </button>
    </div>

    <div
      v-else
      class="action-buttons"
    >
      <button
        :disabled="!props.apiKey || isDownloading"
        class="start-btn"
        @click="startDownload"
      >
        Start Download
      </button>
    </div>

    <div
      v-if="errorMessage"
      class="error-message"
    >
      <p>{{ errorMessage }}</p>
    </div>

    <div
      v-if="isComplete"
      class="success-message"
    >
      <p>Successfully downloaded {{ formatNumber(downloadProgress.total) }} scrobbles!</p>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, reactive } from 'vue';

const props = defineProps({
  apiKey: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
});

const isDownloading = ref(false);
const hasIncompleteDownload = ref(false);
const isComplete = ref(false);
const errorMessage = ref('');
const downloadProgress = reactive({
  total: 0,
  downloaded: 0,
  page: 1
});
const lastUpdateTime = ref(null);
const lastDownloadedCount = ref(0);

const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Set up listeners for messages from background.js
const setupMessageListeners = () => {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'progress_update') {
      updateProgress(message.data);
    } else if (message.type === 'download_complete') {
      downloadComplete(message.data);
    } else if (message.type === 'download_error') {
      handleError(message.data.message);
    } else if (message.type === 'incomplete_download') {
      hasIncompleteDownload.value = true;
      Object.keys(downloadProgress).forEach((key) => {
        downloadProgress[key] = message.data[key];
      });
    }
  });
};

// Check current download status
const checkDownloadStatus = () => {
  chrome.runtime.sendMessage({ type: 'get_progress' }, (response) => {
    if (response && response.success) {
      const { isDownloading: _isDownloading, ...progress } = response.data;
      isDownloading.value = _isDownloading;
      Object.keys(downloadProgress).forEach((key) => {
        downloadProgress[key] = progress[key];
      });

      if (isDownloading.value) {
        hasIncompleteDownload.value = false;
        isComplete.value = false;
        errorMessage.value = '';
      } else if (progress.downloaded > 0 && progress.downloaded < progress.total) {
        hasIncompleteDownload.value = true;
      }
    }
  });
};

// Start the download process
const startDownload = () => {
  if (!props.apiKey) {
    errorMessage.value = 'Please enter your Last.fm API key';
    return;
  }

  errorMessage.value = '';
  isComplete.value = false;
  hasIncompleteDownload.value = false;

  chrome.runtime.sendMessage({
    type: 'start_download',
    data: {
      username: props.username,
      apiKey: props.apiKey
    }
  }, (response) => {
    if (response && response.success) {
      isDownloading.value = true;
      lastUpdateTime.value = Date.now();
      lastDownloadedCount.value = 0;
    }
  });
};

// Resume an incomplete download
const resumeDownload = () => {
  errorMessage.value = '';
  isComplete.value = false;

  chrome.runtime.sendMessage({ type: 'resume_download' }, (response) => {
    if (response && response.success) {
      isDownloading.value = true;
      hasIncompleteDownload.value = false;
      lastUpdateTime.value = Date.now();
      lastDownloadedCount.value = this.downloadProgress.downloaded;
    }
  });
};

// Stop the download process
const stopDownload = () => {
  chrome.runtime.sendMessage({ type: 'stop_download' }, (response) => {
    if (response && response.success) {
      isDownloading.value = false;
      hasIncompleteDownload.value = true;
    }
  });
};

// Update progress display
const updateProgress = (data) => {
  Object.keys(downloadProgress).forEach((key) => {
    downloadProgress[key] = data[key];
  });
  isDownloading.value = data.isDownloading;

  // Calculate download speed
  if (lastUpdateTime.value) {
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastUpdateTime.value) / 1000;

    if (timeDiff >= 1) { // Update at most once per second
      lastUpdateTime.value = currentTime;
      lastDownloadedCount.value = data.downloaded;
    }
  } else {
    lastUpdateTime.value = Date.now();
    lastDownloadedCount.value = data.downloaded;
  }
};

// Handle download completion
const downloadComplete = (data) => {
  isDownloading.value = false;
  hasIncompleteDownload.value = false;
  isComplete.value = true;
  downloadProgress.total = data.total;
  downloadProgress.downloaded = data.downloaded;
};

// Handle errors
const handleError = (message) => {
  errorMessage.value = message;
  isDownloading.value = false;
};

// Listen for progress updates
setupMessageListeners();

// Check current progress status
checkDownloadStatus();
</script>
