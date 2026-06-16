// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { CameraRig } from "./CameraRig.js";
import { ThemeManager } from "./ThemeManager.js";
import { themes } from "./ThemeRegistry.generated.js";

/**
 * Owns the shared Three.js background lifecycle for the site.
 */
export class BackgroundApp {
  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {HTMLSelectElement | null} [options.themeSelect]
   */
  constructor({ canvas, themeSelect = null }) {
    if (!canvas) {
      throw new Error("BackgroundApp requires a #bg-canvas element.");
    }

    this.THREE = THREE;
    this.canvas = canvas;
    this.themeSelect = themeSelect;

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.cameraRig = new CameraRig({
      designHeight: 16,
      position: { x: 0, y: 3, z: 10 },
      lookAt: { x: 0, y: 0, z: 0 },
      near: 0.1,
      far: 1000,
    });

    this.viewport = this.cameraRig.resize(
      window.innerWidth,
      window.innerHeight,
      Math.min(window.devicePixelRatio, 2),
    );

    this.renderer.setSize(this.viewport.width, this.viewport.height, false);

    this.themeManager = new ThemeManager({
      THREE,
      canvas: this.canvas,
      renderer: this.renderer,
      scene: this.scene,
      camera: this.cameraRig.camera,
      viewport: this.viewport,
      themeSelect: this.themeSelect,
      themeRegistry: themes,
      defaultThemeId: "sunset",
    });

    this._lastTime = 0;
    this._frameHandle = 0;
    this._running = false;
    this._boundResize = this._handleResize.bind(this);
    this._boundAnimate = this._animate.bind(this);
  }

  /**
   * Initializes the theme manager and starts the render loop.
   */
  async init() {
    this.resize();
    await this.themeManager.init();
    window.addEventListener("resize", this._boundResize);
    this._running = true;
    this._frameHandle = requestAnimationFrame(this._boundAnimate);
  }

  /**
   * Updates the renderer and camera for the current viewport.
   */
  resize() {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.viewport = this.cameraRig.resize(
      window.innerWidth,
      window.innerHeight,
      pixelRatio,
    );
    this.renderer.setSize(this.viewport.width, this.viewport.height, false);
    this.themeManager.resize(this.viewport);
  }

  /**
   * Stops the animation loop and disposes the active theme.
   */
  dispose() {
    this._running = false;
    cancelAnimationFrame(this._frameHandle);
    window.removeEventListener("resize", this._boundResize);
    this.themeManager.dispose();
    this.renderer.dispose();
  }

  /**
   * Handles viewport resize events.
   * @private
   */
  _handleResize() {
    this.resize();
  }

  /**
   * Main animation loop.
   * @param {number} time
   * @private
   */
  _animate(time) {
    if (!this._running) {
      return;
    }

    const timeSeconds = time * 0.001;
    const deltaTime = this._lastTime === 0 ? 0 : Math.min((time - this._lastTime) * 0.001, 0.033);
    this._lastTime = time;

    this.themeManager.update(timeSeconds, deltaTime);
    this.renderer.render(this.scene, this.themeManager.getRenderCamera());
    this._frameHandle = requestAnimationFrame(this._boundAnimate);
  }
}
