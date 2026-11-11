import { useEffect, useRef, useState } from "react";
import { christmasLightsDefaults } from "../configs/christmas";
import "../styles/christmas-lights.css";

function LightString({
  bulbSize,
  bulbSpacing,
  glowIntensity,
  animationSpeed,
  colors,
  wireCurvature,
  placement,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const updateWidth = () => setWidth(container.getBoundingClientRect().width);
    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const spacing = width <= 640 ? bulbSpacing * 0.85 : bulbSpacing;
  const count = width > 0 ? Math.max(1, Math.round(width / spacing)) : 0;
  const wireEnd = 3;
  const wireMiddle = wireEnd + wireCurvature;

  return (
    <div
      ref={containerRef}
      className={`christmas-lights christmas-lights--${placement}`}
      aria-hidden="true"
      style={{
        "--configured-bulb-size": `${bulbSize}px`,
        "--wire-middle": `${wireMiddle}px`,
        "--glow-intensity": glowIntensity,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="christmas-lights-segment" key={index}>
          <svg
            className="christmas-lights-wire"
            viewBox="0 0 100 24"
            preserveAspectRatio="none"
            focusable="false"
          >
            <path
              className="christmas-lights-wire-edge"
              d={`M 0 ${wireEnd} Q 50 ${wireEnd + wireCurvature * 2} 100 ${wireEnd}`}
            />
            <path
              className="christmas-lights-wire-core"
              d={`M 0 ${wireEnd} Q 50 ${wireEnd + wireCurvature * 2} 100 ${wireEnd}`}
            />
          </svg>
          <span
            className="christmas-lights-bulb"
            style={{
              "--bulb-color": colors[index % colors.length],
              "--twinkle-duration": `${animationSpeed * (0.82 + (index % 5) * 0.11)}s`,
              "--twinkle-delay": `${-((index * 1.37) % (animationSpeed * 2))}s`,
              "--bulb-brightness": 0.9 + (index % 4) * 0.06,
            }}
          >
            <span className="christmas-lights-socket" />
            <span className="christmas-lights-glass" />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChristmasLights({ enabled = christmasLightsDefaults.enabled, ...options }) {
  if (!enabled) return null;

  return <LightString {...christmasLightsDefaults} {...options} />;
}
