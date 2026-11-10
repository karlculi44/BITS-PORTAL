const SAMPLE_SIZE = 128;

export function getCircularArtworkScale(pixels, size = SAMPLE_SIZE) {
  let artworkRadius = 0;
  const radius = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const visible = pixels[index + 3] > 8 &&
        (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245);
      if (!visible) continue;

      artworkRadius = Math.max(artworkRadius, Math.hypot(x + 0.5 - radius, y + 0.5 - radius));
    }
  }

  if (!artworkRadius || artworkRadius > radius * 1.04) return null;
  return Math.min(99.7, 100 * (radius - 1) / artworkRadius);
}

export function inspectCircularArtwork(image) {
  if (Math.abs(image.naturalWidth / image.naturalHeight - 1) > 0.02) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    console.warn("Unable to inspect logo artwork: canvas is unavailable.");
    return null;
  }

  context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  try {
    return getCircularArtworkScale(context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
  } catch (error) {
    if (error.name !== "SecurityError") throw error;
    console.warn("Unable to inspect cross-origin logo artwork; using a safe fit.", image.currentSrc);
    return null;
  }
}
