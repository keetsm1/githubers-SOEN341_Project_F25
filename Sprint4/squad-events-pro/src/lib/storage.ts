export type StorageScope = 'local' | 'session';

function getStore(scope: StorageScope): Storage {
    if (typeof window === 'undefined') return {
        // SSR/No-Window fallback shim
        getItem: () => null,
        setItem: () => void 0,
        removeItem: () => void 0,
        clear: () => void 0,
        key: () => null,
        length: 0,
    } as unknown as Storage;

    return scope === 'session' ? window.sessionStorage : window.localStorage;
}

export function readJSON<T>(key: string, fallback: T, scope: StorageScope = 'local'): T {
    try {
        const raw = getStore(scope).getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function writeJSON<T>(key: string, value: T, scope: StorageScope = 'local'): void {
    try {
        getStore(scope).setItem(key, JSON.stringify(value));
    } catch {
        // quota or privacy mode — silently ignore
    }
}

export function removeKey(key: string, scope: StorageScope = 'local'): void {
    try {
        getStore(scope).removeItem(key);
    } catch {}
}
