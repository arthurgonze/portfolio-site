// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
const loader = new THREE.TextureLoader();

export function setupDvdScreensaverScene(themeGroup) {
  const sprite = new THREE.Sprite();
  sprite.center.set(0.5, 0.5);
  sprite.position.set(0, -2, 0);
  sprite.userData.velocity = new THREE.Vector3(0.08, 0.06, 0);
  themeGroup.add(sprite);

  loader.load(
    "/images/dvd-logo.png",
    (tex) => {
      const { width: w, height: h } = tex.image;
      const targetH = 2;

      sprite.material = new THREE.SpriteMaterial({
        map: tex,
        color: 0xffffff,
        transparent: true,
        alphaTest: 0.5,
      });

      sprite.scale.set((w / h) * targetH, targetH, 1);
    },
    undefined,
    (err) => console.error("Failed to load DVD logo:", err),
  );

  return [sprite];
}
