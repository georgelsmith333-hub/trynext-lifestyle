import { useEffect } from "react";
import { useLocation } from "wouter";

// Detect browser back/forward button presses (popstate) vs programmatic SPA navigation.
// When the browser fires popstate, we skip scroll-to-top so the browser can restore position.
let _lastNavWasPopstate = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => { _lastNavWasPopstate = true; });
}

export function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    if (_lastNavWasPopstate) {
      // Back/forward navigation — let browser restore scroll position naturally
      _lastNavWasPopstate = false;
      return;
    }
    // Forward navigation — scroll to top
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location]);

  return null;
}
