import { useEffect } from "react";

const SELECTOR = "[data-reveal]:not([data-reveal-in])";

/**
 * Reveals every `[data-reveal]` element on the page as it scrolls into view,
 * by stamping `data-reveal-in` on it. The transitions themselves live in
 * index.css.
 *
 * One observer for the whole document rather than a `<Reveal>` wrapper per
 * block: the reveal is presentation, and a wrapper element around a grid item
 * or a flex child changes the very layout it is decorating.
 *
 * Call it once, from the shell.
 */
export function useScrollReveal() {
  useEffect(() => {
    const reveal = (el: Element) => el.setAttribute("data-reveal-in", "");

    // Nothing was ever hidden in this case — the CSS only hides under
    // `prefers-reduced-motion: no-preference` — but stamping the attribute
    // anyway keeps the DOM in one consistent state.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(SELECTOR).forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          // A reveal happens once; re-animating on the way back up turns
          // scrolling into a light show.
          observer.unobserve(entry.target);
        });
      },
      // Slightly inside the bottom edge, so an element is settled by the time
      // it is properly on screen rather than starting as it clips in.
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );

    const observeAll = () =>
      document.querySelectorAll(SELECTOR).forEach((el) => observer.observe(el));

    observeAll();

    /**
     * Sections that mount after their data arrives — the generation history
     * carousel — are not in the document on the first pass, so new nodes are
     * picked up as they appear. Coalesced into a frame because this fires for
     * every unrelated re-render too.
     */
    let queued = 0;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = requestAnimationFrame(() => {
        queued = 0;
        observeAll();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (queued) cancelAnimationFrame(queued);
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);
}
