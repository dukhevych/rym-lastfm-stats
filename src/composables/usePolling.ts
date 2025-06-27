// usePolling.ts
import { writable, type Writable } from 'svelte/store';
import { createAccuratePolling } from '@/helpers/polling';

export function usePolling(
  fn: (signal?: AbortSignal) => void | Promise<void>,
  interval = 15000,
  enableAbort = true
) {
  const progress: Writable<number> = writable(0);

  const polling = createAccuratePolling(fn, {
    interval,
    enableAbort,
  });

  // Watch progress in real-time
  let rafId: number = 0;

  function startProgressWatcher() {
    cancelAnimationFrame(rafId);

    const loop = () => {
      progress.set(polling.getProgress());
      rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  function stopProgressWatcher() {
    cancelAnimationFrame(rafId);
  }

  return {
    start() {
      polling.start();
      startProgressWatcher();
    },
    pause: polling.pauseManual,
    resume: polling.resumeManual,
    stop() {
      polling.stop();
      stopProgressWatcher();
    },
    isRunning: polling.isRunning,
    progress,
    cleanup() {
      polling.cleanup();
      stopProgressWatcher();
    },
  };
}
