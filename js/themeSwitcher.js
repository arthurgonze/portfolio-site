// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import { themes } from "./background/ThemeRegistry.generated.js";

/**
 * Populates the theme selector with the generated theme registry.
 * @param {HTMLSelectElement | null} selectElement
 * @param {Record<string, { displayName?: string }>} [themeRegistry=themes]
 */
export function populateThemeDropdown(selectElement, themeRegistry = themes) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = "";
  for (const key of Object.keys(themeRegistry)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = themeRegistry[key].displayName || formatThemeName(key);
    selectElement.appendChild(opt);
  }
}

/**
 * Returns the persisted theme id, falling back to the default generated theme.
 * @param {Record<string, unknown>} [themeRegistry=themes]
 * @param {string} [storageKey="selectedTheme"]
 * @param {string} [defaultThemeId="sunset"]
 * @returns {string}
 */
export function getStoredTheme(
  themeRegistry = themes,
  storageKey = "selectedTheme",
  defaultThemeId = "sunset",
) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && themeRegistry[saved]) {
      return saved;
    }
  } catch (err) {
    console.warn("localStorage unavailable:", err);
  }

  return themeRegistry[defaultThemeId] ? defaultThemeId : Object.keys(themeRegistry)[0] || "";
}

/**
 * Persists the selected theme id in localStorage.
 * @param {string} themeName
 * @param {string} [storageKey="selectedTheme"]
 */
export function saveTheme(themeName, storageKey = "selectedTheme") {
  try {
    localStorage.setItem(storageKey, themeName);
  } catch (err) {
    console.warn("failed to save theme:", err);
  }
}

function formatThemeName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}
