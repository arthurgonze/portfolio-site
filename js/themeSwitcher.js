// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import { themes } from "./background/ThemeRegistry.generated.js";

/**
 * Populates the theme selector with the generated theme registry.
 * @param {HTMLSelectElement | null} selectElement
 */
export function populateThemeDropdown(selectElement) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = "";
  for (const key of Object.keys(themes)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = themes[key].displayName || formatThemeName(key);
    selectElement.appendChild(opt);
  }
}

/**
 * Returns the persisted theme id, falling back to the default generated theme.
 * @returns {string}
 */
export function getStoredTheme() {
  try {
    const saved = localStorage.getItem("selectedTheme");
    if (saved && themes[saved]) {
      return saved;
    }
  } catch (err) {
    console.warn("localStorage unavailable:", err);
  }

  return themes.sunset ? "sunset" : Object.keys(themes)[0] || "";
}

/**
 * Persists the selected theme id in localStorage.
 * @param {string} themeName
 */
export function saveTheme(themeName) {
  try {
    localStorage.setItem("selectedTheme", themeName);
  } catch (err) {
    console.warn("failed to save theme:", err);
  }
}

function formatThemeName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}
