// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import { themes } from "./themeConfig.js";

export function populateThemeDropdown(selectElement) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = "";
  for (const key in themes) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = themes[key].displayName || formatThemeName(key);
    selectElement.appendChild(opt);
  }
}

export function getStoredTheme() {
  try {
    const saved = localStorage.getItem("selectedTheme");
    if (saved && themes[saved]) {
      return saved;
    }
  } catch (err) {
    console.warn("localStorage unavailable:", err);
  }
  return "sunset";
}

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
