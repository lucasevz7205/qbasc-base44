export const EMPTY_TUTOR_HISTORY = Object.freeze([]);
const prefix = 'qbasc-tutor-history:v1:';
const scoped = (account, topic) => prefix + JSON.stringify([account, topic]);

export function createTutorHistory(getStorage = () => globalThis.localStorage) {
  const cache = new Map();
  const pending = new Set();
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };

  function read(account, topic) {
    const key = scoped(account, topic);
    const previous = cache.get(key);
    if (previous?.volatile) return previous.messages;
    try {
      const serialized = getStorage().getItem(key);
      if (previous?.serialized === serialized) return previous.messages;
      const value = serialized ? JSON.parse(serialized) : EMPTY_TUTOR_HISTORY;
      const messages = Array.isArray(value) ? value : EMPTY_TUTOR_HISTORY;
      cache.set(key, { serialized, messages });
      return messages;
    } catch {
      return previous?.messages || EMPTY_TUTOR_HISTORY;
    }
  }

  function write(account, topic, messages) {
    const key = scoped(account, topic);
    const serialized = JSON.stringify(messages);
    let volatile = false;
    try { getStorage().setItem(key, serialized); }
    catch { volatile = true; }
    cache.set(key, { serialized, messages, volatile });
    notify();
  }

  return {
    read,
    append(account, topic, message) { write(account, topic, [...read(account, topic), message]); },
    clear(account, topic) {
      if (!pending.has(scoped(account, topic))) write(account, topic, EMPTY_TUTOR_HISTORY);
    },
    isPending(account, topic) { return pending.has(scoped(account, topic)); },
    begin(account, topic) {
      const key = scoped(account, topic);
      if (pending.has(key)) return false;
      pending.add(key);
      notify();
      return true;
    },
    finish(account, topic) {
      pending.delete(scoped(account, topic));
      notify();
    },
    lastTopic(account) {
      try { return getStorage().getItem(scoped(account, null)); }
      catch { return null; }
    },
    rememberTopic(account, topic) {
      try { getStorage().setItem(scoped(account, null), topic); }
      catch { /* The conversation remains available for the current session. */ }
    },
    subscribe(listener) {
      const onStorage = event => {
        if (event.key === null || event.key.startsWith(prefix)) listener();
      };
      listeners.add(listener);
      globalThis.addEventListener?.('storage', onStorage);
      return () => {
        listeners.delete(listener);
        globalThis.removeEventListener?.('storage', onStorage);
      };
    },
  };
}

export const tutorHistory = createTutorHistory();
