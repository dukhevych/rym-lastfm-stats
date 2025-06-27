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
  let progressLoopActive = false;
  let rafId: number = 0;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let isManuallyPaused = false;
  let isTabVisible = true;

  let lastStartTime = 0;
  let remainingTime = interval;

  let controller: AbortController | null = null;

  function isPollingAllowed(): boolean {
    return !isManuallyPaused && isTabVisible;
  }

  function getProgress(): number {
    return pollingProgress;
  }

  function startProgressLoop(): void {
    if (progressLoopActive) return;
    progressLoopActive = true;

    const loop = () => {
      if (!progressLoopActive) return;
      const now = Date.now();
      const elapsed = now - lastStartTime;
      pollingProgress = Math.min(elapsed / interval, 1);
      rafId = requestAnimationFrame(loop);
    };

    loop();
  }

  function stopProgressLoop(): void {
    progressLoopActive = false;
    cancelAnimationFrame(rafId);
  }

  function scheduleNextPoll(delay: number): void {
    lastStartTime = Date.now();
    remainingTime = delay;
    pollingProgress = 0;
    startProgressLoop();
    timerId = setTimeout(poll, delay);
  }

  async function poll(): Promise<void> {
    if (!isPollingAllowed()) return;

    stopProgressLoop();
    pollingProgress = 1; // optional: show full bar during execution

    if (enableAbort) {
      controller = new AbortController();
    }

    try {
      await fn(enableAbort && controller ? controller.signal : undefined);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        console.warn("[polling] Aborted async fn due to visibility change");
      } else {
        console.error("[polling] fn error:", e);
      }
    } finally {
      controller = null;
      if (isPollingAllowed()) {
        scheduleNextPoll(interval);
      }
    }
  }

  function pauseTimer(): void {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
      const elapsed = Date.now() - lastStartTime;
      remainingTime = Math.max(interval - elapsed, 0);
    }

    if (enableAbort && controller) {
      controller.abort();
    }

    stopProgressLoop();
  }

  function resumeTimer(): void {
    if (remainingTime <= 0) {
      void poll();
    } else {
      scheduleNextPoll(remainingTime);
    }
  }

  function pauseManual(): void {
    isManuallyPaused = true;
    pauseTimer();
  }

  function resumeManual(): void {
    isManuallyPaused = false;
    if (isTabVisible) resumeTimer();
  }

  function handleVisibilityChange(): void {
    isTabVisible = document.visibilityState === "visible";
    if (!isManuallyPaused) {
      if (isTabVisible) {
        resumeTimer();
      } else {
        pauseTimer();
      }
    }
  }

  function start(): void {
    if (timerId !== null) return;

    if (isPollingAllowed()) {
      scheduleNextPoll(interval);
    } else {
      const onVisible = () => {
        if (isPollingAllowed() && timerId === null) {
          void poll();
        }
        document.removeEventListener("visibilitychange", onVisible);
      };

      document.addEventListener("visibilitychange", onVisible);
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    start,
    pauseManual,
    resumeManual,
    stop: pauseTimer,
    isRunning: isPollingAllowed,
    getProgress,
    cleanup() {
      pauseTimer();
      stopProgressLoop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    },
  };
}
