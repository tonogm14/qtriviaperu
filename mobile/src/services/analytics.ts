import { api } from './api';

type EventPayload = {
  type: string;
  screen?: string;
  action?: string;
  meta?: Record<string, unknown>;
  ts: number;
};

const BATCH_SIZE = 10;
const BATCH_INTERVAL_MS = 30_000;

let queue: EventPayload[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let authed = false;

export function setAnalyticsAuth(authenticated: boolean) {
  authed = authenticated;
  if (!authenticated) {
    queue = [];
    if (timer) { clearTimeout(timer); timer = null; }
  }
}

export function track(
  type: string,
  screen?: string,
  action?: string,
  meta?: Record<string, unknown>
) {
  if (!authed) return;
  queue.push({ type, screen, action, meta, ts: Date.now() });
  if (queue.length >= BATCH_SIZE) {
    flush();
  } else if (!timer) {
    timer = setTimeout(flush, BATCH_INTERVAL_MS);
  }
}

export async function flush() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!authed || queue.length === 0) return;
  const events = queue.splice(0, 50);
  try {
    await api.post('/api/activity/batch', { events });
  } catch {
    // silently drop — analytics must never affect UX
  }
}
