"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { dictionaryFor } from "@/i18n/dictionaries";
import { getSavedSnapshot, subscribeSaved, toggleSavedSlug } from "./saved-store";

/**
 * The one client island behind every Save button (CS-21). Mounted once in the
 * store layout: delegates clicks on `[data-save-slug]`, keeps each button's
 * `aria-pressed` and the header count in sync (mount, toggle, other tabs,
 * client navigations via a MutationObserver) and announces changes.
 */
export function SavedProvider({ locale }: { locale: Locale }) {
  const t = dictionaryFor(locale);
  const [message, setMessage] = useState("");
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    let frame = 0;

    const sync = () => {
      frame = 0;
      const saved = new Set(getSavedSnapshot());
      for (const btn of document.querySelectorAll<HTMLElement>("[data-save-slug]")) {
        const pressed = saved.has(btn.dataset.saveSlug ?? "") ? "true" : "false";
        if (btn.getAttribute("aria-pressed") !== pressed) btn.setAttribute("aria-pressed", pressed);
      }
      const count = saved.size;
      for (const link of document.querySelectorAll<HTMLElement>("[data-saved-link]")) {
        const label = count > 0 ? t.saved.headerLabelCount(count) : t.saved.headerLabel;
        if (link.getAttribute("aria-label") !== label) link.setAttribute("aria-label", label);
        const badge = link.querySelector<HTMLElement>("[data-saved-count]");
        if (badge) {
          const text = count > 99 ? "99+" : String(count);
          if (badge.textContent !== (count ? text : "")) badge.textContent = count ? text : "";
          badge.hidden = count === 0;
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };

    const announce = (text: string) => {
      setMessage("");
      requestAnimationFrame(() => setMessage(text));
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => setMessage(""), 4000);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest<HTMLElement>("[data-save-slug]");
      if (!btn) return;
      e.preventDefault();
      const slug = btn.dataset.saveSlug;
      if (!slug) return;
      const name = btn.dataset.saveName ?? "item";
      const nowSaved = toggleSavedSlug(slug);
      // TODO(analytics): track "save_product" / "unsave_product" once those events exist in src/lib/analytics.ts.
      announce(nowSaved ? t.saved.announceSaved(name) : t.saved.announceRemoved(name));
    };

    sync();
    const unsubscribe = subscribeSaved(sync);
    document.addEventListener("click", onClick);
    // New buttons appear after client navigations, filtering and rails.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      unsubscribe();
      document.removeEventListener("click", onClick);
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, [t]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
