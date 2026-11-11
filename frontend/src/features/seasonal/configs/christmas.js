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
