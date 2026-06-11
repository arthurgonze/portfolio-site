// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { createTheme as createDvdScreensaverTheme, themeMeta as dvdScreensaverThemeMeta } from "./themes/dvdScreensaverTheme.js";
import { createTheme as createFluid2dGasTheme, themeMeta as fluid2dGasThemeMeta } from "./themes/fluid2dGasTheme.js";
import { createTheme as createOldTvNoiseTheme, themeMeta as oldTvNoiseThemeMeta } from "./themes/oldTvTheme.js";
import { createTheme as createSunsetTheme, themeMeta as sunsetThemeMeta } from "./themes/retrowaveSunsetTheme.js";

/**
 * Manual background theme registry used by the Phase 1 runtime.
 */
export const themes = {
  [sunsetThemeMeta.id]: {
    ...sunsetThemeMeta,
    displayName: sunsetThemeMeta.label,
    createTheme: createSunsetTheme,
  },
  [oldTvNoiseThemeMeta.id]: {
    ...oldTvNoiseThemeMeta,
    displayName: oldTvNoiseThemeMeta.label,
    createTheme: createOldTvNoiseTheme,
  },
  [dvdScreensaverThemeMeta.id]: {
    ...dvdScreensaverThemeMeta,
    displayName: dvdScreensaverThemeMeta.label,
    createTheme: createDvdScreensaverTheme,
  },
  [fluid2dGasThemeMeta.id]: {
    ...fluid2dGasThemeMeta,
    displayName: fluid2dGasThemeMeta.label,
    createTheme: createFluid2dGasTheme,
  },
};

/**
 * Returns a theme definition by id, falling back to the default theme.
 * @param {string} themeName
 */
export function getThemeConfig(themeName) {
  return themes[themeName] || themes[sunsetThemeMeta.id];
}
