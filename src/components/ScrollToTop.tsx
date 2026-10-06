import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * SPA navigation keeps the previous scroll offset unless we reset it.
 * Footer topic links (`/guides`, `/zain-cash`, …) were landing mid-page
 * because the visitor was still scrolled to the footer.
 *
 * Hash links (`/#pricing`) need a second pass: the landing sections are
 * lazy-loaded, so the target may not exist on the first paint.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    const id = hash.replace(/^#/, "");
    if (!id) return;

    let cancelled = false;
    let tries = 0;

    const seek = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      // Lazy sections mount a frame or two later.
      if (tries++ < 40) requestAnimationFrame(seek);
    };

    seek();
    return () => {
      cancelled = true;
    };
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
