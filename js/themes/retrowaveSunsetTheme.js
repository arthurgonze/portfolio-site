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
		vec2 scrollUV = vec2(uv.x, uv.y + time * uSpeed) * uNoiseFrequency;
		float n = pow(noise_2D(scrollUV), 2.5);
		float roadFactor = smoothstep(0.0, 1.0, abs(position.x) / uRoadWidth);
		vec3 pos = position;
		pos.z += n * uWaveHeight * roadFactor;
		vec4 worldPos = modelMatrix * vec4(pos, 1.0);
		vWorldPosition = worldPos.xyz;
		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}`;

const fragmentShader = `
	uniform float uFogStart;
	uniform float uFogEnd;
	uniform vec3  uFogColor;

	precision mediump float;

	uniform float time;
	uniform float uGridStep;
	uniform float uGridLineWidth;
	uniform vec3  uGridColor;
	uniform vec3  uBaseColor;

	varying vec3 vWorldPosition;

	float drawGrid(vec2 c, float w) {
		vec2 grid = abs(fract(c) - 0.5);
		vec2 d    = fwidth(c);
		vec2 lines= smoothstep(d * (w - 0.5), d * (w + 0.5), grid);
		return 1.0 - min(lines.x, lines.y);
	}

	void main() {
		vec2 coord = vWorldPosition.xz / uGridStep;
		coord.y -= time * 0.5;
		float g = drawGrid(coord, uGridLineWidth);
		vec3 color = mix(uBaseColor, uGridColor, g);
		vec4 base = vec4(color, 1.0);
		float f = smoothstep(uFogStart, uFogEnd, vWorldPosition.z);
		vec3 finalCol = mix(base.rgb, uFogColor, f);
		gl_FragColor = vec4(finalCol, 1.0);
	}`;

// ---- Sun shader ----
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
		vec2 c = vUv - 0.5;
		float r = length(c);
		float mask = smoothstep(0.5, 0.48, r);
		float m = mod(vUv.y * uStripeCount + time * 0.2, 1.0);
		float stripe = step(uStripeThickness, m);
		float region = smoothstep(uStripeStart - 0.01, uStripeStart + 0.01, vUv.y);
		float faded = 1.0 - stripe * uStripeFade;
		float stripeAlpha = mix(faded, 1.0, region);
		vec3 baseCol = mix(uBottomColor, uTopColor, vUv.y);
		float glowMask = clamp((uGlowRadius - r) / (uGlowRadius - 0.5), 0.0, 1.0);
		float glowAlpha = glowMask * uGlowIntensity;
		vec4 glowCol = vec4(uGlowColor, glowAlpha);
		vec4 sunCol = vec4(baseCol, mask * stripeAlpha);
		gl_FragColor = mix(glowCol, sunCol, mask);
	}`,
  });
}

// ---- Gradient sky ----
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
        uFogStart: { value: -120.0 },
        uFogEnd: { value: -130.0 },
        uFogColor: { value: new THREE.Color(0.8, 0.8, 0.85) },
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

    this.add(createGradientSky());

    const starGeo = new THREE.BufferGeometry();
    const starCount = 500;
    const starsPos = new Float32Array(starCount * 3);
    const roadW = 1;
    const spreadX = 500;
    for (let i = 0; i < starCount; i++) {
      let x;
      do {
        x = (Math.random() * 2 - 1) * spreadX;
      } while (Math.abs(x) < roadW);
      starsPos[3 * i + 0] = x;
      starsPos[3 * i + 1] = Math.random() * 100 + 10;
      starsPos[3 * i + 2] = -140 - Math.random() * 300;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starsPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.add(new THREE.Points(starGeo, starMat));

    this.fogMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        speed: { value: 0.0 },
        baseOpacity: { value: 1.5 },
        fogColor: { value: new THREE.Color(0.8, 0.8, 0.85) },
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
	uniform float time, speed, baseOpacity;
	uniform vec3 fogColor;

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
		f += 0.5   * noise_2D(p*1.0 - time*speed);
		f += 0.25  * noise_2D(p*2.0 - time*speed*1.3);
		f += 0.125 * noise_2D(p*4.0 - time*speed*1.7);
		return f;
	}

	void main(){
		float c = fbm(vUv * vec2(1.5,1.0));
		float yf = smoothstep(0.0,0.1,vUv.y) * (1.0 - smoothstep(0.8,1.0,vUv.y));
		float alpha = c * yf * baseOpacity;
		gl_FragColor = vec4(fogColor, alpha);
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
