"use client";

import { SAVED_STORAGE_KEY, parseSaved, serializeSaved, toggleSaved } from "@/domain/saved";

/**
 * Tiny external store over localStorage (CS-21). Shared by the provider (DOM
 * sync) and the /saved page, and kept in sync across tabs via `storage`.
 */
const EMPTY: readonly string[] = [];
let cachedRaw: string | null | undefined;
let cachedList: readonly string[] = EMPTY;
const listeners = new Set<() => void>();
let storageBound = false;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SAVED_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getSavedSnapshot(): readonly string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    const parsed = parseSaved(raw);
    cachedList = parsed.length ? parsed : EMPTY;
  }
  return cachedList;
}

export function getServerSavedSnapshot(): readonly string[] {
  return EMPTY;
}

function emit() {
  for (const l of listeners) l();
}

export function subscribeSaved(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageBound) {
    storageBound = true;
    window.addEventListener("storage", (e) => {
      if (e.key === null || e.key === SAVED_STORAGE_KEY) emit();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function setSaved(list: readonly string[]) {
  try {
    window.localStorage.setItem(SAVED_STORAGE_KEY, serializeSaved(list));
  } catch {
    // Storage unavailable (private mode / quota): the change simply isn't persisted.
  }
  emit();
}

/** Toggles one slug and returns whether it is now saved. */
export function toggleSavedSlug(slug: string): boolean {
  const { list, saved } = toggleSaved(getSavedSnapshot(), slug);
  setSaved(list);
  return saved;
}
