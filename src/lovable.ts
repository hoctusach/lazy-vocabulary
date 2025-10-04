import { toast as defaultToast } from '@/hooks/use-toast';

const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_BROADCAST_CHANNEL = 'lovable:latest-message';
const DEFAULT_BROADCAST_FAILURE_THRESHOLD = 3;

type ToastInvoker = typeof defaultToast;
type ToastPayload = Parameters<ToastInvoker>[0];

type Logger = Pick<Console, 'warn' | 'error'>;

type LovableBroadcastFailureReason = 'unsupported' | 'init-error' | 'post-message-error';
type LovableBroadcastDisableReason = 'manual' | 'threshold' | 'unsupported' | 'init-error';

export interface LovableBroadcastFailureContext {
  channelName: string;
  projectId: string;
  failureCount: number;
  reason: LovableBroadcastFailureReason;
  disable: (reason?: LovableBroadcastDisableReason) => void;
}

export interface LovableBroadcastDisabledInfo {
  channelName: string;
  projectId: string;
  reason: LovableBroadcastDisableReason;
  failureCount: number;
  error?: unknown;
}

export interface LovableBroadcastOptions {
  channelName?: string;
  disabled?: boolean;
  maxConsecutiveFailures?: number;
  logger?: Logger;
  onFailure?: (error: unknown, context: LovableBroadcastFailureContext) => void;
  onDisabled?: (info: LovableBroadcastDisabledInfo) => void;
}

interface NormalizedBroadcastOptions {
  channelName: string;
  disabled: boolean;
  maxConsecutiveFailures: number;
  logger: Logger;
  onFailure?: LovableBroadcastOptions['onFailure'];
  onDisabled?: LovableBroadcastOptions['onDisabled'];
}

interface BroadcastState {
  channel: BroadcastChannel | null;
  disabled: boolean;
  failureCount: number;
  options: NormalizedBroadcastOptions;
  lastProjectId?: string;
}

const broadcastStates = new Map<string, BroadcastState>();

export interface FetchLatestMessageOptions {
  retries?: number;
  retryDelayMs?: number | ((attempt: number) => number);
  toastOnHttpError?: boolean | Partial<ToastPayload>;
  toastFn?: ToastInvoker;
  logger?: Logger;
  signal?: AbortSignal;
  fetchImplementation?: typeof fetch;
  broadcast?: boolean | LovableBroadcastOptions;
}

export async function fetchLatestMessage(
  projectId: string,
  options: FetchLatestMessageOptions = {}
) {
  return fetchLatestMessageWithOptions(projectId, options);
}

function fetchLatestMessageWithOptions(
  projectId: string,
  {
    retries = DEFAULT_RETRY_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    toastOnHttpError = true,
    toastFn = defaultToast,
    logger = console,
    signal,
    fetchImplementation,
    broadcast
  }: FetchLatestMessageOptions = {}
): Promise<unknown | null> {
  const fetchFn = fetchImplementation ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    logger.warn?.(
      '[Lovable] fetchLatestMessage cannot run because the Fetch API is unavailable in this environment.'
    );
    return Promise.resolve(null);
  }

  const normalizedBroadcast = normalizeBroadcastOptions(broadcast);
  const attempts = Math.max(1, Math.floor(retries) + 1);
  const url = `https://lovable-api.com/projects/${projectId}/latest-message`;

  let lastError: unknown = null;
  let hasShownHttpWarning = false;

  const attemptFetch = async (attemptIndex: number): Promise<unknown | null> => {
    const attemptNumber = attemptIndex + 1;
    const isFinalAttempt = attemptNumber >= attempts;

    try {
      const response = await fetchFn(url, {
        headers: { Accept: 'application/json' },
        mode: 'cors',
        signal
      } as RequestInit);

      if (response.status >= 400) {
        if (!hasShownHttpWarning) {
          notifyHttpError(
            response.status,
            projectId,
            toastOnHttpError,
            toastFn,
            logger
          );
          hasShownHttpWarning = true;
        } else {
          logger.warn?.(
            `[Lovable] Latest message request for project ${projectId} failed again with status ${response.status} (attempt ${attemptNumber}).`
          );
        }

        if (!isFinalAttempt) {
          await waitForRetry(retryDelayMs, attemptNumber);
          return attemptFetch(attemptIndex + 1);
        }
        lastError = new Error(`HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (normalizedBroadcast) {
        maybeBroadcastLatestMessage(projectId, data, normalizedBroadcast);
      }
      return data;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error;
      logger.warn?.(
        `[Lovable] Latest message fetch attempt ${attemptNumber} failed for project ${projectId}.`,
        error
      );

      if (!isFinalAttempt) {
        await waitForRetry(retryDelayMs, attemptNumber);
        return attemptFetch(attemptIndex + 1);
      }
    }

    return null;
  };

  return attemptFetch(0).then(result => {
    if (result === null && lastError) {
      logger.error?.('Failed to load latest message:', lastError);
    }
    return result;
  });
}

function notifyHttpError(
  status: number,
  projectId: string,
  toastSetting: boolean | Partial<ToastPayload> | undefined,
  toastFn: ToastInvoker | undefined,
  logger: Logger
) {
  const message = `[Lovable] Latest message request for project ${projectId} failed with status ${status}.`;
  let toastDisplayed = false;

  if (toastSetting !== false && typeof window !== 'undefined' && typeof toastFn === 'function') {
    const override = typeof toastSetting === 'object' && toastSetting !== null ? toastSetting : {};
    try {
      const payload: ToastPayload = {
        title: override.title ?? 'Unable to fetch updates',
        description:
          override.description ??
          `Lovable responded with status ${status}. We'll retry shortly.`,
        variant: override.variant ?? 'destructive'
      } as ToastPayload;
      toastFn(payload);
      toastDisplayed = true;
    } catch (error) {
      logger.warn?.('[Lovable] Failed to display toast notification for Lovable errors.', error);
    }
  }

  logger.warn?.(message);

  if (!toastDisplayed && toastSetting === false) {
    return;
  }
}

