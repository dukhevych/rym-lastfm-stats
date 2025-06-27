import { writable, type Writable } from 'svelte/store';
import { createAccuratePolling } from '@/helpers/polling';

export function usePolling(
  fn: (signal?: AbortSignal) => void | Promise<void>,
  interval = 15000,
  enableAbort = true
) {
  const progress: Writable<number> = writable(0);
  const polling = createAccuratePolling(fn, { interval, enableAbort });

  let watcherRaf = 0;
  const updateLoop = () => {
    progress.set(polling.getProgress());
    watcherRaf = requestAnimationFrame(updateLoop);
  };

  function startWatcher() {
    if (!watcherRaf) updateLoop();
  }

  function stopWatcher() {
    if (watcherRaf) {
      cancelAnimationFrame(watcherRaf);
      watcherRaf = 0;
    }
  }

  function handleVisibility() {
    if (document.visibilityState === 'visible' && polling.isRunning()) {
      startWatcher();
    } else {
      stopWatcher();
    }
  }

  return {
    start() {
      polling.start();
      // kick off watcher only if poll is live AND tab is visible
      if (polling.isRunning() && document.visibilityState === 'visible') {
        startWatcher();
      }
      document.addEventListener('visibilitychange', handleVisibility);
    },
    pause() {
      polling.pauseManual();
      stopWatcher();
    },
    resume() {
      polling.resumeManual();
      if (document.visibilityState === 'visible') {
        startWatcher();
      }
    },
    stop() {
      polling.stop();      // stops timer & abort
      stopWatcher();
      document.removeEventListener('visibilitychange', handleVisibility);
    },
    isRunning: polling.isRunning,
    progress,
    cleanup() {
      polling.cleanup();
      stopWatcher();
      document.removeEventListener('visibilitychange', handleVisibility);
    },
  };
}
