import { useEffect } from "react";

function ScrollbarVisibility() {
  useEffect(() => {
    let hideScrollbarTimer;
    const handleScroll = () => {
      document.documentElement.dataset.scrolling = "true";
      window.clearTimeout(hideScrollbarTimer);
      hideScrollbarTimer = window.setTimeout(() => {
        delete document.documentElement.dataset.scrolling;
      }, 800);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.clearTimeout(hideScrollbarTimer);
      delete document.documentElement.dataset.scrolling;
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}

export default ScrollbarVisibility;
