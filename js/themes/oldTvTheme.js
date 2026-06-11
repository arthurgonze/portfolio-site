// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { ShaderThemeBase } from "../background/ShaderThemeBase.js";

/**
 * Theme metadata for the old TV noise background.
 */
export const themeMeta = {
  id: "oldTvNoise",
  label: "Old TV Noise",
  order: 20,
};

/**
 * Creates the old TV noise theme instance.
 * @param {object} context
 */
export function createTheme(context) {
  return new OldTvNoiseTheme(context);
}

class OldTvNoiseTheme extends ShaderThemeBase {
  /**
   * @param {object} context
   */
  constructor(context) {
    super(context, themeMeta.id);

    this.noiseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(context.viewport.width, context.viewport.height),
        },
        u_scan_speed: { value: 0.25 },
        u_bg_noise_amount: { value: 0.2 },
        u_line_noise_amount: { value: 0.5 },
        u_line_thickness: { value: 0.001 },
      },
      vertexShader: `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}`,
      fragmentShader: `
	uniform float time;
	uniform float u_scan_speed;
	uniform float u_bg_noise_amount;
	uniform float u_line_noise_amount;
	uniform float u_line_thickness;
	varying vec2 vUv;

	float random(vec2 st) {
		return fract(sin(dot(st, vec2(12.9898,78.233))) * 43758.5453123);
	}

	void main() {
		float bgNoiseVal = pow(random(vUv * 80.0 + floor(time * 5.0)), 10.0) * u_bg_noise_amount;
		float lineY = fract(time * u_scan_speed);
		float lineIntensity = smoothstep(lineY - u_line_thickness, lineY, vUv.y) - smoothstep(lineY, lineY + u_line_thickness, vUv.y);
		float lineNoiseFactor = random(vec2(vUv.x * 15.0, floor(time * 15.0)));
		float noisyLineVal = lineIntensity * ((1.0 - u_line_noise_amount) + lineNoiseFactor * u_line_noise_amount);

		float gray = clamp(0.05 + bgNoiseVal + noisyLineVal, 0.0, 1.0);
		gl_FragColor = vec4(vec3(gray), 1.0);
	}`,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const screenQuad = new THREE.Mesh(geometry, this.noiseMaterial);
    screenQuad.frustumCulled = false;
    this.add(screenQuad);
  }

  /**
   * @param {number} time
   * @param {number} _deltaTime
   */
  update(time, _deltaTime) {
    this.noiseMaterial.uniforms.time.value = time;
    this.noiseMaterial.uniforms.u_resolution.value.set(
      this.viewport.width,
      this.viewport.height,
    );
  }

  /**
   * @param {object} viewport
   */
  resize(viewport) {
    super.resize(viewport);
    this.noiseMaterial.uniforms.u_resolution.value.set(
      viewport.width,
      viewport.height,
    );
  }
}
