import { memo, useEffect, useRef, useSyncExternalStore } from "react";
import { christmasSnowfallDefaults } from "../configs/christmas";
import "../styles/christmas-snowfall.css";

const MOBILE_QUERY = "(max-width: 640px)";
const TABLET_QUERY = "(max-width: 1024px)";

function subscribeToViewport(callback) {
  if (typeof window.matchMedia !== "function") return () => {};
  const queries = [MOBILE_QUERY, TABLET_QUERY].map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", callback));
  return () => queries.forEach((query) => query.removeEventListener("change", callback));
}

function getViewport() {
  if (typeof window.matchMedia !== "function") return "desktop";
  if (window.matchMedia(MOBILE_QUERY).matches) return "mobile";
  return window.matchMedia(TABLET_QUERY).matches ? "tablet" : "desktop";
}

// Stable, independent samples keep particle paths unchanged across renders and resizes.
function sample(seed, channel) {
  const value = Math.sin(seed * 127.1 + channel * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function between([min, max], value) {
  return min + (max - min) * value;
}

function Snowfield({ placement, density, foreground, layers, animation: animationOptions }) {
  const overlayRef = useRef(null);
  const viewport = useSyncExternalStore(subscribeToViewport, getViewport, () => "desktop");
  const animation = { ...christmasSnowfallDefaults.animation, ...animationOptions };
  const responsiveDensity = viewport === "desktop" ? 1 : density[viewport];

  useEffect(() => {
    const overlay = overlayRef.current;
    const updateVisibility = () => {
      overlay.dataset.hidden = String(animation.pauseWhenHidden && document.hidden);
    };
    updateVisibility();
    if (!animation.pauseWhenHidden) return undefined;
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, [animation.pauseWhenHidden]);

  return (
    <div
      ref={overlayRef}
      className={`christmas-snowfall christmas-snowfall--${placement}`}
      aria-hidden="true"
      data-animated={animation.enabled}
      style={{
        "--snow-gutter-width": foreground.gutterWidth,
        "--snow-clear-top": foreground.clearTop,
      }}
    >
      {layers.map((layer, layerIndex) => {
        const count = Math.min(48, Math.max(0, Math.round(
          layer.count * layer.intensity * responsiveDensity,
        )));
        return (
          <div
            className={`christmas-snowfall-layer christmas-snowfall-layer--${layer.name}`}
            key={layer.name}
            data-depth={layer.depth}
            data-area={layer.area}
          >
            {Array.from({ length: count }, (_, index) => {
              const seed = (layerIndex + 1) * 1000 + index;
              const duration = between(layer.duration, sample(seed, 1)) / animation.speed;
              const driftDuration = between(animation.driftDuration, sample(seed, 2)) / animation.speed;
              const flake = sample(seed, 3) < layer.flakeRatio;
              const position = sample(seed, 4);
              const left = layer.area === "gutters"
                ? index % 2 === 0
                  ? `calc(var(--snow-gutter-width) * ${position})`
                  : `calc(100% - var(--snow-gutter-width) * ${position})`
                : `${position * 100}%`;
              return (
                <span
                  key={index}
                  className={`christmas-snowfall-particle${flake ? " christmas-snowfall-particle--flake" : ""}`}
                  style={{
                    left,
                    "--snow-size": `${between(layer.size, sample(seed, 5))}px`,
                    "--snow-opacity": layer.opacity * layer.intensity * between([0.55, 1], sample(seed, 6)),
                    "--snow-duration": `${duration}s`,
                    "--snow-delay": `${-sample(seed, 7) * duration}s`,
                    "--snow-drift": `${between(layer.drift, sample(seed, 8))}px`,
                    "--snow-drift-duration": `${driftDuration}s`,
                    "--snow-drift-delay": `${-sample(seed, 9) * driftDuration * 2}s`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default memo(function ChristmasSnowfall({
  enabled = christmasSnowfallDefaults.enabled,
  ...options
}) {
  if (!enabled) return null;
  return <Snowfield {...christmasSnowfallDefaults} {...options} />;
});
