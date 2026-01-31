// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import * as THREE from "three";

export function createOrthoCam(perspCam, themeObj) {
  const targetObj = themeObj.sprite || themeObj;
  const depth = Math.abs(perspCam.position.z - targetObj.position.z);
  const vHeight =
    2 * Math.tan(THREE.MathUtils.degToRad(perspCam.fov / 2)) * depth;
  const vWidth = vHeight * perspCam.aspect;
  const halfW = vWidth / 2,
    halfH = vHeight / 2;

  const cam = new THREE.OrthographicCamera(
    -halfW,
    halfW,
    halfH,
    -halfH,
    perspCam.near,
    perspCam.far,
  );

  cam.position.copy(perspCam.position);
  cam.lookAt(0, 0, 0);
  return cam;
}
