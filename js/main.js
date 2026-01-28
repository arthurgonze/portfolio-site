// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { themes, getThemeConfig, formatThemeName } from "./themeConfig.js";
import Stats from "three/addons/Stats";

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

    // toggle with 'F' key
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
  currentGroup.renderer = renderer; // Pass renderer to theme
  scene.add(currentGroup);

  let objectsToAnimate = [];
  let currentThemeAnimType = "";
  const themeSwitcher = document.getElementById("theme-switcher");

  // Build theme dropdown
  function populateDropdown() {
    if (!themeSwitcher) return;
    themeSwitcher.innerHTML = "";
    for (const key in themes) {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = themes[key].displayName || formatThemeName(key);
      themeSwitcher.appendChild(opt);
    }
  }
  populateDropdown();

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
    bounceOrthoCam = null;

    objectsToAnimate.forEach((obj) => {
      if (obj.cleannup && typeof obj.cleanup === "function") {
        obj.cleanup;
      }
    });

    // remove old theme
    while (currentGroup.children.length) {
      currentGroup.remove(currentGroup.children[0]);
    }
    objectsToAnimate = [];

    const cfg = getThemeConfig(name);
    currentThemeAnimType = cfg.animType;

    try {
      const mod = await import(cfg.path);
      objectsToAnimate = mod[cfg.setupFn](currentGroup) || [];
    } catch (err) {
      console.error(`Error loading theme "${name}":`, err);

      showThemeError(name, err);

      // fallback to sunset, if possible
      if (name !== "sunset") {
        themeSwitcher.value - "sunset";
        await loadTheme("sunset");
      }
      // const fb = getThemeConfig("sunset");
      // currentThemeAnimType = fb.animType;
      // const mod = await import(fb.path);
      // objectsToAnimate = mod[fb.setupFn](currentGroup) || [];
    }

    // If it's DVD bounce, build an orthographic camera matching the current frustum
    if (currentThemeAnimType === "bounceDvd" && objectsToAnimate[0]) {
      const depth = Math.abs(
        perspCam.position.z - objectsToAnimate[0].position.z,
      );
      const vHeight =
        2 * Math.tan(THREE.MathUtils.degToRad(perspCam.fov / 2)) * depth;
      const vWidth = vHeight * perspCam.aspect;
      const halfW = vWidth / 2,
        halfH = vHeight / 2;

      bounceOrthoCam = new THREE.OrthographicCamera(
        -halfW,
        halfW,
        halfH,
        -halfH,
        perspCam.near,
        perspCam.far,
      );
      bounceOrthoCam.position.copy(perspCam.position);
      bounceOrthoCam.lookAt(0, 0, 0);
    }
  }

  function showThemeError(themeName, error) {
    const toast = document.createElement("div");
    toast.style.cssText = `
	position:  fixed; top: 70px; right: 20px; z-index:200; 
	background: rgba(255, 0, 0, 0.9); color: white; padding: 12px 20px; 
	border-radius: 5px; font-size: 14px;
`;
    toast.textContent = `Failed to load "${themeName}" theme. Using fallback.`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Main render/animate loop
  let lastTime = 0;
  function animate(currentTime) {
    requestAnimationFrame(animate);
    if (stats) stats.begin();

    const t = currentTime * 0.001;
    const dt = Math.min((currentTime - lastTime) * 0.001, 0.033); // Cap at 30fps
    lastTime = currentTime;

    switch (currentThemeAnimType) {
      // Retrowave Sunset (materialTime)
      case "materialTime":
        objectsToAnimate.forEach((m) => {
          if (m.uniforms?.time) m.uniforms.time.value = t;
          if (m.uniforms?.uOffset) m.uniforms.uOffset.value += 15 * dt;
        });
        break;

      // Old TV Noise (materialTimeRes)
      case "materialTimeRes":
        objectsToAnimate.forEach((m) => {
          if (m.uniforms?.time) m.uniforms.time.value = t;
          if (m.uniforms?.u_resolution)
            m.uniforms.u_resolution.value.set(
              window.innerWidth,
              window.innerHeight,
            );
        });
        break;

      // Fluid 2D Simulation
      case "fluid2d":
        objectsToAnimate.forEach((obj) => {
          if (obj.type === "fluid2d" && obj.step) {
            obj.step(t, dt);
          }
        });
        break;

      // DVD Screensaver (bounceDvd)
      case "bounceDvd": {
        const cam = bounceOrthoCam || perspCam;
        const headerPx = document.querySelector(".main-header").clientHeight;
        const footerPx = document.querySelector("footer").clientHeight;
        const screenH = window.innerHeight;

        objectsToAnimate.forEach((obj) => {
          // move
          obj.position.add(obj.userData.velocity);

          // bounds
          const halfW = cam.right;
          const halfH = cam.top;
          const headerWorld = (headerPx / screenH) * (halfH * 2);
          const footerWorld = (footerPx / screenH) * (halfH * 2);
          const hsW = obj.scale.x / 2;
          const hsH = obj.scale.y / 2;

          const maxX = halfW - hsW,
            minX = -halfW + hsW;
          const maxY = halfH - headerWorld - hsH;
          const minY = -halfH + footerWorld + hsH;

          // bounce X
          if (obj.position.x > maxX) {
            obj.position.x = maxX;
            obj.userData.velocity.x *= -1;
            obj.material.color.setHex(Math.random() * 0xffffff);
          } else if (obj.position.x < minX) {
            obj.position.x = minX;
            obj.userData.velocity.x *= -1;
            obj.material.color.setHex(Math.random() * 0xffffff);
          }

          // bounce Y
          if (obj.position.y > maxY) {
            obj.position.y = maxY;
            obj.userData.velocity.y *= -1;
            obj.material.color.setHex(Math.random() * 0xffffff);
          } else if (obj.position.y < minY) {
            obj.position.y = minY;
            obj.userData.velocity.y *= -1;
            obj.material.color.setHex(Math.random() * 0xffffff);
          }
        });
        break;
      }
    }

    // choose correct camera
    const renderCam =
      currentThemeAnimType === "bounceDvd" && bounceOrthoCam
        ? bounceOrthoCam
        : perspCam;
    renderer.render(scene, renderCam);

    if (stats) stats.end();
  }

  // theme switcher handler
  themeSwitcher?.addEventListener("change", (e) => {
    loadTheme(e.target.value);
    try {
      localStorage.setItem("selectedTheme", e.target.value);
    } catch {}
  });

  // on resize
  window.addEventListener("resize", () => {
    perspCam.aspect = window.innerWidth / window.innerHeight;
    perspCam.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    loadTheme(themeSwitcher.value);
  });

  // initial theme
  let initial = "sunset";
  try {
    const saved = localStorage.getItem("selectedTheme");
    if (saved && themes[saved]) initial = saved;
  } catch {}
  themeSwitcher.value = initial;
  loadTheme(initial);

  animate(0);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThreeJS);
} else {
  initThreeJS();
}
