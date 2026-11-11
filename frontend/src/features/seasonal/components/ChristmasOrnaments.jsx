import { christmasOrnamentsDefaults } from "../configs/christmas";
import "../styles/christmas-ornaments.css";

export default function ChristmasOrnaments({
  enabled = christmasOrnamentsDefaults.enabled,
  colors = christmasOrnamentsDefaults.colors,
  sizes = christmasOrnamentsDefaults.sizes,
  hangingLengths = christmasOrnamentsDefaults.hangingLengths,
  count = christmasOrnamentsDefaults.count,
  animationSpeed = christmasOrnamentsDefaults.animationSpeed,
  animationIntensity = christmasOrnamentsDefaults.animationIntensity,
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
            "--ornament-delay": `${-index * 0.7}s`,
            "--ornament-swing": `${animationIntensity}deg`,
          }}
        >
          <span className="christmas-ornament-string" />
          <span className="christmas-ornament-cap" />
          <span className="christmas-ornament-bauble" />
        </span>
      ))}
    </div>
  );
}
