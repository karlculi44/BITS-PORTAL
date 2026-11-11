import { christmasOrnamentsDefaults } from "../configs/christmas";
import "../styles/christmas-ornaments.css";

function startSwing(event) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  event.currentTarget.parentElement.classList.add("christmas-ornament--swinging");
}

function handlePointerEnter(event) {
  if (event.pointerType === "mouse" || event.pointerType === "pen") {
    startSwing(event);
  }
}

function handlePointerDown(event) {
  if (event.pointerType === "touch") startSwing(event);
}

function handleClick(event) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const ornament = event.currentTarget.parentElement;
  const start = getComputedStyle(ornament).transform;
  ornament.classList.remove("christmas-ornament--swinging");
  ornament.style.setProperty("--ornament-start", start);
  ornament.style.setProperty("--ornament-direction", Math.random() < 0.5 ? "-1" : "1");
  ornament.style.setProperty("--ornament-speed-factor", 0.75 + Math.random() * 0.5);
  // Flush the old animation so repeated clicks restart it from its current position.
  void ornament.offsetWidth;
  ornament.classList.add("christmas-ornament--swinging");
}

function finishSwing(event) {
  if (event.target === event.currentTarget) {
    event.currentTarget.classList.remove("christmas-ornament--swinging");
    event.currentTarget.style.removeProperty("--ornament-start");
    event.currentTarget.style.removeProperty("--ornament-direction");
    event.currentTarget.style.removeProperty("--ornament-speed-factor");
  }
}

export default function ChristmasOrnaments({
  enabled = christmasOrnamentsDefaults.enabled,
  colors = christmasOrnamentsDefaults.colors,
  sizes = christmasOrnamentsDefaults.sizes,
  hangingLengths = christmasOrnamentsDefaults.hangingLengths,
  count = christmasOrnamentsDefaults.count,
  animationSpeed = christmasOrnamentsDefaults.animationSpeed,
  swingAmplitude = christmasOrnamentsDefaults.swingAmplitude,
  animationIntensity = christmasOrnamentsDefaults.animationIntensity,
  interactive = christmasOrnamentsDefaults.interactive,
  placement = christmasOrnamentsDefaults.placement,
}) {
  if (!enabled) return null;

  const ornaments = Array.from({ length: Math.min(12, Math.max(0, Math.floor(count))) }, (_, index) => ({
    color: colors[index % colors.length],
    size: sizes[index % sizes.length],
    length: hangingLengths[index % hangingLengths.length],
  }));
  if (ornaments.length === 0) return null;

  const height = Math.max(0, ...ornaments.map(({ size, length }) => size + length)) + 16;

  return (
    <div
      className={`christmas-ornaments christmas-ornaments--${placement}`}
      aria-hidden="true"
      style={{ "--ornaments-height": `${height}px` }}
    >
      {ornaments.map(({ color, size, length }, index) => (
        <span
          className="christmas-ornament"
          key={index}
          style={{
            "--ornament-position": `${((index + 0.5) / ornaments.length) * 100}%`,
            "--ornament-color": color,
            "--ornament-size": `${size}px`,
            "--ornament-string": `${length}px`,
            "--ornament-duration": `${animationSpeed * (1 + (index % 3) * 0.12)}s`,
            "--ornament-swing": `${swingAmplitude * animationIntensity * (0.9 + (index % 3) * 0.1) * (index % 2 === 0 ? 1 : -1)}deg`,
          }}
          onAnimationEnd={finishSwing}
        >
          <span className="christmas-ornament-string" />
          <span className="christmas-ornament-cap" />
          <span
            className={`christmas-ornament-bauble${interactive ? " christmas-ornament-bauble--interactive" : ""}`}
            onPointerEnter={interactive ? handlePointerEnter : undefined}
            onPointerDown={interactive ? handlePointerDown : undefined}
            onClick={interactive ? handleClick : undefined}
          />
        </span>
      ))}
    </div>
  );
}