function normalizeBroadcastOptions(
  broadcast: boolean | LovableBroadcastOptions | undefined
): NormalizedBroadcastOptions | null {
  if (broadcast === false) return null;

  const options =
    typeof broadcast === 'object' && broadcast !== null ? broadcast : ({} as LovableBroadcastOptions);

  const maxFailuresRaw = options.maxConsecutiveFailures;
  const maxConsecutiveFailures =
    typeof maxFailuresRaw === 'number' && Number.isFinite(maxFailuresRaw) && maxFailuresRaw > 0
      ? Math.floor(maxFailuresRaw)
      : DEFAULT_BROADCAST_FAILURE_THRESHOLD;

  return {
    channelName: options.channelName ?? DEFAULT_BROADCAST_CHANNEL,
    disabled: options.disabled ?? false,
    maxConsecutiveFailures,
    logger: options.logger ?? console,
    onFailure: options.onFailure,
    onDisabled: options.onDisabled
  };
}

function getBroadcastState(options: NormalizedBroadcastOptions): BroadcastState {
  let state = broadcastStates.get(options.channelName);
  if (!state) {
    state = {
      channel: null,
      disabled: false,
      failureCount: 0,
      options,
      lastProjectId: undefined
    };
    broadcastStates.set(options.channelName, state);
  } else {
    state.options = options;
  }
  return state;
}

function disableBroadcastState(
  state: BroadcastState,
  projectId: string,
  reason: LovableBroadcastDisableReason,
  error?: unknown
): boolean {
  if (state.disabled) return false;
  state.disabled = true;

  if (state.channel) {
    try {
      state.channel.close();
    } catch {
      // ignore channel closing failures
    }
    state.channel = null;
  }

  state.options.logger.warn?.(
    `[Lovable] Broadcast disabled for channel "${state.options.channelName}" (${reason}).`,
    error
  );

  state.options.onDisabled?.({
    channelName: state.options.channelName,
    projectId,
    reason,
    failureCount: state.failureCount,
    error
  });

  return true;
}

function maybeBroadcastLatestMessage(
  projectId: string,
  payload: unknown,
  options: NormalizedBroadcastOptions
) {
  const state = getBroadcastState(options);
  state.lastProjectId = projectId;

  if (options.disabled || state.disabled) {
    return;
  }

  const disable = (
    reason: LovableBroadcastDisableReason = 'manual',
    error?: unknown
  ): boolean => disableBroadcastState(state, projectId, reason, error);

  const handleFailure = (reason: LovableBroadcastFailureReason, error?: unknown) => {
    state.failureCount += 1;
    options.logger.warn?.(
      `[Lovable] Broadcast message failed (${reason}) on channel "${options.channelName}" (failure #${state.failureCount}).`,
      error
    );

    options.onFailure?.(error, {
      channelName: options.channelName,
      projectId,
      failureCount: state.failureCount,
      reason,
      disable: disable
    });

    if (reason === 'unsupported' || reason === 'init-error') {
      disable(reason, error);
      return;
    }

    if (state.failureCount >= options.maxConsecutiveFailures) {
      disable('threshold', error);
    }
  };

  if (typeof globalThis === 'undefined' || typeof globalThis.BroadcastChannel === 'undefined') {
    handleFailure('unsupported');
    return;
  }

  if (!state.channel) {
    try {
      state.channel = new globalThis.BroadcastChannel(options.channelName);
    } catch (error) {
      handleFailure('init-error', error);
      return;
    }
  }

  try {
    state.channel.postMessage({
      projectId,
      payload,
      timestamp: Date.now()
    });
    state.failureCount = 0;
  } catch (error) {
    handleFailure('post-message-error', error);
  }
}

function waitForRetry(delaySetting: number | ((attempt: number) => number), attemptNumber: number) {
  const delayMs = computeRetryDelay(delaySetting, attemptNumber);
  if (!delayMs || delayMs <= 0) {
    return Promise.resolve();
  }
  return new Promise<void>(resolve => {
    setTimeout(resolve, delayMs);
  });
}

function computeRetryDelay(delaySetting: number | ((attempt: number) => number), attemptNumber: number) {
  if (typeof delaySetting === 'function') {
    const value = Number(delaySetting(attemptNumber));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  const numericDelay = Number(delaySetting);
  if (!Number.isFinite(numericDelay) || numericDelay <= 0) {
    return 0;
  }

  return Math.round(numericDelay * Math.pow(2, attemptNumber - 1));
}

function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'AbortError'
  ) {
    return true;
  }
  return typeof error === 'object' && (error as { name?: string }).name === 'AbortError';
}
