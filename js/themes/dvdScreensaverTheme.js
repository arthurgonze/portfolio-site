// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { BASE_PATH } from "../config.js";
import { ShaderThemeBase } from "../background/ShaderThemeBase.js";

/**
 * Theme metadata for the DVD screensaver background.
 */
export const themeMeta = {
  id: "dvdScreensaver",
  label: "DVD Screensaver",
  order: 30,
};

/**
 * Creates the DVD screensaver theme instance.
 * @param {object} context
 */
export function createTheme(context) {
  return new DvdScreensaverTheme(context);
}

class DvdScreensaverTheme extends ShaderThemeBase {
  /**
   * @param {object} context
   */
  constructor(context) {
    super(context, themeMeta.id);

    this.textureLoader = new THREE.TextureLoader();
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    this.sprite.center.set(0.5, 0.5);
    this.sprite.position.set(0, -2, 0);
    this.sprite.userData.velocity = new THREE.Vector3(0.08, 0.06, 0);
    this.add(this.sprite);

    this._bounds = {
      minX: -1,
      maxX: 1,
      minY: -1,
      maxY: 1,
    };

    this._loadLogo();
    this.resize(context.viewport);
  }

  /**
   * @param {number} _time
   * @param {number} deltaTime
   */
  update(_time, deltaTime) {
    if (!this.sprite.material.map) {
      return;
    }

    const frameScale = deltaTime > 0 ? deltaTime * 60 : 1;
    this.sprite.position.addScaledVector(this.sprite.userData.velocity, frameScale);

    this._handleBounds();
  }

  /**
   * @param {object} viewport
   */
  resize(viewport) {
    super.resize(viewport);
    this.camera = /** @type {THREE.OrthographicCamera} */ (this.camera);
    this._updateBounds();
  }

  /**
   * Loads the DVD logo texture and updates the sprite when ready.
   * @private
   */
  _loadLogo() {
    this.textureLoader.load(
      `${BASE_PATH}images/dvd-logo.png`,
      (texture) => {
        if (this._disposed) {
          texture.dispose();
          return;
        }

        const { width, height } = texture.image;
        const targetHeight = 2;

        this.sprite.material.map = texture;
        this.sprite.material.alphaTest = 0.5;
        this.sprite.material.opacity = 1;
        this.sprite.material.needsUpdate = true;
        this.sprite.scale.set((width / height) * targetHeight, targetHeight, 1);
        this._updateBounds();
      },
      undefined,
      (err) => console.error("Failed to load DVD logo:", err),
    );
  }

  /**
   * Recomputes the playable area using the shared orthographic camera.
   * @private
   */
  _updateBounds() {
    const headerPx = document.querySelector(".main-header")?.clientHeight || 0;
    const footerPx = document.querySelector("footer")?.clientHeight || 0;
    const camera = /** @type {THREE.OrthographicCamera} */ (this.camera);
    const visibleHeight = camera.top - camera.bottom;
    const visibleWidth = camera.right - camera.left;
    const headerWorld = (headerPx / Math.max(this.viewport.height, 1)) * visibleHeight;
    const footerWorld = (footerPx / Math.max(this.viewport.height, 1)) * visibleHeight;
    const halfSpriteWidth = this.sprite.scale.x / 2;
    const halfSpriteHeight = this.sprite.scale.y / 2;

    this._bounds.minX = -visibleWidth / 2 + halfSpriteWidth;
    this._bounds.maxX = visibleWidth / 2 - halfSpriteWidth;
    this._bounds.minY = -visibleHeight / 2 + footerWorld + halfSpriteHeight;
    this._bounds.maxY = visibleHeight / 2 - headerWorld - halfSpriteHeight;
  }

  /**
   * Applies bounce behavior against the current viewport bounds.
   * @private
   */
  _handleBounds() {
    const { minX, maxX, minY, maxY } = this._bounds;
    const sprite = this.sprite;

    if (sprite.position.x > maxX) {
      sprite.position.x = maxX;
      sprite.userData.velocity.x *= -1;
      sprite.material.color.setHex(Math.floor(Math.random() * 0xffffff));
    } else if (sprite.position.x < minX) {
      sprite.position.x = minX;
      sprite.userData.velocity.x *= -1;
      sprite.material.color.setHex(Math.floor(Math.random() * 0xffffff));
    }

    if (sprite.position.y > maxY) {
      sprite.position.y = maxY;
      sprite.userData.velocity.y *= -1;
      sprite.material.color.setHex(Math.floor(Math.random() * 0xffffff));
    } else if (sprite.position.y < minY) {
      sprite.position.y = minY;
      sprite.userData.velocity.y *= -1;
      sprite.material.color.setHex(Math.floor(Math.random() * 0xffffff));
    }
  }
}
