import * as React from 'react';
import { readJSON, writeJSON, removeKey, StorageScope } from '@/lib/storage';

export type SavedEventsHook = {
    savedIds: Set<string>;
    isSaved: (id: string) => boolean;
    save: (id: string) => void;
    unsave: (id: string) => void;
    toggle: (id: string) => void;
    clear: () => void;
    count: number;
};

const DEFAULT_SCOPE: StorageScope = 'local'; // persistent by default
const CHANNEL = 'saved-events-updated';

function keyFor(userId?: string) {
    // namespace per user; anonymous users share "guest"
    return `squad:saved-events:${userId || 'guest'}`;
}

/**
 * useSavedEvents
 * - Persists to localStorage (default) OR sessionStorage (pass scope)
 * - Cross-tab sync via "storage" and a custom DOM event CHANNEL
 */
export function useSavedEvents(userId?: string, scope: StorageScope = DEFAULT_SCOPE): SavedEventsHook {
    const storageKey = React.useMemo(() => keyFor(userId), [userId]);

    const [saved, setSaved] = React.useState<Set<string>>(() => {
        const initial = readJSON<string[]>(storageKey, [], scope);
        return new Set(initial);
    });

    // Write-through persistence
    const persist = React.useCallback((next: Set<string>) => {
        setSaved(new Set(next));
        writeJSON(storageKey, [...next], scope);
        // manual broadcast so same-tab listeners get notified too
        window.dispatchEvent(new CustomEvent(CHANNEL, { detail: { key: storageKey } }));
    }, [storageKey, scope]);

    // API
    const isSaved = React.useCallback((id: string) => saved.has(id), [saved]);
    const save = React.useCallback((id: string) => {
        const next = new Set(saved);
        next.add(id);
        persist(next);
    }, [saved, persist]);

    const unsave = React.useCallback((id: string) => {
        const next = new Set(saved);
        next.delete(id);
        persist(next);
    }, [saved, persist]);

    const toggle = React.useCallback((id: string) => {
        const next = new Set(saved);
        if (next.has(id)) next.delete(id); else next.add(id);
        persist(next);
    }, [saved, persist]);

    const clear = React.useCallback(() => {
        setSaved(new Set());
        removeKey(storageKey, scope);
        window.dispatchEvent(new CustomEvent(CHANNEL, { detail: { key: storageKey } }));
    }, [storageKey, scope]);

    // Listen for cross-tab (and in-tab) updates
    React.useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== storageKey) return;
            const next = readJSON<string[]>(storageKey, [], scope);
            setSaved(new Set(next));
        };
        const onChannel = (e: Event) => {
            const ev = e as CustomEvent<{ key: string }>;
            if (ev.detail?.key !== storageKey) return;
            const next = readJSON<string[]>(storageKey, [], scope);
            setSaved(new Set(next));
        };
        window.addEventListener('storage', onStorage);
        window.addEventListener(CHANNEL, onChannel as EventListener);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(CHANNEL, onChannel as EventListener);
        };
    }, [storageKey, scope]);

    return {
        savedIds: saved,
        isSaved,
        save,
        unsave,
        toggle,
        clear,
        count: saved.size,
    };
}
