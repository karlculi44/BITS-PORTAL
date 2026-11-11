import { useEffect, useRef, useState } from "react";
import { christmasGarlandDefaults } from "../configs/christmas";
import "../styles/christmas-garland.css";

const FROND_PATH = "M 0 0 C 11 -2 23 -8 38 -17";
const NEEDLE_PATH =
  "M 5 -1 l -4 -5 M 9 -2 l 1 -7 M 14 -4 l -4 -6 M 19 -6 l 1 -7 M 24 -9 l -4 -6 M 29 -12 l 1 -6 M 34 -15 l -3 -5";
const NEEDLE_UNDERSIDE_PATH =
  "M 5 -1 l -5 3 M 10 -2 l -3 6 M 15 -4 l -5 3 M 20 -7 l -3 6 M 25 -10 l -5 3 M 30 -13 l -3 5 M 35 -16 l -4 3";
const FROND_ORIENTATIONS = [
  { className: "christmas-garland-frond--deep", transform: "" },
  { className: "christmas-garland-frond--light", transform: "scale(1 -1)" },
  { className: "christmas-garland-frond--light", transform: "scale(-1 1)" },
  { className: "christmas-garland-frond--deep", transform: "scale(-1 -1)" },
];

function GarlandBranches({ width, density, curvature, thickness }) {
  const safeDensity = Number.isFinite(density)
    ? Math.min(2, Math.max(0.4, density))
    : 1;
  const count = width > 0
    ? Math.max(1, Math.ceil(width / (56 / safeDensity)))
    : 0;
  const curvePath = `M 0 8 C ${width * 0.25} 8 ${width * 0.25} ${8 + curvature * 2} ${width * 0.5} ${8 + curvature} C ${width * 0.75} ${8 + curvature * 2} ${width * 0.75} 8 ${width} 8`;

  return (
    <svg
      className="christmas-garland-svg"
      viewBox={`0 0 ${Math.max(width, 1)} 40`}
      preserveAspectRatio="none"
      focusable="false"
    >
      <path className="christmas-garland-vine-shadow" d={curvePath} />
      <path className="christmas-garland-vine" d={curvePath} />
      {Array.from({ length: count }, (_, index) => {
        const x = ((index + 0.5) * width) / count;
        const normalizedX = (x - width / 2) / Math.max(width / 2, 1);
        const y = 8 + curvature * (1 - normalizedX * normalizedX);
        const rotation = index % 2 === 0 ? -3 : 3;
        const thicknessScale = thickness / 18 * (0.92 + (index % 3) * 0.05);

        return (
          <g
            className="christmas-garland-cluster"
            key={index}
            transform={`translate(${x} ${y}) rotate(${rotation}) scale(1 ${thicknessScale})`}
          >
            {FROND_ORIENTATIONS.map(({ className, transform }, orientationIndex) => (
              <g
                className={className}
                key={orientationIndex}
                transform={transform}
              >
                <path className="christmas-garland-frond-shadow" d={FROND_PATH} />
                <path className="christmas-garland-frond-stem" d={FROND_PATH} />
                <path className="christmas-garland-needles" d={NEEDLE_PATH} />
                <path className="christmas-garland-needles christmas-garland-needles--underside" d={NEEDLE_UNDERSIDE_PATH} />
              </g>
            ))}
            <path className="christmas-garland-bud" d="M-3 0 Q0 -3 3 0 Q0 3 -3 0Z" />
          </g>
        );
      })}
    </svg>
  );
}

function Garland({
  density,
  thickness,
  curvature,
  opacity,
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

  return (
    <div
      ref={containerRef}
      className={`christmas-garland christmas-garland--${placement}`}
      aria-hidden="true"
      style={{
        "--garland-height": `${thickness + curvature + 4}px`,
        "--garland-opacity": opacity,
      }}
    >
      <GarlandBranches
        width={width}
        density={density}
        curvature={curvature}
        thickness={thickness}
      />
    </div>
  );
}

export default function ChristmasGarland({
  enabled = christmasGarlandDefaults.enabled,
  ...options
}) {
  if (!enabled) return null;

  return <Garland {...christmasGarlandDefaults} {...options} />;
}
