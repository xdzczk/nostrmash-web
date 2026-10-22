"use client";

import { useEffect } from "react";

/**
 * On a reply page, a long ancestor (an image, a letter) would otherwise fill
 * the viewport and hide the note that was opened. Scroll that note up so the
 * parent still peeks in above it. A short parent stays fully on screen.
 */
export function FocusFocalNote() {
  useEffect(() => {
    const note = document.getElementById("note");
    const ancestors = document.querySelector('[aria-label="Earlier in this thread"]');
    if (!note || !(ancestors instanceof HTMLElement)) return;

    // Images in an ancestor finish loading after the first paint and can push
    // the note below the fold. Follow that growth until the reader scrolls.
    let readerMoved = false;
    let ignoreScrollUntil = 0;

    const align = () => {
      if (readerMoved) return;
      const ancestorHeight = ancestors.getBoundingClientRect().height;
      if (ancestorHeight < window.innerHeight * 0.45) return;
      const header = document.querySelector("header");
      const offset = (header?.getBoundingClientRect().height ?? 0) + 72;
      const top = Math.max(0, note.getBoundingClientRect().top + window.scrollY - offset);
      if (Math.abs(window.scrollY - top) < 4) return;
      ignoreScrollUntil = performance.now() + 80;
      window.scrollTo({ top, behavior: "auto" });
    };

    const onScroll = () => {
      if (performance.now() < ignoreScrollUntil) return;
      readerMoved = true;
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(ancestors);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
