import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackJourney } from "../utils/journey";

/** Reports landing-page journey steps (see utils/journey.ts). Renders nothing. */
function JourneyTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    // After paint, so it never competes with the page itself.
    const timer = window.setTimeout(() => trackJourney(pathname), 1500);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}

export default JourneyTracker;
