// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { getThemeConfig, themes } from "../themeConfig.js";
import {
  getStoredTheme,
  populateThemeDropdown,
  saveTheme,
} from "../themeSwitcher.js";
import { showToast } from "../utils/errorHandling.js";

/**
 * @typedef {object} ThemeContext
 * @property {typeof import("three")} THREE
 * @property {HTMLCanvasElement} canvas
 * @property {import("three").WebGLRenderer} renderer
 * @property {import("three").Scene} scene
 * @property {import("three").Camera} camera
 * @property {object} viewport
 * @property {string} [themeId]
 * @property {ThemeDefinition} [themeMeta]
 */

/**
 * @typedef {object} ThemeInstance
 * @property {import("three").Camera} [camera]
 * @property {(time:number, deltaTime:number) => void} update
 * @property {(viewport: object) => void} resize
 * @property {() => void} dispose
 */

/**
 * @typedef {object} ThemeDefinition
 * @property {string} id
 * @property {string} label
 * @property {number} [order]
 * @property {string} [displayName]
 * @property {(context: ThemeContext) => ThemeInstance | Promise<ThemeInstance>} createTheme
 */

/**
 * Manages available background themes, persistence, and the active theme lifecycle.
 */
export class ThemeManager {
  /**
   * @param {object} options
   * @param {typeof import("three")} options.THREE
   * @param {HTMLCanvasElement} options.canvas
   * @param {import("three").WebGLRenderer} options.renderer
   * @param {import("three").Scene} options.scene
   * @param {import("three").Camera} options.camera
   * @param {object} options.viewport
   * @param {HTMLSelectElement | null} [options.themeSelect]
   * @param {string} [options.storageKey]
   * @param {string} [options.defaultThemeId]
   * @param {Record<string, ThemeDefinition>} [options.themeRegistry]
   */
  constructor({
    THREE,
    canvas,
    renderer,
    scene,
    camera,
    viewport,
    themeSelect = null,
    storageKey = "selectedTheme",
    defaultThemeId = "sunset",
    themeRegistry = themes,
  }) {
    this.THREE = THREE;
    this.canvas = canvas;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.viewport = viewport;
    this.themeSelect = themeSelect;
    this.storageKey = storageKey;
    this.defaultThemeId = defaultThemeId;
    this.themeRegistry = themeRegistry;

    this.activeTheme = null;
    this.activeThemeId = null;
    this._boundThemeChange = this._handleThemeChange.bind(this);
  }

  /**
   * Populates the theme selector and activates the stored or default theme.
   */
  async init() {
    if (this.themeSelect) {
      populateThemeDropdown(this.themeSelect);
      this.themeSelect.addEventListener("change", this._boundThemeChange);
    }

    const initialThemeId = getStoredTheme();
    await this.activateTheme(initialThemeId, { persist: false });
  }

  /**
   * Activates a theme by id and disposes the previously active theme.
   * @param {string} themeId
   * @param {object} [options]
   * @param {boolean} [options.persist=true]
   * @returns {Promise<ThemeInstance>}
   */
  async activateTheme(themeId, { persist = true } = {}) {
    const themeDefinition = getThemeConfig(themeId) || this.themeRegistry[this.defaultThemeId];
    if (!themeDefinition) {
      throw new Error(`No theme registered for "${themeId}".`);
    }

    const resolvedThemeId = themeDefinition.id;

    if (this.activeThemeId === resolvedThemeId && this.activeTheme) {
      if (this.themeSelect) {
        this.themeSelect.value = resolvedThemeId;
      }
      if (persist) {
        saveTheme(resolvedThemeId);
      }
      return this.activeTheme;
    }

    this._disposeActiveTheme();

    try {
      const nextTheme = /** @type {ThemeInstance} */ (await Promise.resolve(
        themeDefinition.createTheme(this._createContext(themeDefinition)),
      ));

      this._assertThemeContract(nextTheme, resolvedThemeId);
      this.activeTheme = nextTheme;
      this.activeThemeId = resolvedThemeId;
      this.activeTheme.resize(this.viewport);

      if (this.themeSelect) {
        this.themeSelect.value = resolvedThemeId;
      }
      if (persist) {
        saveTheme(resolvedThemeId);
      }

      return nextTheme;
    } catch (err) {
      console.error(`Failed to activate theme "${resolvedThemeId}":`, err);
      showToast(`Failed to load "${resolvedThemeId}" theme. Using fallback.`, "error");

      if (resolvedThemeId !== this.defaultThemeId) {
        return this.activateTheme(this.defaultThemeId, { persist });
      }

      throw err;
    }
  }

  /**
   * Forwards frame updates to the active theme.
   * @param {number} time
   * @param {number} deltaTime
   */
  update(time, deltaTime) {
    this.activeTheme?.update?.(time, deltaTime);
  }

  /**
   * Forwards viewport resize updates to the active theme.
   * @param {object} viewport
   */
  resize(viewport) {
    this.viewport = viewport;
    this.activeTheme?.resize?.(viewport);
  }

  /**
   * Returns the camera that should be used for rendering the active theme.
   * Themes may expose their own camera to opt out of the shared orthographic rig.
   * @returns {import("three").Camera}
   */
  getRenderCamera() {
    return this.activeTheme?.camera || this.camera;
  }

  /**
   * Disposes the active theme and removes the selector listener.
   */
  dispose() {
    this._disposeActiveTheme();
    if (this.themeSelect) {
      this.themeSelect.removeEventListener("change", this._boundThemeChange);
    }
  }

  /**
   * Creates the shared theme context object.
   * @param {ThemeDefinition} themeDefinition
   * @returns {ThemeContext}
   * @private
   */
  _createContext(themeDefinition) {
    return {
      THREE: this.THREE,
      canvas: this.canvas,
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      viewport: this.viewport,
      themeId: themeDefinition.id,
      themeMeta: themeDefinition,
    };
  }

  /**
   * Ensures the active theme object matches the expected contract.
   * @param {unknown} theme
   * @param {string} themeId
   * @private
   */
  _assertThemeContract(theme, themeId) {
    const typedTheme = /** @type {ThemeInstance | null | undefined} */ (theme);
    if (
      !typedTheme ||
      typeof typedTheme.update !== "function" ||
      typeof typedTheme.resize !== "function" ||
      typeof typedTheme.dispose !== "function"
    ) {
      throw new Error(`Theme "${themeId}" did not return a valid theme instance.`);
    }
  }

  /**
   * Handles selector change events.
   * @param {Event} event
   * @private
   */
  _handleThemeChange(event) {
    const target = /** @type {HTMLSelectElement} */ (event.target);
    void this.activateTheme(target.value);
  }

  /**
   * Disposes the active theme, if any.
   * @private
   */
  _disposeActiveTheme() {
    if (!this.activeTheme) {
      return;
    }

    try {
      this.activeTheme.dispose();
    } catch (err) {
      console.error(`Failed to dispose theme "${this.activeThemeId}":`, err);
    } finally {
      this.activeTheme = null;
      this.activeThemeId = null;
    }
  }
}
