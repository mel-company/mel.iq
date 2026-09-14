import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a modal's overlay into <body> rather than in place.
 *
 * `position: fixed` is only relative to the viewport while no ancestor
 * establishes a containing block — and `transform`, `translate`, `scale`,
 * `rotate`, `filter`, `backdrop-filter`, `contain` and `will-change` all do.
 * The landing page has several of those (the scroll-reveal wrappers, the
 * composer's backdrop blur, the blurred blooms), so an overlay rendered where
 * it is declared anchors to whichever of them is nearest and lands off-centre.
 *
 * Portalling to <body> sidesteps the whole class of problem instead of playing
 * whack-a-mole with ancestors.
 */
function ModalPortal({ children }: { children: ReactNode }) {
  // Mounted-gate so nothing tries to reach `document` during SSR or the first
  // render pass.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}

export default ModalPortal;
