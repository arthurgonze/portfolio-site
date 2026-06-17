// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { ShaderThemeBase } from "../background/ShaderThemeBase.js";

/**
 * Theme metadata for the retrowave sunset background.
 */
export const themeMeta = {
  id: "sunset",
  label: "Retrowave Sunset",
  order: 10,
};

/**
 * Creates the retrowave sunset theme instance.
 * @param {object} context
 * @returns {RetrowaveSunsetTheme}
 */
export function createTheme(context) {
  return new RetrowaveSunsetTheme(context);
}

// ---- Terrain shaders ----
// The terrain is a deformed road plane; the fragment shader adds the grid and
// distance fog that sell the retro perspective shot.
const vertexShader = `
	precision mediump float;

	uniform float time;
	uniform float uSpeed;
	uniform float uNoiseFrequency;
	uniform float uWaveHeight;
	uniform float uRoadWidth;

	varying vec3 vWorldPosition;
	varying vec2 vUv;

	float hash_2D(vec2 p) {
		return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
	}

	float noise_2D(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p) * 0.25;
		vec2 u = f*f*(3.0 - 2.0*f);
		float a = hash_2D(i + vec2(0.0,0.0));
		float b = hash_2D(i + vec2(1.0,0.0));
		float c = hash_2D(i + vec2(0.0,1.0));
		float d = hash_2D(i + vec2(1.0,1.0));
		return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
	}

	void main() {
		vUv = uv;
		vec2 terrainNoiseUv = vec2(uv.x, uv.y + time * uSpeed) * uNoiseFrequency;
		// Shape the noise so the road undulates without becoming too chaotic.
		float terrainNoise = pow(noise_2D(terrainNoiseUv), 2.5);
		float roadMask = smoothstep(0.0, 1.0, abs(position.x) / uRoadWidth);
		vec3 deformedPosition = position;
		deformedPosition.z += terrainNoise * uWaveHeight * roadMask;
		vec4 worldPosition = modelMatrix * vec4(deformedPosition, 1.0);
		vWorldPosition = worldPosition.xyz;
		gl_Position = projectionMatrix * viewMatrix * worldPosition;
	}`;

const fragmentShader = `
	uniform float uFogNearZ;
	uniform float uFogFarZ;
	uniform vec3  uFogTint;

	precision mediump float;

	uniform float time;
	uniform float uGridStep;
	uniform float uGridLineWidth;
	uniform vec3  uGridColor;
	uniform vec3  uBaseColor;

	varying vec3 vWorldPosition;

	float drawGrid(vec2 gridUv, float lineWidth) {
		vec2 cellDistance = abs(fract(gridUv) - 0.5);
		// Use fwidth so the grid stays anti-aliased as it recedes.
		vec2 antiAliasWidth = fwidth(gridUv);
		vec2 lineCoverage = smoothstep(
			antiAliasWidth * (lineWidth - 0.5),
			antiAliasWidth * (lineWidth + 0.5),
			cellDistance
		);
		return 1.0 - min(lineCoverage.x, lineCoverage.y);
	}

	void main() {
		vec2 gridCoords = vWorldPosition.xz / uGridStep;
		gridCoords.y -= time * 0.5;
		float gridMask = drawGrid(gridCoords, uGridLineWidth);
		vec3 baseColor = mix(uBaseColor, uGridColor, gridMask);
		vec4 terrainColor = vec4(baseColor, 1.0);
		// More negative Z is farther away, so fog grows as the road recedes.
		float fogAmount = 1.0 - smoothstep(uFogFarZ, uFogNearZ, vWorldPosition.z);
		vec3 finalColor = mix(terrainColor.rgb, uFogTint, fogAmount);
		gl_FragColor = vec4(finalColor, 1.0);
	}`;

