import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Renders nothing — just watches the URL and resets scroll position
// whenever it changes, so navigating to a new page always opens at the
// top instead of wherever you happened to be scrolled to before.
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
