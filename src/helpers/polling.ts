// polling.ts

type PollingCallback = (signal?: AbortSignal) => void | Promise<void>;

interface PollingOptions {
  interval?: number;
  enableAbort?: boolean;
}

export interface PollingController {
  start: () => void;
  pauseManual: () => void;
  resumeManual: () => void;
  stop: () => void;
  isRunning: () => boolean;
  cleanup: () => void;
  getProgress: () => number;
}

export function createAccuratePolling(
  fn: PollingCallback,
  options: PollingOptions = {}
): PollingController {
  const { interval = 15000, enableAbort = false } = options;

  let pollingProgress = 0;
  let rafId: number;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let isManuallyPaused = false;
  let isTabVisible = true;
  let isStarted = false;
  let lastStartTime = 0;
  let remainingTime = interval;

  function getProgress() {
    return pollingProgress;
  }

  function startProgressLoop() {
    cancelAnimationFrame(rafId);
    const loop = () => {
      const now = Date.now();
      const elapsed = now - lastStartTime;
      pollingProgress = Math.min(elapsed / interval, 1);
      rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopProgressLoop() {
    cancelAnimationFrame(rafId);
  }

  function isAllowed() {
    return !isManuallyPaused && isTabVisible;
  }

  async function doFetch() {
    // 1. Stop showing the waiting progress
    stopProgressLoop();

    // 2. Run your async operation
    if (enableAbort) controller = new AbortController();
    try {
      await fn(controller?.signal);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('[polling] fetch aborted');
      } else {
        console.error('[polling] fetch error', e);
      }
    } finally {
      controller = null;
    }

    // 3. Schedule the next wait → fetch cycle
    if (!isAllowed()) return;
    lastStartTime = Date.now();
    pollingProgress = 0;
    startProgressLoop();
    timerId = setTimeout(doFetch, interval);
  }

  function start() {
    if (isStarted) return;
    isStarted = true;
    if (!isAllowed()) {
      // wait until visible
      const onVis = () => {
        if (isAllowed()) {
          document.removeEventListener('visibilitychange', onVis);
          start();
        }
      };
      document.addEventListener('visibilitychange', onVis);
      return;
    }
    // kick off the very first wait → fetch cycle
    lastStartTime = Date.now();
    pollingProgress = 0;
    startProgressLoop();
    timerId = setTimeout(doFetch, interval);
  }

  function pauseTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
      const elapsed = Date.now() - lastStartTime;
      remainingTime = Math.max(interval - elapsed, 0);
      stopProgressLoop();
    }
    if (enableAbort && controller) controller.abort();
  }

  function resumeTimer() {
    if (!isAllowed()) return;
    lastStartTime = Date.now() - (interval - remainingTime);
    startProgressLoop();
    timerId = setTimeout(doFetch, remainingTime);
  }

  function pauseManual() {
    isManuallyPaused = true;
    pauseTimer();
  }
  function resumeManual() {
    isManuallyPaused = false;
    resumeTimer();
  }

  function handleVisChange() {
    isTabVisible = document.visibilityState === 'visible';
    if (isManuallyPaused) return;
    if (isTabVisible) resumeTimer();
    else pauseTimer();
  }

  document.addEventListener('visibilitychange', handleVisChange);

  return {
    start,
    pauseManual,
    resumeManual,
    stop: pauseTimer,
    isRunning: isAllowed,
    getProgress,
    cleanup() {
      pauseTimer();
      stopProgressLoop();
      document.removeEventListener('visibilitychange', handleVisChange);
    },
  };
}

