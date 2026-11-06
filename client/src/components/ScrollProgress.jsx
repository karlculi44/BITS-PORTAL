import { useEffect, useRef } from "react";

function ScrollProgress() {
  const progressRef = useRef(null);

  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return undefined;

    let frameId = 0;
    let hideScrollbarTimer = 0;
    const update = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const root = document.documentElement;
        const maxScroll = root.scrollHeight - window.innerHeight;
        const hasScrollableContent = maxScroll > 0;
        const value = hasScrollableContent
          ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100))
          : 0;
        progress.hidden = !hasScrollableContent;
        progress.style.transform = `scaleX(${value / 100})`;
        progress.setAttribute("aria-valuenow", String(Math.round(value)));
      });
    };
    const handleScroll = () => {
      document.documentElement.dataset.scrolling = "true";
      window.clearTimeout(hideScrollbarTimer);
      hideScrollbarTimer = window.setTimeout(() => {
        delete document.documentElement.dataset.scrolling;
      }, 800);
      update();
    };
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", update);
    observer?.observe(document.documentElement);
    observer?.observe(document.body);
    update();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(hideScrollbarTimer);
      delete document.documentElement.dataset.scrolling;
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", update);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={progressRef}
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow="0"
      className="scroll-progress"
      hidden
    />
  );
}

export default ScrollProgress;
