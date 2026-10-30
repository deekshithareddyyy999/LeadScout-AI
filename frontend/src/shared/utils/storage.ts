export function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode, quota); the app still works in memory.
  }
}

export function removeKey(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // See writeJson.
  }
}
