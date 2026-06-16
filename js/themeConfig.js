// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import {
  getThemeById,
  themeList,
  themes as generatedThemes,
} from "./background/ThemeRegistry.generated.js";

/**
 * Runtime adapter for the generated background theme registry.
 *
 * The generated file owns discovery and ordering; this module preserves the
 * object-shaped lookup API used by the existing theme switcher and background
 * manager.
 */
export const themes = generatedThemes;

/**
 * Ordered list of available themes.
 */
export { themeList };

/**
 * Returns a theme definition by id, falling back to the default theme.
 * @param {string} themeName
 * @returns {object | undefined}
 */
export function getThemeConfig(themeName) {
  return (
    getThemeById(themeName) ||
    generatedThemes.sunset ||
    themeList[0]
  );
}
