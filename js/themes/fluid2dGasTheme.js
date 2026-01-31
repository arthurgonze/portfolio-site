// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";

export function setupFluid2dGasScene(themeGroup) {
  const canvas = document.getElementById("bg-canvas");
  const renderer = themeGroup.renderer;
  if (!renderer || !canvas) return [];

  const sharedQuadGeometry = new THREE.PlaneGeometry(2, 2);
  const tempColor = new THREE.Vector3();

  const config = {
    resolution: 1024,
    velocityDissipation: 0.999,
    densityDissipation: 0.999,
    pressureIterations: 30,
    splatRadius: 0.02,
    velocitySplatRadius: 0.02,
    densitySplatRadius: 0.02,
    targetFPS: 60,
    debugMode: 0, // 0=density, 1=velocity
    ambientForce: {
      frequency: 0.01,
      strength: [200, 500],
      swirl: {
        frequency: 0.01,
        strength: 500,
      },
    },
    getResolution() {
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      return pixelRatio > 1.5 ? 512 : 1024;
    },
  };
  config.resolution = config.getResolution();

  // ========================================================================================
  // WEBGL SETUP
  // ========================================================================================
  const gl = renderer.getContext();
  let floatType = THREE.UnsignedByteType;
  let precision = "mediump";

  if (renderer.capabilities.isWebGL2) {
    const ext = gl.getExtension("EXT_color_buffer_float");
    if (ext) {
      floatType = THREE.FloatType;
      precision = "highp";
      console.log("Using float textures");
    } else {
      const halfExt = gl.getExtension("EXT_color_buffer_half_float");
      if (halfExt) {
        floatType = THREE.HalfFloatType;
        precision = "mediump";
        console.log("Using half-float textures");
      }
    }
  }

  const fboOptions = {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: floatType,
    stencilBuffer: false,
    depthBuffer: false,
  };

  const texelSize = 1.0 / config.resolution;

  // ========================================================================================
  // FIELDS MANAGEMENT
  // ========================================================================================
  const createDoubleFBO = () => ({
    read: new THREE.WebGLRenderTarget(
      config.resolution,
      config.resolution,
      fboOptions,
    ),
    write: new THREE.WebGLRenderTarget(
      config.resolution,
      config.resolution,
      fboOptions,
    ),
    swap() {
      [this.read, this.write] = [this.write, this.read];
    },
  });

  const fields = {
    velocity: createDoubleFBO(),
    density: createDoubleFBO(),
    pressure: createDoubleFBO(),
    divergence: new THREE.WebGLRenderTarget(
      config.resolution,
      config.resolution,
      fboOptions,
    ),
  };

  // ========================================================================================
  // SHADER PROGRAMS
  // ========================================================================================
  const shaders = createShaderPrograms();

  function createShaderPrograms() {
    const simVertex = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}`;

    return {
      advection: new THREE.ShaderMaterial({
        uniforms: {
          uVelocity: { value: null },
          uSource: { value: null },
          uTexelSize: { value: texelSize },
          uDt: { value: 0.05 },
          uDissipation: { value: 0.99 },
        },
        vertexShader: simVertex,
        fragmentShader: `
		precision ${precision} float;
		uniform sampler2D uVelocity, uSource;
		uniform float uTexelSize, uDt, uDissipation;
		varying vec2 vUv;

		void main() {
			vec2 vel = texture2D(uVelocity, vUv).xy;
			vec2 coord = vUv - uDt * vel * uTexelSize;
			coord = clamp(coord, vec2(uTexelSize), vec2(1.0 - uTexelSize));
			gl_FragColor = uDissipation * texture2D(uSource, coord);
		}`,
      }),

      divergence: new THREE.ShaderMaterial({
        uniforms: {
          uVelocity: { value: null },
          uTexelSize: { value: texelSize },
        },
        vertexShader: simVertex,
        fragmentShader: `
		precision ${precision} float;
		uniform sampler2D uVelocity;
		uniform float uTexelSize;
		varying vec2 vUv;

		void main() {
			float L = texture2D(uVelocity, vUv - vec2(uTexelSize, 0.0)).x;
			float R = texture2D(uVelocity, vUv + vec2(uTexelSize, 0.0)).x;
			float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize)).y;
			float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize)).y;
			gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
		}`,
      }),

      jacobi: new THREE.ShaderMaterial({
        uniforms: {
          uPressure: { value: null },
          uDivergence: { value: null },
          uTexelSize: { value: texelSize },
        },
        vertexShader: simVertex,
        fragmentShader: `
		precision ${precision} float;
		uniform sampler2D uPressure, uDivergence;
		uniform float uTexelSize;
		varying vec2 vUv;

		void main() {
			float L = texture2D(uPressure, vUv - vec2(uTexelSize, 0.0)).x;
			float R = texture2D(uPressure, vUv + vec2(uTexelSize, 0.0)).x;
			float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize)).x;
			float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize)).x;
			float C = texture2D(uDivergence, vUv).x;
			gl_FragColor = vec4((L + R + B + T - C) * 0.25, 0.0, 0.0, 1.0);
		}`,
      }),

      gradient: new THREE.ShaderMaterial({
        uniforms: {
          uPressure: { value: null },
          uVelocity: { value: null },
          uTexelSize: { value: texelSize },
        },
        vertexShader: simVertex,
        fragmentShader: `
		precision ${precision} float;
		uniform sampler2D uPressure, uVelocity;
		uniform float uTexelSize;
		varying vec2 vUv;

		void main() {
			float L = texture2D(uPressure, vUv - vec2(uTexelSize, 0.0)).x;
			float R = texture2D(uPressure, vUv + vec2(uTexelSize, 0.0)).x;
			float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize)).x;
			float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize)).x;

			vec2 velocity = texture2D(uVelocity, vUv).xy;
			velocity -= 0.5 * vec2(R - L, T - B);
			gl_FragColor = vec4(velocity, 0.0, 1.0);
		}`,
      }),

      splat: new THREE.ShaderMaterial({
        uniforms: {
          uTarget: { value: null },
          uPoint: { value: new THREE.Vector2(0.5, 0.5) },
          uColor: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
          uRadius: { value: 0.05 },
        },
        vertexShader: simVertex,
        fragmentShader: `
		precision ${precision} float;
		uniform sampler2D uTarget;
		uniform vec2 uPoint;
		uniform vec3 uColor;
		uniform float uRadius;
		varying vec2 vUv;

		void main() {
			vec4 base = texture2D(uTarget, vUv);
			vec2 diff = vUv - uPoint;
			float d = length(diff);
			float splat = exp(-d * d / (uRadius * uRadius));
			gl_FragColor = vec4(base.rgb + splat * uColor, 1.0);
		}`,
      }),

      display: new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          u_resolution: {
            value: new THREE.Vector2(window.innerWidth, window.innerHeight),
          },
          uTexture: { value: null },
          uDebugMode: { value: 0 }, // 0=density, 1=velocity
        },
        vertexShader: `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = vec4(position.xy, 0.0, 1.0);
		}`,
        fragmentShader: `
		precision ${precision} float;
		uniform float time;
		uniform vec2 u_resolution;
		uniform sampler2D uTexture;
		uniform int uDebugMode;
		varying vec2 vUv;

		void main() {
			vec4 data = texture2D(uTexture, vUv);
			vec3 color;

			if (uDebugMode == 1) {
				// Velocity visualization
				vec2 vel = data.xy;
				float speed = length(vel);
				
				// Color based on direction and speed
				color = vec3(
					vel.x * 0.5 + 0.5,
					vel.y * 0.5 + 0.5,
					speed
				);
			} else {
				// Normal density display
				color = pow(data.rgb, vec3(1.2)) * 2.0;
			}
			gl_FragColor = vec4(color, 1.0);
		}`,
        depthTest: false,
        depthWrite: false,
      }),
    };
  }

  // ========================================================================================
  // SCENE SETUP
  // ========================================================================================
  const quad = new THREE.Mesh(sharedQuadGeometry, shaders.display);
  themeGroup.add(quad);

  const simScene = new THREE.Scene();
  const simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const simQuad = new THREE.Mesh(sharedQuadGeometry, null);
  simScene.add(simQuad);

  // ========================================================================================
  // UTILITY FUNCTIONS
  // ========================================================================================
  function renderToTarget(target, material) {
    const oldTarget = renderer.getRenderTarget();
    simQuad.material = material;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(simScene, simCamera);
    renderer.setRenderTarget(oldTarget);
  }

  function clearFields() {
    Object.values(fields).forEach((field) => {
      if (field.read) {
        renderer.setRenderTarget(field.read);
        renderer.clear();
        renderer.setRenderTarget(field.write);
        renderer.clear();
      } else {
        renderer.setRenderTarget(field);
        renderer.clear();
      }
    });
    renderer.setRenderTarget(null);
  }

  // ========================================================================================
  // CFD SIMULATION FUNCTIONS
  // ========================================================================================

  // Cache uniform references
  const advectionUniforms = shaders.advection.uniforms;
  const divergenceUniforms = shaders.divergence.uniforms;
  const jacobiUniforms = shaders.jacobi.uniforms;
  const gradientUniforms = shaders.gradient.uniforms;
  const splatUniforms = shaders.splat.uniforms;
  const displayUniforms = shaders.display.uniforms;

  /**
   * Advection step - transport quantities along velocity field
   */
  function advect(source, velocity, dt, dissipation) {
    advectionUniforms.uVelocity.value = velocity.read.texture;
    advectionUniforms.uSource.value = source.read.texture;
    advectionUniforms.uDt.value = dt;
    advectionUniforms.uDissipation.value = dissipation;
    renderToTarget(source.write, shaders.advection);
    source.swap();
  }

  /**
   * Apply external forces (mouse input, ambient motion)
   */
  function applyForces(time) {
    // Mouse forces
    if (mouse.moved) {
      const dx = (mouse.x - mouse.lastX) * 10.0;
      const dy = (mouse.y - mouse.lastY) * 10.0;

      // Add velocity splat
      addSplat(
        mouse.x,
        mouse.y,
        dx,
        dy,
        fields.velocity,
        config.velocitySplatRadius,
      );

      // Add density splat with random color
      tempColor.set(
        (Math.random() + 0.2) * 0.3,
        (Math.random() + 0.2) * 0.3,
        (Math.random() + 0.2) * 0.3,
      );
      addSplat(
        mouse.x,
        mouse.y,
        tempColor.x,
        tempColor.y,
        fields.density,
        config.densitySplatRadius,
        tempColor.z,
      );
    }

    // Ambient motion
    if (Math.random() < config.ambientForce.frequency) {
      const x = canvas.width * Math.random();
      const y = canvas.height * Math.random();
      const strength =
        config.ambientForce.strength[0] +
        Math.random() *
          (config.ambientForce.strength[1] - config.ambientForce.strength[0]);
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle) * strength;
      const dy = Math.sin(angle) * strength;
      addFluidSplat(x, y, dx, dy);
    }

    // Swirling motion
    if (Math.random() < config.ambientForce.swirl.frequency) {
      const x = canvas.width * (0.3 + Math.random() * 0.4);
      const y = canvas.height * (0.3 + Math.random() * 0.4);
      const swirl = Math.sin(time * 0.5) * config.ambientForce.swirl.strength;
      addFluidSplat(x, y, swirl * Math.cos(time), swirl * Math.sin(time));
    }
  }

  /**
   * Projection step - make velocity field divergence-free
   */
  function project() {
    // Compute divergence
    divergenceUniforms.uVelocity.value = fields.velocity.read.texture;
    renderToTarget(fields.divergence, shaders.divergence);

    // Clear pressure
    renderer.setRenderTarget(fields.pressure.read);
    renderer.clear();
    renderer.setRenderTarget(fields.pressure.write);
    renderer.clear();
    renderer.setRenderTarget(null);

    // Solve pressure (Jacobi iterations)
    for (let i = 0; i < config.pressureIterations; i++) {
      jacobiUniforms.uPressure.value = fields.pressure.read.texture;
      jacobiUniforms.uDivergence.value = fields.divergence.texture;
      renderToTarget(fields.pressure.write, shaders.jacobi);
      fields.pressure.swap();
    }

    // Subtract pressure gradient
    gradientUniforms.uPressure.value = fields.pressure.read.texture;
    gradientUniforms.uVelocity.value = fields.velocity.read.texture;
    renderToTarget(fields.velocity.write, shaders.gradient);
    fields.velocity.swap();
  }

  /**
   * Add a single splat to a field
   */
  function addSplat(x, y, dx, dy, field, radius, dz = 1.0) {
    const normalizedX = x / canvas.width;
    const normalizedY = 1.0 - y / canvas.height;

    splatUniforms.uTarget.value = field.read.texture;
    splatUniforms.uPoint.value.set(normalizedX, normalizedY);

    // For velocity field, negate dy
    if (field === fields.velocity) {
      splatUniforms.uColor.value.set(dx, -dy, dz);
    } else {
      splatUniforms.uColor.value.set(dx, dy, dz);
    }

    splatUniforms.uRadius.value = radius;
    renderToTarget(field.write, shaders.splat);
    field.swap();
  }

  /**
   * Add fluid splat (velocity and density)
   */
  function addFluidSplat(x, y, dx, dy) {
    const normalizedX = x / canvas.width;
    const normalizedY = 1.0 - y / canvas.height;

    // Add velocity splat
    splatUniforms.uTarget.value = fields.velocity.read.texture;
    splatUniforms.uPoint.value.set(normalizedX, normalizedY);
    splatUniforms.uColor.value.set(dx, -dy, 1.0);
    splatUniforms.uRadius.value = config.velocitySplatRadius;
    renderToTarget(fields.velocity.write, shaders.splat);
    fields.velocity.swap();

    // Add density splat with random color
    splatUniforms.uTarget.value = fields.density.read.texture;
    splatUniforms.uPoint.value.set(normalizedX, normalizedY);
    tempColor.set(
      (Math.random() + 0.2) * 0.3,
      (Math.random() + 0.2) * 0.3,
      (Math.random() + 0.2) * 0.3,
    );
    splatUniforms.uColor.value.copy(tempColor);
    splatUniforms.uRadius.value = config.densitySplatRadius;
    renderToTarget(fields.density.write, shaders.splat);
    fields.density.swap();
  }

  /**
   * Update density field by advecting along velocity
   */
  function updateDensity(dt) {
    advect(fields.density, fields.velocity, dt, config.densityDissipation);
  }

  /**
   * Main simulation step
   */
  function simulationStep(time, dt) {
    dt = Math.min(dt, 0.016);

    // FPS limiting
    // const targetDt = 1.0 / config.targetFPS;
    // if (dt < targetDt * 0.9) return; // Skip if running too fast

    // 1. Apply external forces
    applyForces(time);

    // 2. Advect velocity (self-advection creates vortices)
    advect(fields.velocity, fields.velocity, dt, config.velocityDissipation);

    // 3. Project velocity (make incompressible)
    project();

    // 4. Advect density
    updateDensity(dt);

    // 5. Update display
    displayUniforms.uTexture.value =
      config.debugMode === 1
        ? fields.velocity.read.texture
        : fields.density.read.texture;
    displayUniforms.uDebugMode.value = config.debugMode;
    displayUniforms.time.value = time;
    displayUniforms.u_resolution.value.set(
      window.innerWidth,
      window.innerHeight,
    );
  }

  // ========================================================================================
  // MOUSE INTERACTION
  // ========================================================================================
  let mouse = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    isPressed: false,
    moved: false,
  };

  function onMouseMove(e) {
    mouse.moved = mouse.isPressed;
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
  }

  function onMouseDown(e) {
    mouse.isPressed = true;
    mouse.x = e.offsetX;
    mouse.y = e.offsetY;
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
  }

  function onMouseUp() {
    mouse.isPressed = false;
    mouse.moved = false;
  }

  // Attach to document.body to catch events over UI elements
  document.body.addEventListener("mousemove", onMouseMove);
  document.body.addEventListener("mousedown", onMouseDown);
  document.body.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mouseup", onMouseUp);

  // Debug keyboard controls
  window.addEventListener("keydown", (e) => {
    switch (e.key.toLowerCase()) {
      case "v":
        config.debugMode = config.debugMode === 0 ? 1 : 0;
        console.log(
          `Debug mode: ${config.debugMode === 0 ? "Density" : "Velocity"}`,
        );
        break;
      case "d":
        debugInfo.style.display =
          debugInfo.style.display === "none" ? "block" : "none";
        break;
    }
  });

  // ========================================================================================
  // INITIALIZATION
  // ========================================================================================
  clearFields();

  // Add initial splats
  for (let i = 0; i < 3; i++) {
    const x = canvas.width * Math.random();
    const y = canvas.height * Math.random();
    const dx = 1000 * (Math.random() - 0.5);
    const dy = 1000 * (Math.random() - 0.5);
    addFluidSplat(x, y, dx, dy);
  }

  // Debug info overlay
  const debugInfo = document.createElement("div");
  debugInfo.style.cssText = `
	position: fixed; top: 75px; left: 20px; z-index: 1000;
	padding: 8px; background: rgba(0, 0, 0, 0.7); color: white;
	font-family: monospace; font-size: 11px; border-radius: 4px;
	pointer-events: none; display: none;
