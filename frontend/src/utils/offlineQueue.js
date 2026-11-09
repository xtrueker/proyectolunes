const QUEUE_KEY = "agrored_offline_tracking_queue";
export const OFFLINE_QUEUE_EVENT = "agrored:offline-queue";

export function getOfflineTrackingQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

export function enqueueOfflineTracking(requestId, payload) {
  const current = getOfflineTrackingQueue();
  const entry = {
    localId: `${requestId}-${current.length + 1}`,
    requestId,
    payload,
    queuedAt: new Date().toISOString(),
  };
  saveQueue([...current, entry]);
  return entry;
}

export async function flushOfflineTrackingQueue(sendFn) {
  const queue = getOfflineTrackingQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    try {
      await sendFn(item.requestId, item.payload);
      synced += 1;
    } catch (error) {
      // Si sigue sin red, conservamos en cola; si es error 4xx definitivo, descartamos para no bloquear.
      if (!error.status || error.status >= 500) {
        remaining.push(item);
      }
    }
  }

  saveQueue(remaining);
  return { synced, remaining: remaining.length };
}

