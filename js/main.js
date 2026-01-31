// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { getThemeConfig } from "./themeConfig.js";
import {
  populateThemeDropdown,
  getStoredTheme,
  saveTheme,
} from "./themeSwitcher.js";
import Stats from "three/addons/Stats";
import { showToast } from "./utils/errorHandling.js";
import { createOrthoCam } from "./utils/threeJSUtils.js";

function initThreeJS() {
  // --- FPS COUNTER SETUP ---
  let stats;
  if (typeof Stats !== "undefined") {
    stats = new Stats();
    stats.showPanel(0);

    stats.dom.style.position = "absolute";
    stats.dom.style.top = "50px";
    stats.dom.style.left = "20px";
    stats.dom.style.zIndex = "101";
    document.body.appendChild(stats.dom);
    stats.dom.hidden = true;

    window.addEventListener("keydown", (e) => {
      if (e.key === "F" || e.key === "f") {
        stats.dom.hidden = !stats.dom.hidden;
      }
    });
  } else {
    console.warn("Stats.js not found; FPS counter disabled.");
  }

  // --- CORE THREE.JS SETUP ---
  const scene = new THREE.Scene();
  const perspCam = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  perspCam.position.set(0, 3, 10);
  perspCam.lookAt(0, 0, 0);

  const canvas = document.getElementById("bg-canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Holder for active theme objects
  const currentGroup = new THREE.Group();
  currentGroup.renderer = renderer;
  scene.add(currentGroup);

  let objectsToAnimate = [];
  const themeSwitcher = document.getElementById("theme-switcher");

  // DVD bounce helpers
  let bounceBoundsHelper = null;
  let bounceOrthoCam = null;

  // Load a given theme
  async function loadTheme(name) {
    // clear debug helper if any
    if (bounceBoundsHelper) {
      scene.remove(bounceBoundsHelper);
      bounceBoundsHelper = null;
    }

    // remove old theme
    objectsToAnimate.forEach((obj) => {
      if (obj.cleanup && typeof obj.cleanup === "function") {
        obj.cleanup();
      }
    });

    while (currentGroup.children.length) {
      currentGroup.remove(currentGroup.children[0]);
    }
    objectsToAnimate = [];

    const cfg = getThemeConfig(name);

    try {
      const mod = await import(cfg.path);
      objectsToAnimate = mod[cfg.setupFn](currentGroup) || [];
    } catch (err) {
      console.error(`Error loading theme "${name}":`, err);
      showToast(`Failed to load "${name}" theme. Using fallback.`, "error");

      // fallback to sunset
      if (name !== "sunset") {
        themeSwitcher.value = "sunset";
        await loadTheme("sunset");
      }
    }

    // If it's DVD bounce, build an orthographic camera matching the current frustum
    bounceOrthoCam =
      cfg.animType === "bounceDvd" && objectsToAnimate[0]
        ? createOrthoCam(perspCam, objectsToAnimate[0])
        : null;
  }

  // Main render/animate loop
  let lastTime = 0;
  function animate(currentTime) {
    requestAnimationFrame(animate);
    if (stats) stats.begin();

    const t = currentTime * 0.001;
    const dt = Math.min((currentTime - lastTime) * 0.001, 0.033); // Cap at 30fps
    lastTime = currentTime;

    // choose correct camera
    const renderCam = bounceOrthoCam || perspCam;

    objectsToAnimate.forEach((obj) => {
      if (obj.update) {
        obj.update(t, dt, renderCam);
      }
    });

    renderer.render(scene, renderCam);

    if (stats) stats.end();
  }

  populateThemeDropdown(themeSwitcher);

  // theme switcher handler
  themeSwitcher?.addEventListener("change", (e) => {
    loadTheme(e.target.value);
    saveTheme(e.target.value);
  });

  // on resize
  window.addEventListener("resize", () => {
    perspCam.aspect = window.innerWidth / window.innerHeight;
    perspCam.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    loadTheme(themeSwitcher.value);
  });

  // Load initial theme
  const initialTheme = getStoredTheme();
  themeSwitcher.value = initialTheme;
  loadTheme(initialTheme);

  animate(0);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThreeJS);
} else {
  initThreeJS();
}
