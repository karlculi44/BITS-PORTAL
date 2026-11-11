export const christmasLightsDefaults = {
  enabled: true,
  bulbSize: 11,
  bulbSpacing: 64,
  glowIntensity: 1,
  animationSpeed: 3.8,
  colors: ["#ff384c", "#24d878", "#3c8dff", "#ffe34f", "#ff9f32"],
  wireCurvature: 5,
  placement: "top",
};

export const publicNavbarChristmasLights = {
  ...christmasLightsDefaults,
};

export const publicNavbarLightsStripHeight = `${
  3 + publicNavbarChristmasLights.wireCurvature + publicNavbarChristmasLights.bulbSize * 1.5 + 6
}px`;

export const christmasGarlandDefaults = {
  enabled: true,
  density: 1,
  thickness: 18,
  curvature: 7,
  opacity: 0.94,
  placement: "top",
};

export const publicNavbarChristmasGarland = {
  ...christmasGarlandDefaults,
};

export const publicNavbarChristmasGarlandStripHeight = `${
  publicNavbarChristmasGarland.thickness + publicNavbarChristmasGarland.curvature + 4
}px`;

export const publicNavbarSeasonalStripHeight = `${
  Math.max(
    publicNavbarChristmasLights.enabled ? parseFloat(publicNavbarLightsStripHeight) : 0,
    publicNavbarChristmasGarland.enabled
      ? parseFloat(publicNavbarChristmasGarlandStripHeight)
      : 0,
  )
}px`;

export const christmasOrnamentsDefaults = {
  enabled: true,
  colors: ["#bd2336", "#d9a83b", "#c5d0d5", "#a82632", "#287a51", "#c5d0d5", "#d9a83b"],
  sizes: [38, 28, 34, 26, 36, 30, 32],
  hangingLengths: [28, 45, 20, 40, 26, 43, 24],
  count: 7,
  animationSpeed: 3.2,
  swingAmplitude: 3,
  animationIntensity: 3,
  interactive: true,
  placement: "public",
};

export const publicHeroChristmasOrnaments = {
  ...christmasOrnamentsDefaults,
};

export const adminChristmasOrnaments = {
  ...christmasOrnamentsDefaults,
  colors: ["#bd2336", "#d9a83b", "#287a51"],
  sizes: [16, 13, 16],
  hangingLengths: [10, 15, 10],
  count: 3,
  animationSpeed: 3,
  animationIntensity: 2,
  placement: "admin",
};

export const christmasSnowfallDefaults = {
  enabled: true,
  placement: "public",
  density: { mobile: 0.65, tablet: 0.85 },
  foreground: { gutterWidth: "min(20px, 3vw)", clearTop: "10rem" },
  animation: {
    enabled: true,
    speed: 1,
    driftDuration: [4, 9],
    pauseWhenHidden: true,
  },
  layers: [
    {
      name: "background",
      depth: "behind-content",
      area: "viewport",
      count: 48,
      size: [1.5, 3],
      opacity: 0.32,
      duration: [28, 44],
      drift: [-30, 30],
      intensity: 1,
      flakeRatio: 0.08,
    },
    {
      name: "middle",
      depth: "behind-content",
      area: "viewport",
      count: 40,
      size: [3, 5.5],
      opacity: 0.55,
      duration: [19, 30],
      drift: [-55, 55],
      intensity: 1,
      flakeRatio: 0.28,
    },
    {
      name: "foreground",
      depth: "foreground",
      area: "viewport",
      count: 28,
      size: [3, 11],
      opacity: 0.6,
      duration: [13, 21],
      drift: [-45, 45],
      intensity: 1,
      flakeRatio: 0.22,
    },
  ],
};

export const publicChristmasSnowfall = { ...christmasSnowfallDefaults };

export const adminChristmasSnowfall = {
  ...christmasSnowfallDefaults,
  placement: "admin",
  foreground: { ...christmasSnowfallDefaults.foreground, clearTop: "4rem" },
  layers: christmasSnowfallDefaults.layers.map((layer, index) => ({
    ...layer,
    count: [34, 28, 18][index],
    size: [[1.5, 2.5], [2.5, 4], [2.5, 7]][index],
    opacity: [0.32, 0.45, 0.5][index],
    duration: [layer.duration[0] * 1.25, layer.duration[1] * 1.25],
    drift: [layer.drift[0] * 0.6, layer.drift[1] * 0.6],
    intensity: 0.9,
    flakeRatio: 0.1,
  })),
};
