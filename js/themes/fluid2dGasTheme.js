// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";
import { ShaderThemeBase } from "../background/ShaderThemeBase.js";

/**
 * Theme metadata for the 2D fluid simulation background.
 */
export const themeMeta = {
  id: "fluid2dGas",
  label: "2D Fluid Simulation",
  order: 40,
};

/**
 * Creates the 2D fluid simulation theme instance.
 * @param {object} context
 */
export function createTheme(context) {
  return new Fluid2dGasTheme(context);
}

// Each shader below maps to a single stage in the fluid pipeline:
// advection, divergence, pressure solve, gradient subtraction, splat, display.
const SHADERS = {
  vertex: {
    simple: `
	varying vec2 vUv;
	void main(){
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}`,
  },
  fragment: {
    advection: `
	precision mediump float;
	uniform sampler2D uVelocity, uSource;
	uniform float uTexelSize, uDt, uDissipation;
	varying vec2 vUv;

	void main() {
		vec2 vel = texture2D(uVelocity, vUv).xy;
		vec2 coord = vUv - uDt * vel * uTexelSize;
		coord = clamp(coord, vec2(uTexelSize), vec2(1.0 - uTexelSize));
		gl_FragColor = uDissipation * texture2D(uSource, coord);
	} `,
    divergence: `
	precision mediump float;
	uniform sampler2D uVelocity;
	uniform float uTexelSize;
	varying vec2 vUv;

	void main() {
		float L = texture2D(uVelocity, vUv - vec2(uTexelSize, 0.0)).x;
		float R = texture2D(uVelocity, vUv + vec2(uTexelSize, 0.0)).x;
		float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize)).y;
		float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize)).y;
		gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
	} `,
    jacobi: `
	precision mediump float;
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

    gradient: `
	precision mediump float;
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

    splat: `
	precision mediump float;
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

    display: `
	precision mediump float;
	uniform float time;
	uniform vec2 u_resolution;
	uniform sampler2D uTexture;
	uniform int uDebugMode;
	varying vec2 vUv;

	void main() {
		vec4 data = texture2D(uTexture, vUv);
		vec3 color;

		if (uDebugMode == 1) {
			vec2 vel = data.xy;
			float speed = length(vel);
			color = vec3(
				vel.x * 0.5 + 0.5,
				vel.y * 0.5 + 0.5,
				speed
			);
		} else {
			color = pow(data.rgb, vec3(1.2)) * 2.0;
		}
		gl_FragColor = vec4(color, 1.0);
	}`,
  },
};

/**
 * Screen-space fluid solver that owns the velocity, density, pressure, and
 * display passes for the theme.
 */
class Fluid2dGasTheme extends ShaderThemeBase {
  /**
   * @param {object} context
   */
  constructor(context) {
    super(context, themeMeta.id);

    this.canvas = context.canvas;
    this.renderer = context.renderer;
    this.tempColor = new THREE.Vector3();
    this.isActive = true;
    this.mouse = {
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      isPressed: false,
      moved: false,
    };

    this.config = {
      resolution: 1024,
      velocityDissipation: 0.999,
      densityDissipation: 0.999,
      pressureIterations: 30,
      splatRadius: 0.02,
      velocitySplatRadius: 0.02,
      densitySplatRadius: 0.02,
      targetFPS: 60,
      debugMode: 0,
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
    this.config.resolution = this.config.getResolution();

    const gl = this.renderer.getContext();
    this.floatType = THREE.UnsignedByteType;
    this.precision = "mediump";
    const ext = gl.getExtension("EXT_color_buffer_float");
    if (ext) {
      this.floatType = THREE.FloatType;
      this.precision = "highp";
      console.log("Using float textures");
    }

    this.fboOptions = {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: this.floatType,
      stencilBuffer: false,
      depthBuffer: false,
    };

    this.texelSize = 1.0 / this.config.resolution;
    this.sharedQuadGeometry = new THREE.PlaneGeometry(2, 2);
    this.shaders = this._createShaderPrograms();
    this.fields = this._createFields();

    this.displayUniforms = this.shaders.display.uniforms;
    this.advectionUniforms = this.shaders.advection.uniforms;
    this.divergenceUniforms = this.shaders.divergence.uniforms;
    this.jacobiUniforms = this.shaders.jacobi.uniforms;
    this.gradientUniforms = this.shaders.gradient.uniforms;
    this.splatUniforms = this.shaders.splat.uniforms;

    this.quad = new THREE.Mesh(this.sharedQuadGeometry, this.shaders.display);
    this.quad.frustumCulled = false;
    this.add(this.quad);

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.simQuad = new THREE.Mesh(this.sharedQuadGeometry, null);
    this.simScene.add(this.simQuad);

    this._bindListeners();
    this.clearFields();
    this.debugInfo = this._createDebugInfo();
  }

  /**
   * @param {number} time
   * @param {number} deltaTime
   */
  update(time, deltaTime) {
    if (!this.isActive) {
      return;
    }

    this.simulationStep(time, deltaTime);
  }

  /**
   * @param {object} viewport
   */
  resize(viewport) {
    super.resize(viewport);
    this.displayUniforms.u_resolution.value.set(viewport.width, viewport.height);
  }

  /**
   * Disposes the simulation, debug UI, and owned GPU resources.
   */
  dispose() {
    this.isActive = false;
    if (this.debugInfo?.parentNode) {
      this.debugInfo.parentNode.removeChild(this.debugInfo);
    }
    super.dispose();
  }

  /**
   * Creates the render targets used by the simulation.
   * @returns {object}
   * @private
   */
  _createFields() {
    const createDoubleFBO = () => {
      const read = this.trackDisposable(
        new THREE.WebGLRenderTarget(this.config.resolution, this.config.resolution, this.fboOptions),
      );
      const write = this.trackDisposable(
        new THREE.WebGLRenderTarget(this.config.resolution, this.config.resolution, this.fboOptions),
      );
      return {
        read,
        write,
        swap() {
          [this.read, this.write] = [this.write, this.read];
        },
      };
    };

    return {
      velocity: createDoubleFBO(),
      density: createDoubleFBO(),
      pressure: createDoubleFBO(),
      divergence: this.trackDisposable(
        new THREE.WebGLRenderTarget(this.config.resolution, this.config.resolution, this.fboOptions),
      ),
    };
  }

  /**
   * Builds the shader materials used by the simulation and display pass.
   * @returns {object}
   * @private
   */
  _createShaderPrograms() {
    const simVertex = SHADERS.vertex.simple;
    return {
      advection: this.trackDisposable(
        new THREE.ShaderMaterial({
          uniforms: {
            uVelocity: { value: null },
            uSource: { value: null },
            uTexelSize: { value: this.texelSize },
            uDt: { value: 0.001 },
            uDissipation: { value: 0.99 },
          },
          vertexShader: simVertex,
          fragmentShader: SHADERS.fragment.advection,
        }),
      ),
      divergence: this.trackDisposable(
        new THREE.ShaderMaterial({
          uniforms: {
            uVelocity: { value: null },
            uTexelSize: { value: this.texelSize },
          },
          vertexShader: simVertex,
          fragmentShader: SHADERS.fragment.divergence,
        }),
      ),
      jacobi: this.trackDisposable(
        new THREE.ShaderMaterial({
          uniforms: {
            uPressure: { value: null },
            uDivergence: { value: null },
            uTexelSize: { value: this.texelSize },
          },
          vertexShader: simVertex,
          fragmentShader: SHADERS.fragment.jacobi,
        }),
      ),
      gradient: this.trackDisposable(
        new THREE.ShaderMaterial({
          uniforms: {
            uPressure: { value: null },
            uVelocity: { value: null },
            uTexelSize: { value: this.texelSize },
          },
          vertexShader: simVertex,
          fragmentShader: SHADERS.fragment.gradient,
        }),
      ),
      splat: this.trackDisposable(
        new THREE.ShaderMaterial({
          uniforms: {
            uTarget: { value: null },
            uPoint: { value: new THREE.Vector2(0.5, 0.5) },
            uColor: { value: new THREE.Vector3(1.0, 0.0, 0.0) },
            uRadius: { value: 0.01 },
          },
          vertexShader: simVertex,
          fragmentShader: SHADERS.fragment.splat,
        }),
      ),
      display: new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          u_resolution: {
            value: new THREE.Vector2(this.viewport.width, this.viewport.height),
          },
          uTexture: { value: null },
          uDebugMode: { value: 0 },
        },
        vertexShader: simVertex,
        fragmentShader: SHADERS.fragment.display,
        depthTest: false,
        depthWrite: false,
      }),
    };
  }

  /**
   * Wipes the simulation fields.
   */
  clearFields() {
    Object.values(this.fields).forEach((field) => {
      if (field.read) {
        this.renderer.setRenderTarget(field.read);
        this.renderer.clear();
        this.renderer.setRenderTarget(field.write);
        this.renderer.clear();
      } else {
        this.renderer.setRenderTarget(field);
        this.renderer.clear();
      }
    });
    this.renderer.setRenderTarget(null);
  }

  /**
   * Renders a material into the supplied target.
   * @param {THREE.WebGLRenderTarget} target
   * @param {THREE.Material} material
   * @private
   */
  renderToTarget(target, material) {
    const oldTarget = this.renderer.getRenderTarget();
    this.simQuad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.simScene, this.simCamera);
    this.renderer.setRenderTarget(oldTarget);
  }

  /**
   * Advects a field along the velocity texture.
   * @param {object} source
   * @param {object} velocity
   * @param {number} dt
   * @param {number} dissipation
   * @private
   */
  advect(source, velocity, dt, dissipation) {
    this.advectionUniforms.uVelocity.value = velocity.read.texture;
    this.advectionUniforms.uSource.value = source.read.texture;
    this.advectionUniforms.uDt.value = dt;
    this.advectionUniforms.uDissipation.value = dissipation;
    this.renderToTarget(source.write, this.shaders.advection);
    source.swap();
  }

  /**
   * Adds a single splat to a field.
   * @private
   */
  addSplat(x, y, dx, dy, field, radius, dz = 1.0) {
    const normalizedX = x / this.canvas.width;
    const normalizedY = 1.0 - y / this.canvas.height;

    this.splatUniforms.uTarget.value = field.read.texture;
    this.splatUniforms.uPoint.value.set(normalizedX, normalizedY);

    if (field === this.fields.velocity) {
      this.splatUniforms.uColor.value.set(dx, -dy, dz);
    } else {
      this.splatUniforms.uColor.value.set(dx, dy, dz);
    }

    this.splatUniforms.uRadius.value = radius;
    this.renderToTarget(field.write, this.shaders.splat);
    field.swap();
  }

  /**
   * Adds both velocity and density to the simulation at the same point.
   * @private
   */
  addFluidSplat(x, y, dx, dy) {
    // A fluid splat writes a paired impulse into velocity and density.
    const normalizedX = x / this.canvas.width;
    const normalizedY = 1.0 - y / this.canvas.height;

    this.splatUniforms.uTarget.value = this.fields.velocity.read.texture;
    this.splatUniforms.uPoint.value.set(normalizedX, normalizedY);
    this.splatUniforms.uColor.value.set(dx, -dy, 1.0);
    this.splatUniforms.uRadius.value = this.config.velocitySplatRadius;
    this.renderToTarget(this.fields.velocity.write, this.shaders.splat);
    this.fields.velocity.swap();

    this.splatUniforms.uTarget.value = this.fields.density.read.texture;
    this.splatUniforms.uPoint.value.set(normalizedX, normalizedY);
    this.tempColor.set(
      (Math.random() + 0.2) * 0.3,
      (Math.random() + 0.2) * 0.3,
      (Math.random() + 0.2) * 0.3,
    );
    this.splatUniforms.uColor.value.copy(this.tempColor);
    this.splatUniforms.uRadius.value = this.config.densitySplatRadius;
    this.renderToTarget(this.fields.density.write, this.shaders.splat);
    this.fields.density.swap();
  }

  /**
   * Applies user and ambient forces to the simulation.
   * @param {number} time
   * @private
   */
  applyForces(time) {
    if (this.mouse.moved) {
      // Dragging the mouse injects both momentum and color at the same point.
      const dx = (this.mouse.x - this.mouse.lastX) * 10.0;
      const dy = (this.mouse.y - this.mouse.lastY) * 10.0;

      this.addSplat(
        this.mouse.x,
        this.mouse.y,
        dx,
        dy,
        this.fields.velocity,
        this.config.velocitySplatRadius,
      );

      this.tempColor.set(
        (Math.random() + 0.2) * 0.3,
        (Math.random() + 0.2) * 0.3,
        (Math.random() + 0.2) * 0.3,
      );
      this.addSplat(
        this.mouse.x,
        this.mouse.y,
        this.tempColor.x,
        this.tempColor.y,
        this.fields.density,
        this.config.densitySplatRadius,
        this.tempColor.z,
      );
    }

    if (Math.random() < this.config.ambientForce.frequency) {
      // Random ambient splats keep the simulation alive when the pointer is idle.
      const x = this.canvas.width * Math.random();
      const y = this.canvas.height * Math.random();
      const strength =
        this.config.ambientForce.strength[0] +
        Math.random() *
          (this.config.ambientForce.strength[1] - this.config.ambientForce.strength[0]);
      const angle = Math.random() * Math.PI * 2;
      const dx = Math.cos(angle) * strength;
      const dy = Math.sin(angle) * strength;
      this.addFluidSplat(x, y, dx, dy);
    }

    if (Math.random() < this.config.ambientForce.swirl.frequency) {
      const x = this.canvas.width * (0.3 + Math.random() * 0.4);
      const y = this.canvas.height * (0.3 + Math.random() * 0.4);
      const swirl = Math.sin(time * 0.5) * this.config.ambientForce.swirl.strength;
      this.addFluidSplat(x, y, swirl * Math.cos(time), swirl * Math.sin(time));
    }
  }

  /**
   * Solves the pressure field and removes divergence.
   * @private
   */
  project() {
    // Divergence is the source term for the pressure solve.
    this.divergenceUniforms.uVelocity.value = this.fields.velocity.read.texture;
    this.renderToTarget(this.fields.divergence, this.shaders.divergence);

    // Jacobi iterations approximate the pressure field.
    this.renderer.setRenderTarget(this.fields.pressure.read);
    this.renderer.clear();
    this.renderer.setRenderTarget(this.fields.pressure.write);
    this.renderer.clear();
    this.renderer.setRenderTarget(null);

    for (let i = 0; i < this.config.pressureIterations; i++) {
      this.jacobiUniforms.uPressure.value = this.fields.pressure.read.texture;
      this.jacobiUniforms.uDivergence.value = this.fields.divergence.texture;
      this.renderToTarget(this.fields.pressure.write, this.shaders.jacobi);
      this.fields.pressure.swap();
    }

    // Subtract the pressure gradient to restore incompressible flow.
    this.gradientUniforms.uPressure.value = this.fields.pressure.read.texture;
    this.gradientUniforms.uVelocity.value = this.fields.velocity.read.texture;
    this.renderToTarget(this.fields.velocity.write, this.shaders.gradient);
    this.fields.velocity.swap();
  }

  /**
   * Updates the density field by advecting along velocity.
   * @private
   */
  updateDensity(dt) {
    this.advect(this.fields.density, this.fields.velocity, dt, this.config.densityDissipation);
  }

  /**
   * Updates the final display texture selection.
   * @private
   */
  updateDisplay(time) {
    this.displayUniforms.uTexture.value =
      this.config.debugMode === 1
        ? this.fields.velocity.read.texture
        : this.fields.density.read.texture;
    this.displayUniforms.uDebugMode.value = this.config.debugMode;
    this.displayUniforms.time.value = time;
    this.displayUniforms.u_resolution.value.set(
      this.viewport.width,
      this.viewport.height,
    );
  }

  /**
   * Runs one full simulation step.
   * @private
   */
  simulationStep(time, dt) {
    const frameDt = Math.min(dt, 0.016);
    // User and ambient impulses feed the velocity and density fields first.
    this.applyForces(time);

    // Carry velocity forward before the pressure solve so motion stays coherent.
    this.advect(this.fields.velocity, this.fields.velocity, frameDt, this.config.velocityDissipation);

    // Solve the pressure field to remove divergence from the velocity field.
    this.project();

    // Density follows the updated velocity field.
    this.updateDensity(frameDt);

    // The display pass selects either the density or debug velocity view.
    this.updateDisplay(time);
  }

  /**
   * Handles pointer movement.
   * @param {MouseEvent} event
   * @private
   */
  onMouseMove(event) {
    this.mouse.moved = this.mouse.isPressed;
    this.mouse.lastX = this.mouse.x;
    this.mouse.lastY = this.mouse.y;
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
  }

  /**
   * Handles pointer down.
   * @param {MouseEvent} event
   * @private
   */
  onMouseDown(event) {
    this.mouse.isPressed = true;
    this.mouse.x = event.offsetX;
    this.mouse.y = event.offsetY;
    this.mouse.lastX = this.mouse.x;
    this.mouse.lastY = this.mouse.y;
  }

  /**
   * Handles pointer up.
   * @private
   */
  onMouseUp() {
    this.mouse.isPressed = false;
    this.mouse.moved = false;
  }

  /**
   * Handles debug hotkeys.
   * @param {KeyboardEvent} event
   * @private
   */
  onKeyDown(event) {
    switch (event.key.toLowerCase()) {
      case "v":
        this.config.debugMode = this.config.debugMode === 0 ? 1 : 0;
        console.log(
          `Debug mode: ${this.config.debugMode === 0 ? "Density" : "Velocity"}`,
        );
        break;
      case "d":
        this.debugInfo.style.display =
          this.debugInfo.style.display === "none" ? "block" : "none";
        break;
      default:
        break;
    }
  }

  /**
   * Registers the input listeners used by the simulation.
   * @private
   */
  _bindListeners() {
    this._onMouseMoveBound = this.onMouseMove.bind(this);
    this._onMouseDownBound = this.onMouseDown.bind(this);
    this._onMouseUpBound = this.onMouseUp.bind(this);
    this._onKeyDownBound = this.onKeyDown.bind(this);

    this.addEventListener(document.body, "mousemove", this._onMouseMoveBound);
    this.addEventListener(document.body, "mousedown", this._onMouseDownBound);
    this.addEventListener(document.body, "mouseup", this._onMouseUpBound);
    this.addEventListener(window, "mouseup", this._onMouseUpBound);
    this.addEventListener(window, "keydown", this._onKeyDownBound);
  }

  /**
   * Creates the debug overlay used by the simulation.
   * @returns {HTMLDivElement}
   * @private
   */
  _createDebugInfo() {
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
	Resolution: ${this.config.resolution}×${this.config.resolution}<br>
`;
    document.body.appendChild(debugInfo);
    return debugInfo;
  }
}
