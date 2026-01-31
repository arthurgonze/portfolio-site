// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { BASE_PATH } from "../config.js";

const loader = new THREE.TextureLoader();

export function setupDvdScreensaverScene(themeGroup) {
  const sprite = new THREE.Sprite();
  sprite.center.set(0.5, 0.5);
  sprite.position.set(0, -2, 0);
  sprite.userData.velocity = new THREE.Vector3(0.08, 0.06, 0);
  themeGroup.add(sprite);

  loader.load(
    `${BASE_PATH}images/dvd-logo.png`,
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

  // return [sprite];
  return [
    {
      type: "bounceDvd",
      sprite: sprite,
      update: (t, dt, cam) => {
        const headerPx = document.querySelector(".main-header").clientHeight;
        const footerPx = document.querySelector("footer").clientHeight;
        const screenH = window.innerHeight;

        // move
        sprite.position.add(sprite.userData.velocity);

        // bounds
        const halfW = cam.right;
        const halfH = cam.top;
        const headerWorld = (headerPx / screenH) * (halfH * 2);
        const footerWorld = (footerPx / screenH) * (halfH * 2);
        const hsW = sprite.scale.x / 2;
        const hsH = sprite.scale.y / 2;

        const maxX = halfW - hsW,
          minX = -halfW + hsW;
        const maxY = halfH - headerWorld - hsH;
        const minY = -halfH + footerWorld + hsH;

        // bounce X
        if (sprite.position.x > maxX) {
          sprite.position.x = maxX;
          sprite.userData.velocity.x *= -1;
          sprite.material.color.setHex(Math.random() * 0xffffff);
        } else if (sprite.position.x < minX) {
          sprite.position.x = minX;
          sprite.userData.velocity.x *= -1;
          sprite.material.color.setHex(Math.random() * 0xffffff);
        }

        // bounce Y
        if (sprite.position.y > maxY) {
          sprite.position.y = maxY;
          sprite.userData.velocity.y *= -1;
          sprite.material.color.setHex(Math.random() * 0xffffff);
        } else if (sprite.position.y < minY) {
          sprite.position.y = minY;
          sprite.userData.velocity.y *= -1;
          sprite.material.color.setHex(Math.random() * 0xffffff);
        }
      },
    },
  ];
}
