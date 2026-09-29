"use client";

import { useSyncExternalStore } from "react";

/**
 * Query-string store for client-side filters. Reads window.location directly
 * so statically prerendered listings need no Suspense boundary; the server
 * snapshot is "" (unfiltered), which is also what crawlers receive.
 */
const EVENT = "usba:search-change";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function useUrlSearch(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
}

/** Push a new query string (keeps back/forward working, no server round trip). */
export function pushUrlSearch(query: string): void {
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (url === `${window.location.pathname}${window.location.search}`) return;
  // Next.js integrates native pushState with its router (App Router docs).
  window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(EVENT));
}
