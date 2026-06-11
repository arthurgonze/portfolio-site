// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";

/**
 * Owns the shared orthographic camera and viewport-derived projection bounds.
 */
export class CameraRig {
  /**
   * @param {object} [options]
   * @param {number} [options.designHeight=16]
   * @param {{x:number, y:number, z:number}} [options.position]
   * @param {{x:number, y:number, z:number}} [options.lookAt]
   * @param {number} [options.near=0.1]
   * @param {number} [options.far=1000]
   */
  constructor({
    designHeight = 16,
    position = { x: 0, y: 3, z: 10 },
    lookAt = { x: 0, y: 0, z: 0 },
    near = 0.1,
    far = 1000,
  } = {}) {
    this.designHeight = designHeight;
    this.position = position;
    this.lookAt = lookAt;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, near, far);
    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);

    this.viewport = {
      width: 1,
      height: 1,
      pixelRatio: 1,
      aspect: 1,
      designHeight,
      worldWidth: designHeight,
      worldHeight: designHeight,
    };
  }

  /**
   * Updates the orthographic projection for the supplied viewport.
   * @param {number} width
   * @param {number} height
   * @param {number} [pixelRatio=1]
   * @returns {object}
   */
  resize(width, height, pixelRatio = 1) {
    const safeHeight = Math.max(height, 1);
    const aspect = width / safeHeight;
    const halfHeight = this.designHeight / 2;
    const halfWidth = halfHeight * aspect;

    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();

    this.viewport.width = width;
    this.viewport.height = height;
    this.viewport.pixelRatio = pixelRatio;
    this.viewport.aspect = aspect;
    this.viewport.worldWidth = halfWidth * 2;
    this.viewport.worldHeight = halfHeight * 2;
    return this.viewport;
  }
}