// ---- Sun shader ----
// The sun is a separate decorative mesh so the stripes, glow, and disc mask can
// be tuned independently from the terrain.
function createRadialStripedSun() {
  const uniforms = {
    time: { value: 0 },
    uStripeCount: { value: 6.0 },
    uStripeThickness: { value: 0.9 },
    uStripeFade: { value: 0.7 },
    uStripeStart: { value: 0.7 },
    uTopColor: { value: new THREE.Color(1.0, 0.95, 0.2) },
    uBottomColor: { value: new THREE.Color(0.8, 0.1, 0.5) },
    uGlowColor: { value: new THREE.Color(0.8, 0.1, 0.5) },
    uGlowRadius: { value: 0.75 },
    uGlowIntensity: { value: 0.5 },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
	}`,
    fragmentShader: `
	precision mediump float;
	uniform float time, uStripeCount, uStripeThickness, uStripeFade, uStripeStart;
	uniform vec3 uTopColor, uBottomColor, uGlowColor;
	uniform float uGlowRadius, uGlowIntensity;
	varying vec2 vUv;

	void main() {
		vec2 sunCenter = vUv - 0.5;
		float radius = length(sunCenter);
		float discMask = 1.0 - smoothstep(0.48, 0.5, radius);
		// Modulo keeps the stripes looping, step carves out each band.
		float stripePhase = mod(vUv.y * uStripeCount + time * 0.2, 1.0);
		float stripeMask = step(uStripeThickness, stripePhase);
		float stripeBlend = smoothstep(uStripeStart - 0.01, uStripeStart + 0.01, vUv.y);
		float stripeAlpha = mix(1.0 - stripeMask * uStripeFade, 1.0, stripeBlend);
		vec3 baseColor = mix(uBottomColor, uTopColor, vUv.y);
		float glowMask = clamp((uGlowRadius - radius) / (uGlowRadius - 0.5), 0.0, 1.0);
		float glowAlpha = glowMask * uGlowIntensity;
		vec4 glowColor = vec4(uGlowColor, glowAlpha);
		vec4 sunColor = vec4(baseColor, discMask * stripeAlpha);
		gl_FragColor = mix(glowColor, sunColor, discMask);
	}`,
  });
}

// ---- Gradient sky ----
// The sky is baked once into a canvas texture so the background stays cheap.
function createGradientSky() {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0.0, "#1e002a");
  gradient.addColorStop(0.25, "#3e0040");
  gradient.addColorStop(0.5, "#7f007f");
  gradient.addColorStop(0.75, "#ff0088");
  gradient.addColorStop(1.0, "#ffcc00");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(400, 250),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
}

/**
 * Retrowave sunset background that intentionally owns a perspective camera.
 */
class RetrowaveSunsetTheme extends ShaderThemeBase {
  /**
   * @param {object} context
   */
  constructor(context) {
    super(context, themeMeta.id);

    // Intentional exception: this theme keeps its own perspective camera so the
    // horizon composition reads correctly under the shared renderer.
    this.camera = new THREE.PerspectiveCamera(
      75,
      context.viewport.aspect,
      0.1,
      1000,
    );
    this.camera.position.set(0, 3, 10);
    this.camera.lookAt(0, 0, 0);

    this.setSceneFog(new THREE.FogExp2(0xff3399, 0.0008));
    this.setClearColor(0x0b0011);

    this.terrainMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        uSpeed: { value: 0.1 },
        uNoiseFrequency: { value: 50.0 },
        uWaveHeight: { value: 20.0 },
        uRoadWidth: { value: 30.0 },
        uGridStep: { value: 2.0 },
        uGridLineWidth: { value: 0.5 },
        uGridColor: { value: new THREE.Color("#ff00aa") },
        uBaseColor: { value: new THREE.Color("#1b0044") },
        uFogNearZ: { value: -120.0 },
        uFogFarZ: { value: -130.0 },
        uFogTint: { value: new THREE.Color(0.8, 0.8, 0.85) },
      },
      side: THREE.DoubleSide,
    });

    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(256, 256, 128, 128),
      this.terrainMaterial,
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -2;
    this.add(terrain);

    this.sunMaterial = createRadialStripedSun();
    const sun = new THREE.Mesh(new THREE.CircleGeometry(32, 64), this.sunMaterial);
    sun.position.set(0, 20, -150);
    this.add(sun);

    // The baked sky keeps the background readable without another shader pass.
    this.add(createGradientSky());

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    const roadHalfWidth = 1;
    const starSpreadX = 500;
    // Keep stars out of the road corridor so the center line stays open.
    for (let i = 0; i < starCount; i++) {
      let x;
      do {
        x = (Math.random() * 2 - 1) * starSpreadX;
      } while (Math.abs(x) < roadHalfWidth);
      starPositions[3 * i + 0] = x;
      starPositions[3 * i + 1] = Math.random() * 100 + 10;
      starPositions[3 * i + 2] = -140 - Math.random() * 300;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.add(new THREE.Points(starGeometry, starMaterial));

    // Fog is a soft horizon plane layered behind the terrain and sun.
    this.fogMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        uFogNoiseSpeed: { value: 0.0 },
        uFogOpacity: { value: 1.5 },
        uFogTint: { value: new THREE.Color(0.8, 0.8, 0.85) },
      },
      vertexShader: `
	varying vec2 vUv;
	void main(){
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
	}`,
      fragmentShader: `
	precision mediump float;
	varying vec2 vUv;
	uniform float time, uFogNoiseSpeed, uFogOpacity;
	uniform vec3 uFogTint;

	float hash_2D(vec2 p){
		return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
	}

	float noise_2D(vec2 p){
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f*f*(3.0-2.0*f);
		float a = hash_2D(i);
		float b = hash_2D(i+vec2(1.0,0.0));
		float c = hash_2D(i+vec2(0.0,1.0));
		float d = hash_2D(i+vec2(1.0,1.0));
		return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
	}
	
	float fbm(vec2 p){
		float f = 0.0;
		// fbm layers several noise octaves into the soft fog bank.
		f += 0.5   * noise_2D(p*1.0 - time*uFogNoiseSpeed);
		f += 0.25  * noise_2D(p*2.0 - time*uFogNoiseSpeed*1.3);
		f += 0.125 * noise_2D(p*4.0 - time*uFogNoiseSpeed*1.7);
		return f;
	}

	void main(){
		float fogNoise = fbm(vUv * vec2(1.5,1.0));
		float horizonMask = smoothstep(0.0,0.1,vUv.y) * (1.0 - smoothstep(0.8,1.0,vUv.y));
		float fogAlpha = fogNoise * horizonMask * uFogOpacity;
		gl_FragColor = vec4(uFogTint, fogAlpha);
	}`,
    });
    const fogMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 40, 1, 1),
      this.fogMaterial,
    );
    fogMesh.position.set(0, -10, -140);
    this.add(fogMesh);
  }

  /**
   * @param {number} time
   * @param {number} deltaTime
   */
  update(time, deltaTime) {
    this.terrainMaterial.uniforms.time.value = time;
    this.sunMaterial.uniforms.time.value = time;
    this.fogMaterial.uniforms.time.value = time;
    if (this.terrainMaterial.uniforms?.uOffset) {
      this.terrainMaterial.uniforms.uOffset.value += 15 * deltaTime;
    }
  }

  /**
   * @param {object} viewport
   */
  resize(viewport) {
    super.resize(viewport);
    this.camera.aspect = viewport.aspect;
    this.camera.updateProjectionMatrix();
  }
}
