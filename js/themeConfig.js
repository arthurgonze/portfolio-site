// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
function formatThemeName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

export const themes = {
  sunset: {
    path: "./themes/retrowaveSunsetTheme.js",
    setupFn: "setupSunsetScene",
    animType: "materialTime",
    displayName: "Retrowave Sunset",
  },
  oldTvNoise: {
    path: "./themes/oldTvTheme.js",
    setupFn: "setupOldTvNoiseScene",
    animType: "materialTimeRes",
    displayName: "Old TV Noise",
  },
  dvdScreensaver: {
    path: "./themes/dvdScreensaverTheme.js",
    setupFn: "setupDvdScreensaverScene",
    animType: "bounceDvd",
    displayName: "DVD Screensaver",
  },
  fluid2dGas: {
    path: "./themes/fluid2dGasTheme.js",
    setupFn: "setupFluid2dGasScene",
    animType: "materialTimeRes",
    displayName: "2D Fluid Simulation",
  },
};

export function getThemeConfig(themeName) {
  return themes[themeName] || themes["sunset"];
}

export { formatThemeName };
