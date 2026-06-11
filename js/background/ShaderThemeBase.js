// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";

/**
 * Base helper for background themes that keeps scene ownership and cleanup
 * localized to the theme instance.
 */
export class ShaderThemeBase {
  /**
   * @param {object} context
   * @param {typeof THREE} context.THREE
   * @param {HTMLCanvasElement} context.canvas
   * @param {THREE.WebGLRenderer} context.renderer
   * @param {THREE.Scene} context.scene
   * @param {THREE.Camera} context.camera
   * @param {object} context.viewport
   * @param {string} [themeId]
   */
  constructor(context, themeId = "theme") {
    this.THREE = context.THREE || THREE;
    this.canvas = context.canvas;
    this.renderer = context.renderer;
    this.scene = context.scene;
    this.camera = context.camera;
    this.viewport = context.viewport;
    this.themeId = themeId;

    this.root = new this.THREE.Group();
    this.root.name = `theme:${themeId}`;
    this.scene.add(this.root);

    this._cleanupCallbacks = [];
    this._disposables = new Set();
    this._disposed = false;

    this._originalFog = this.scene.fog;
    this._originalClearColor = new this.THREE.Color();
    this.renderer.getClearColor(this._originalClearColor);
    this._originalClearAlpha = this.renderer.getClearAlpha();
    this._fogTouched = false;
    this._clearColorTouched = false;
  }

  /**
   * Adds an object to the theme root group.
   * @param {THREE.Object3D} object
   * @returns {THREE.Object3D}
   */
  add(object) {
    this.root.add(object);
    return object;
  }

  /**
   * Tracks a disposable resource owned by the theme.
   * @template T
   * @param {T & { dispose?: () => void }} resource
   * @returns {T}
   */
  trackDisposable(resource) {
    if (resource && typeof resource.dispose === "function") {
      this._disposables.add(resource);
    }
    return resource;
  }

  /**
   * Registers a cleanup callback that runs when the theme is disposed.
   * @param {() => void} callback
   */
  trackCleanup(callback) {
    if (typeof callback === "function") {
      this._cleanupCallbacks.push(callback);
    }
  }

  /**
   * Registers and automatically removes a DOM event listener.
   * @param {EventTarget} target
   * @param {string} type
   * @param {EventListenerOrEventListenerObject} listener
   * @param {AddEventListenerOptions | boolean} [options]
   */
  addEventListener(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this.trackCleanup(() => target.removeEventListener(type, listener, options));
  }

  /**
   * Replaces the shared scene fog while remembering the original value.
   * @param {THREE.Fog | THREE.FogExp2 | null} fog
   * @returns {THREE.Fog | THREE.FogExp2 | null}
   */
  setSceneFog(fog) {
    this.scene.fog = fog;
    this._fogTouched = true;
    return fog;
  }

  /**
   * Replaces the shared renderer clear color while remembering the original.
   * @param {THREE.ColorRepresentation} color
   * @param {number} [alpha]
   */
  setClearColor(color, alpha = this._originalClearAlpha) {
    this.renderer.setClearColor(color, alpha);
    this._clearColorTouched = true;
  }

  /**
   * Default no-op update hook.
   * @param {number} _time
   * @param {number} _deltaTime
   */
  update(_time, _deltaTime) {}

  /**
   * Updates the stored viewport reference.
   * @param {object} viewport
   */
  resize(viewport) {
    this.viewport = viewport;
  }

  /**
   * Disposes the theme-owned scene graph and tracked resources.
   */
  dispose() {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    while (this._cleanupCallbacks.length > 0) {
      const callback = this._cleanupCallbacks.pop();
      try {
        callback();
      } catch (err) {
        console.error(`Error while disposing theme "${this.themeId}":`, err);
      }
    }

    this._disposeObject3D(this.root);
    this.root.clear();
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }

    for (const disposable of this._disposables) {
      try {
        disposable.dispose();
      } catch (err) {
        console.error(`Failed to dispose resource for "${this.themeId}":`, err);
      }
    }
    this._disposables.clear();

    if (this._fogTouched) {
      this.scene.fog = this._originalFog;
    }
    if (this._clearColorTouched) {
      this.renderer.setClearColor(this._originalClearColor, this._originalClearAlpha);
    }
  }

  /**
   * Recursively disposes geometry, materials, and texture references on an object tree.
   * @param {THREE.Object3D} object
   * @private
   */
  _disposeObject3D(object) {
    object.traverse((child) => {
      const typedChild = /** @type {any} */ (child);
      if (typedChild.geometry) {
        typedChild.geometry.dispose();
      }
      if (typedChild.material) {
        this._disposeMaterial(typedChild.material);
      }
    });
  }

  /**
   * Disposes a material and any texture references found on the material or uniforms.
   * @param {THREE.Material | THREE.Material[]} material
   * @private
   */
  _disposeMaterial(material) {
    const materials = Array.isArray(material) ? material : [material];

    for (const entry of materials) {
      if (!entry) {
        continue;
      }

      const typedEntry = /** @type {any} */ (entry);

      for (const value of Object.values(typedEntry)) {
        if (value && value.isTexture) {
          value.dispose();
        }
      }

      if (typedEntry.uniforms) {
        for (const uniform of Object.values(typedEntry.uniforms)) {
          const value = uniform?.value;
          if (value && value.isTexture) {
            value.dispose();
          }
        }
      }

      typedEntry.dispose();
    }
  }
}