`;
  debugInfo.innerHTML = `
	Press D: Toggle Debug Visibility<br>
	Press V: Toggle Velocity/Density view<br>
	Resolution: ${config.resolution}×${config.resolution}<br>
	Texture: ${floatType === THREE.FloatType ? "Float32" : floatType === THREE.HalfFloatType ? "Float16" : "Byte"}
`;
  document.body.appendChild(debugInfo);

  // ========================================================================================
  // CLEANUP
  // ========================================================================================
  function cleanup() {
    // Remove event listeners
    document.body.removeEventListener("mousemove", onMouseMove);
    document.body.removeEventListener("mousedown", onMouseDown);
    document.body.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mouseup", onMouseUp);

    // Remove UI elements
    if (debugInfo && debugInfo.parentNode) {
      debugInfo.parentNode.removeChild(debugInfo);
    }

    // Dispose of render targets
    Object.values(fields).forEach((field) => {
      if (field.read) {
        field.read.dispose();
        field.write.dispose();
      } else {
        field.dispose();
      }
    });

    // Dispose of materials
    Object.values(shaders).forEach((shader) => {
      if (shader.dispose) shader.dispose();
    });
  }

  // ========================================================================================
  // PUBLIC API
  // ========================================================================================
  const fluidAPI = {
    config,
    fields,
    shaders,
    addSplat,
    addFluidSplat,
    advect,
    project,
    applyForces,
    updateDensity,
    simulationStep,
    cleanup,
  };

  // Expose for debugging in development
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    window.fluidConfig = config;
    window.fluidAPI = fluidAPI;
    console.log("Fluid simulation API exposed as window.fluidAPI");
  }

  let lastTime = 0;
  let isActive = true;
  return [
    {
      type: "fluid2d",
      update: (t, dt) => {
        if (!isActive) return;
        simulationStep(t, dt);

        displayUniforms.time.value = t;
        displayUniforms.u_resolution.value.set(
          window.innerWidth,
          window.innerHeight,
        );
      },
      cleanup: () => {
        isActive = false;
        cleanup;
      },
    },
  ];
}
