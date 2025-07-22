import { writable } from 'svelte/store';
import { createAccuratePolling, type PollingController } from '@/helpers/polling';

export function usePolling(
  callback: (signal?: AbortSignal) => void | Promise<void>,
  interval = 15000,
  enableAbort = true,
  continueInBackground = false
) {
  const progress = writable(0);
  const isRunning = writable(false);

  const controller: PollingController = createAccuratePolling(callback, {
    interval,
    enableAbort,
    continueInBackground,
  });

  let rafId: number = 0;
  let isWatching = false;

  function startProgressWatcher(): void {
    if (isWatching) return;
    isWatching = true;

    const updateProgress = () => {
      if (!isWatching) return;

      progress.set(controller.getProgress());
      isRunning.set(controller.isRunning());

      rafId = requestAnimationFrame(updateProgress);
    };

    updateProgress();
  }

  function stopProgressWatcher(): void {
    isWatching = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  return {
    start() {
      controller.start();
      startProgressWatcher();
    },

    pause() {
      controller.pause();
    },

    resume() {
      controller.resume();
    },

    stop() {
      controller.stop();
      stopProgressWatcher();
      progress.set(0);
      isRunning.set(false);
    },

    cleanup() {
      controller.cleanup();
      stopProgressWatcher();
    },

    // Reactive stores
    progress,
    isRunning,

    // Getters for one-time values
    getProgress: () => controller.getProgress(),
    getIsRunning: () => controller.isRunning(),
  };
}
