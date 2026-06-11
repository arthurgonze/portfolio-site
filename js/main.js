// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BackgroundApp } from "./background/BackgroundApp.js";

/**
 * Bootstraps the shared Three.js background system.
 */
async function initBackground() {
  const canvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("bg-canvas")
  );
  const themeSelect = /** @type {HTMLSelectElement | null} */ (
    document.getElementById("theme-switcher")
  );
  const app = new BackgroundApp({
    canvas,
    themeSelect,
  });

  await app.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initBackground().catch((err) => console.error(err));
  });
} else {
  void initBackground().catch((err) => console.error(err));
}
