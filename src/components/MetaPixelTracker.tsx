import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackMetaPageView } from "@/utils/metaPixel";

/** Fires Meta Pixel PageView on SPA navigations (initial load is in index.html). */
function MetaPixelTracker() {
  const { pathname, search } = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    trackMetaPageView();
  }, [pathname, search]);

  return null;
}

export default MetaPixelTracker;
