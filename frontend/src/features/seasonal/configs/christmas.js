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
  animationSpeed: 5,
  animationIntensity: 3,
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
  animationSpeed: 6,
  animationIntensity: 2,
  placement: "admin",
};
