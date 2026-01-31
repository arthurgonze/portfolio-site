// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";

/* =======================================================================
   Retrowave Sunset Theme
   ======================================================================= */

// ---- 1) TERRAIN SHADERS ----
const vertexShader = `
	precision mediump float;

	uniform float time;
	uniform float uSpeed;
	uniform float uNoiseFrequency;
	uniform float uWaveHeight;
	uniform float uRoadWidth;

	varying vec3 vWorldPosition;
	varying vec2 vUv;

	// Simple 2D hash
	float hash_2D(vec2 p) {
		return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
	}

	// Value-noise function
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

		// Scroll noise along Y only
		vec2 scrollUV = vec2(uv.x, uv.y + time * uSpeed) * uNoiseFrequency;
		float n = pow(noise_2D(scrollUV), 2.5);

		// Taper mountains toward the center
		float roadFactor = smoothstep(0.0, 1.0, abs(position.x) / uRoadWidth);

		// Displace Z
		vec3 pos = position;
		pos.z += n * uWaveHeight * roadFactor;

		// Transform
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

	// Anti-aliased grid generator
	float drawGrid(vec2 c, float w) {
		vec2 grid = abs(fract(c) - 0.5);
		vec2 d    = fwidth(c);
		vec2 lines= smoothstep(d * (w - 0.5), d * (w + 0.5), grid);
		return 1.0 - min(lines.x, lines.y);
	}

	void main() {
		vec2 coord = vWorldPosition.xz / uGridStep;
		coord.y -= time * 0.5;  // scroll

		float g = drawGrid(coord, uGridLineWidth);
		vec3 color = mix(uBaseColor, uGridColor, g);
		vec4 base = vec4(color, 1.0);

		// horizon fog factor
		float f = smoothstep(uFogStart, uFogEnd, vWorldPosition.z);
		vec3 finalCol = mix(base.rgb, uFogColor, f);
		gl_FragColor = vec4(finalCol, 1.0);
	}`;

// ---- 2) SCENE SETUP ----
export function setupSunsetScene(themeGroup) {
  const scene = themeGroup.parent;

  // 2a) Exponential fog on entire scene
  scene.fog = new THREE.FogExp2(0xff3399, 0.0008);
  if (scene.renderer) scene.renderer.setClearColor(0x0b0011);

  // 2b) Ground Plane with custom shader
  const geo = new THREE.PlaneGeometry(256, 256, 128, 128);
  const uniforms = {
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
  };
  const terrainMat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(geo, terrainMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  themeGroup.add(ground);

  // 2c) Striped Sun
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(32, 64),
    createRadialStripedSun(),
  );
  sun.position.set(0, 20, -150);
  themeGroup.add(sun);

  // 2d) Gradient Sky
  themeGroup.add(createGradientSky());

  // 2e) Starfield
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
  const stars = new THREE.Points(starGeo, starMat);
  themeGroup.add(stars);

  // 2f) Cloud-like horizon FOG (procedural FBM on a thin vertical billboard)
  const fogGeo = new THREE.PlaneGeometry(400, 40, 1, 1);
  const fogMat = new THREE.ShaderMaterial({
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

	// 2D hash
	float hash_2D(vec2 p){
		return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
	}

	// single-octave noise
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
	
	// FBM (3 octaves)
	float fbm(vec2 p){
		float f = 0.0;
		f += 0.5   * noise_2D(p*1.0 - time*speed);
		f += 0.25  * noise_2D(p*2.0 - time*speed*1.3);
		f += 0.125 * noise_2D(p*4.0 - time*speed*1.7);
		return f;
	}

	void main(){
		float c = fbm(vUv * vec2(1.5,1.0));
		// fade at top & bottom
		float yf = smoothstep(0.0,0.1,vUv.y) * (1.0 - smoothstep(0.8,1.0,vUv.y));
		float alpha = c * yf * baseOpacity;
		gl_FragColor = vec4(fogColor, alpha);
	}`,
  });
  const fogMesh = new THREE.Mesh(fogGeo, fogMat);
  fogMesh.position.set(0, -10, -140);
  themeGroup.add(fogMesh);

  // 3) Return
  return [
    {
      type: "materialTime",
      update: (t, dt) => {
        terrainMat.uniforms.time.value = t;
        sun.material.uniforms.time.value = t;
        fogMat.uniforms.time.value = t;
        if (terrainMat.uniforms?.uOffset) {
          terrainMat.uniforms.uOffset.value += 15 * dt;
        }
      },
    },
  ];
}

// ---- 4) HELPER: Striped Sun Shader ----
// ---- 2c) Striped Sun w/ gradient and glow ----
function createRadialStripedSun() {
  const uniforms = {
    time: { value: 0 },
    uStripeCount: { value: 6.0 },
    uStripeThickness: { value: 0.9 },
    uStripeFade: { value: 0.7 },
    uStripeStart: { value: 0.7 },

    // new gradient colors
    uTopColor: { value: new THREE.Color(1.0, 0.95, 0.2) },
    uBottomColor: { value: new THREE.Color(0.8, 0.1, 0.5) },

    // glow
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
		// distance from center
		vec2 c = vUv - 0.5;
		float r = length(c);

		// 1) radial sun mask
		float mask = smoothstep(0.5, 0.48, r);

		// 2) stripes
		float m = mod(vUv.y * uStripeCount + time * 0.2, 1.0);
		float stripe = step(uStripeThickness, m);
		
		// apply fade only below uStripeStart
		float region = smoothstep(uStripeStart - 0.01, uStripeStart + 0.01, vUv.y);
		float faded = 1.0 - stripe * uStripeFade;
		float stripeAlpha = mix(faded, 1.0, region);

		// 3) gradient color
		vec3 baseCol = mix(uBottomColor, uTopColor, vUv.y);

		// 4) behind-sun glow
		float glowMask = clamp((uGlowRadius - r) / (uGlowRadius - 0.5), 0.0, 1.0);
		float glowAlpha = glowMask * uGlowIntensity;
		vec4 glowCol = vec4(uGlowColor, glowAlpha);

		// 5) combine: inside sun we see the sun, outside we see the glow
		vec4 sunCol = vec4(baseCol, mask * stripeAlpha);
		gl_FragColor = mix(glowCol, sunCol, mask);
	}`,
  });
}

// ---- 5) HELPER: Gradient Sky ----
function createGradientSky() {
  const c = document.createElement("canvas");
  c.width = 2;
  c.height = 1024;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0.0, "#1e002a");
  g.addColorStop(0.25, "#3e0040");
  g.addColorStop(0.5, "#7f007f");
  g.addColorStop(0.75, "#ff0088");
  g.addColorStop(1.0, "#ffcc00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(400, 250),
    new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
}
