import { useState } from "react";
import { ImageOff } from "lucide-react";
import bitsLogo from "../assets/images/bits-trimmed.png";
import bayawanCityLogo from "../assets/images/bayawan_city_logo-trimmed.png";
import informationTechnologyLogo from "../assets/images/ITS_logo.png";
import { inspectCircularArtwork } from "./logoArtwork";
import "./Logo.css";

const circularLogos = new Set([bitsLogo, bayawanCityLogo, informationTechnologyLogo]);

function Logo({ src, alt, className = "" }) {
  const [failure, setFailure] = useState({ source: "", fallback: false });
  const [dimensions, setDimensions] = useState(null);
  const source = src || bitsLogo;
  const sourceFailed = failure.source === source;
  const image = sourceFailed ? bitsLogo : source;
  const unavailable = sourceFailed && (source === bitsLogo || failure.fallback);
  const imageDimensions = dimensions?.source === image ? dimensions : null;
  const isCircular = circularLogos.has(image) || imageDimensions?.circularScale != null;
  // Fit the image's diagonal inside the circle so unknown artwork is not clipped.
  const diagonal = imageDimensions && Math.hypot(imageDimensions.width, imageDimensions.height);
  const imageStyle = imageDimensions?.circularScale != null
    ? { width: `${imageDimensions.circularScale}%`, height: `${imageDimensions.circularScale}%` }
    : !isCircular && diagonal ? {
        width: `${99 * imageDimensions.width / diagonal}%`,
        height: `${99 * imageDimensions.height / diagonal}%`,
      }
    : undefined;

  return (
    <span className={`logo${isCircular ? " logo--circular" : ""} ${className}`}>
      {unavailable ? (
        <span role={alt ? "img" : undefined} aria-label={alt || undefined}>
          <ImageOff size={20} aria-hidden="true" />
        </span>
      ) : (
        <img
          src={image}
          alt={alt}
          style={imageStyle}
          onLoad={(event) => {
            if (!isCircular) {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) {
                setDimensions({
                  source: image,
                  width: naturalWidth,
                  height: naturalHeight,
                  circularScale: inspectCircularArtwork(event.currentTarget),
                });
              }
            }
          }}
          onError={() => setFailure({ source, fallback: image === bitsLogo })}
        />
      )}
    </span>
  );
}

export default Logo;
