type PollingCallback = (signal?: AbortSignal) => void | Promise<void>;

interface PollingOptions {
  interval?: number;
  enableAbort?: boolean;
  continueInBackground?: boolean;
}

export interface PollingController {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isRunning: () => boolean;
  cleanup: () => void;
  getProgress: () => number;
}

enum PollingState {
  STOPPED = 'stopped',
  RUNNING = 'running',
  PAUSED = 'paused',
  EXECUTING = 'executing',
  READY_TO_EXECUTE = 'ready_to_execute'
}

export function createAccuratePolling(
  callback: PollingCallback,
  options: PollingOptions = {}
): PollingController {
  const { interval = 15000, enableAbort = false, continueInBackground = false } = options;

  let state = PollingState.STOPPED;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  // Progress tracking
  let progressStartTime = 0;
  let progressDuration = interval;
  let pausedProgress = 0;

  // Visibility tracking
  let isTabVisible = document.visibilityState === 'visible';
  let isManuallyPaused = false;

  function shouldPoll(): boolean {
    return !isManuallyPaused && (continueInBackground || isTabVisible);
  }

  function shouldExecute(): boolean {
    return !isManuallyPaused && isTabVisible;
  }

  function getProgress(): number {
    if (state === PollingState.STOPPED) return 0;
    if (state === PollingState.EXECUTING) return 1;
    if (state === PollingState.PAUSED) return pausedProgress;
    if (state === PollingState.READY_TO_EXECUTE) return 1;

    // Calculate current progress for running state
    const elapsed = Date.now() - progressStartTime;
    return Math.min(elapsed / progressDuration, 1);
  }

  function clearTimer(): void {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function abortExecution(): void {
    if (enableAbort && abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  async function executeCallback(): Promise<void> {
    if (!shouldExecute()) {
      // Timer finished but we can't execute yet - wait for tab to become visible
      state = PollingState.READY_TO_EXECUTE;
      return;
    }

    state = PollingState.EXECUTING;

    if (enableAbort) {
      abortController = new AbortController();
    }

    try {
      await callback(enableAbort ? abortController?.signal : undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn('[Polling] Execution aborted');
      } else {
        console.error('[Polling] Callback error:', error);
      }
    } finally {
      abortController = null;

      // Only continue if we're still supposed to be running
      if ((state === PollingState.EXECUTING) && shouldPoll()) {
        scheduleNext();
      } else if (state === PollingState.EXECUTING) {
        // We were paused/stopped during execution
        state = PollingState.PAUSED;
        pausedProgress = 0;
      }
    }
  }

  function scheduleNext(): void {
    if (!shouldPoll()) {
      pauseInternal();
      return;
    }

    state = PollingState.RUNNING;
    progressStartTime = Date.now();
    progressDuration = interval;
    pausedProgress = 0;

    timerId = setTimeout(() => {
      executeCallback();
    }, interval);
  }

  function pauseInternal(): void {
    if (state === PollingState.STOPPED || state === PollingState.PAUSED) return;

    clearTimer();
    abortExecution();

    // Save progress if we were running
    if (state === PollingState.RUNNING) {
      const elapsed = Date.now() - progressStartTime;
      pausedProgress = Math.min(elapsed / progressDuration, 1);
    } else if (state === PollingState.READY_TO_EXECUTE) {
      // Keep progress at 100% when ready to execute
      pausedProgress = 1;
    }

    state = PollingState.PAUSED;
  }

  function resumeInternal(): void {
    if (state !== PollingState.PAUSED && state !== PollingState.READY_TO_EXECUTE) return;
    if (!shouldPoll()) return;

    // If we were ready to execute, do it immediately
    if (state === PollingState.READY_TO_EXECUTE || pausedProgress >= 1) {
      executeCallback();
      return;
    }

    // Calculate remaining time based on saved progress
    const remainingTime = Math.max((1 - pausedProgress) * interval, 0);

    if (remainingTime <= 0) {
      executeCallback();
    } else {
      // Resume with remaining time
      state = PollingState.RUNNING;
      progressStartTime = Date.now() - (pausedProgress * interval);
      progressDuration = interval;

      timerId = setTimeout(() => {
        executeCallback();
      }, remainingTime);
    }
  }

  function handleVisibilityChange(): void {
    const wasVisible = isTabVisible;
    isTabVisible = document.visibilityState === 'visible';

    // Only act if visibility actually changed and we're not manually paused
    if (wasVisible === isTabVisible || isManuallyPaused) return;

    if (isTabVisible) {
      // If we were ready to execute, do it now
      if (state === PollingState.READY_TO_EXECUTE) {
        executeCallback();
      } else if (!continueInBackground) {
        // Only resume if we don't continue in background
        resumeInternal();
      }
    } else {
      // Tab became inactive
      if (!continueInBackground) {
        pauseInternal();
      }
      // If continueInBackground is true, we let the timer continue running
    }
  }

  // Public API
  function start(): void {
    if (state !== PollingState.STOPPED) return;

    isManuallyPaused = false;

    if (shouldPoll()) {
      scheduleNext();
    } else {
      state = PollingState.PAUSED;
      pausedProgress = 0;
    }
  }

  function pause(): void {
    isManuallyPaused = true;
    pauseInternal();
  }

  function resume(): void {
    isManuallyPaused = false;
    resumeInternal();
  }

  function stop(): void {
    clearTimer();
    abortExecution();
    state = PollingState.STOPPED;
    pausedProgress = 0;
    isManuallyPaused = false;
  }

  function isRunning(): boolean {
    return state === PollingState.RUNNING ||
           state === PollingState.EXECUTING ||
           state === PollingState.READY_TO_EXECUTE;
  }

  function cleanup(): void {
    stop();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  // Set up event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    start,
    pause,
    resume,
    stop,
    isRunning,
    getProgress,
    cleanup
  };
}