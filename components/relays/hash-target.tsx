"use client";

import { useEffect } from "react";

const MAX_ATTEMPTS = 24;

function targetId(): string {
  return window.location.hash.replace(/^#/, "");
}

function reveal(id: string): HTMLElement | null {
  const node = document.getElementById(id);
  if (!node) return null;
  let parent = node.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
    parent = parent.parentElement;
  }
  return node;
}

function restingTop(node: HTMLElement): number {
  const margin = Number.parseFloat(getComputedStyle(node).scrollMarginTop) || 0;
  const padding =
    Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return margin + padding;
}

function aligned(node: HTMLElement): boolean {
  return Math.abs(node.getBoundingClientRect().top - restingTop(node)) < 12;
}

/** Scroll to the URL hash after layout. The status document is long, and the router resets scroll once hydration finishes. */
export function HashTarget() {
  useEffect(() => {
    const id = targetId();
    if (!id) return;

    let attempts = 0;
    let timer = 0;

    const tick = () => {
      attempts += 1;
      const node = reveal(id);
      if (node && !aligned(node)) node.scrollIntoView();
      if ((node && aligned(node)) || attempts >= MAX_ATTEMPTS) return;
      timer = window.setTimeout(tick, 100);
    };

    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
