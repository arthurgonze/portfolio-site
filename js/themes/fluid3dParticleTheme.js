// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import * as THREE from "three";

export function setupFluid3dParticleScene(themeGroup) {
  const PARTICLE_COUNT = 1000;

  // Create particle geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  // Initialize particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    // Random positions in a sphere
    const r = Math.random() * 5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.cos(phi);
    positions[i3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    // Random initial velocities
    velocities[i3] = (Math.random() - 0.5) * 2;
    velocities[i3 + 1] = (Math.random() - 0.5) * 2;
    velocities[i3 + 2] = (Math.random() - 0.5) * 2;

    // Random colors
    colors[i3] = Math.random();
    colors[i3 + 1] = Math.random();
    colors[i3 + 2] = Math.random();
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(geometry, material);
  themeGroup.add(particles);

  // Mouse interaction with smoothing
  const mouse = new THREE.Vector3();
  const smoothMouse = new THREE.Vector3(); // Smoothed mouse position
  const mouseState = { isPressed: false, pressure: 0.0 };
  setupMouse3DEvents(mouse, smoothMouse, mouseState);

  return [
    {
      type: "fluid3d",
      particles: particles,
      mouse: mouse,
      smoothMouse: smoothMouse,
      mouseState: mouseState,
      step: (time, dt) => {
        updateParticles(particles, mouse, smoothMouse, mouseState, time, dt);
      },
    },
  ];
}

function updateParticles(particles, mouse, smoothMouse, mouseState, time, dt) {
  const positions = particles.geometry.attributes.position.array;
  const velocities = particles.geometry.attributes.velocity.array;
  const colors = particles.geometry.attributes.color.array;

  // Smooth the mouse movement to prevent breaking apart
  smoothMouse.lerp(mouse, 0.1);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    let vx = velocities[i];
    let vy = velocities[i + 1];
    let vz = velocities[i + 2];

    // Apply gravity (weaker)
    vy -= 5.0 * dt;

    // Mouse interaction
    const dx = smoothMouse.x - x;
    const dy = smoothMouse.y - y;
    const dz = smoothMouse.z - z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Mouse attraction/repulsion
    if (dist < 8.0 && dist > 0.1) {
      const force = mouseState.isPressed ? 100.0 : 30.0; // Stronger when clicking
      const pressure = force / (dist * dist + 1.0);

      vx += (dx / dist) * pressure * dt;
      vy += (dy / dist) * pressure * dt;
      vz += (dz / dist) * pressure * dt;
    }

    // Cohesion force
    let cohesionX = 0,
      cohesionY = 0,
      cohesionZ = 0;
    let neighborCount = 0;

    // Check nearby particles
    for (let j = 0; j < positions.length; j += 9) {
      if (j === i) continue;

      const ox = positions[j];
      const oy = positions[j + 1];
      const oz = positions[j + 2];

      const dx2 = ox - x;
      const dy2 = oy - y;
      const dz2 = oz - z;
      const dist2 = dx2 * dx2 + dy2 * dy2 + dz2 * dz2;

      if (dist2 < 4.0 && dist2 > 0.1) {
        cohesionX += dx2;
        cohesionY += dy2;
        cohesionZ += dz2;
        neighborCount++;
      }
    }

    // Apply cohesion force
    if (neighborCount > 0) {
      cohesionX /= neighborCount;
      cohesionY /= neighborCount;
      cohesionZ /= neighborCount;

      const cohesionStrength = 2.0;
      vx += cohesionX * cohesionStrength * dt;
      vy += cohesionY * cohesionStrength * dt;
      vz += cohesionZ * cohesionStrength * dt;
    }

    // Add some gentle turbulence
    vx += Math.sin(time * 2.0 + i * 0.01) * 1.0 * dt;
    vy += Math.cos(time * 2.3 + i * 0.01) * 1.0 * dt;
    vz += Math.sin(time * 1.7 + i * 0.01) * 1.0 * dt;

    // Velocity limiting to prevent explosion
    const maxSpeed = 15.0;
    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      vx *= scale;
      vy *= scale;
      vz *= scale;
    }

    // Update positions
    positions[i] += vx * dt;
    positions[i + 1] += vy * dt;
    positions[i + 2] += vz * dt;

    // Screen bounds constraints - convert world to screen coordinates
    const camera = particles.parent?.parent?.children?.find(
      (c) => c.isCamera,
    ) || { position: { z: 10 }, fov: 75 };
    const distance = Math.abs(camera.position.z);
    const vFOV = THREE.MathUtils.degToRad(camera.fov || 75);
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const width = height * (window.innerWidth / window.innerHeight);

    const maxX = width / 2 - 1;
    const minX = -width / 2 + 1;
    const maxY = height / 2 - 1;
    const minY = -height / 2 + 1;
    const maxZ = 5;
    const minZ = -5;

    // Soft boundary constraints
    if (positions[i] > maxX) {
      positions[i] = maxX;
      vx *= -0.5;
    } else if (positions[i] < minX) {
      positions[i] = minX;
      vx *= -0.5;
    }

    if (positions[i + 1] > maxY) {
      positions[i + 1] = maxY;
      vy *= -0.5;
    } else if (positions[i + 1] < minY) {
      positions[i + 1] = minY;
      vy *= -0.5;
    }

    if (positions[i + 2] > maxZ) {
      positions[i + 2] = maxZ;
      vz *= -0.5;
    } else if (positions[i + 2] < minZ) {
      positions[i + 2] = minZ;
      vz *= -0.5;
    }

    // Apply damping
    const damping = 0.98;
    velocities[i] = vx * damping;
    velocities[i + 1] = vy * damping;
    velocities[i + 2] = vz * damping;

    // Update colors based on speed and mouse interaction
    const normalizedSpeed = Math.min(speed / 10.0, 1.0);
    const mouseInfluence = Math.max(0, 1.0 - dist / 5.0);

    colors[i] = normalizedSpeed * 0.8 + mouseInfluence * 0.2; // Red
    colors[i + 1] = normalizedSpeed * 0.4 + mouseInfluence * 0.6; // Green
    colors[i + 2] = (1.0 - normalizedSpeed) * 0.8 + mouseInfluence * 0.4; // Blue
  }

  // Mark attributes as needing update
  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.velocity.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
}

function setupMouse3DEvents(mouse, smoothMouse, mouseState) {
  console.log("Setting up 3D mouse events...");

  const canvas = document.getElementById("bg-canvas");
  const body = document.body;

  // Update mouse position
  function updateMouse(e) {
    const rect = canvas
      ? canvas.getBoundingClientRect()
      : {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Map to world coordinates
    mouse.set(x * 12, y * 12, mouseState.isPressed ? 3 : 0);
  }

  // Canvas events
  if (canvas) {
    canvas.addEventListener("mousemove", updateMouse, { passive: true });

    canvas.addEventListener("mousedown", (e) => {
      mouseState.isPressed = true;
      console.log("Mouse pressed - stronger attraction");
      updateMouse(e);
    });

    canvas.addEventListener("mouseup", () => {
      mouseState.isPressed = false;
      console.log("Mouse released - normal attraction");
    });
  }

  // Body events
  body.addEventListener("mousemove", updateMouse, { passive: true });

  body.addEventListener("mousedown", (e) => {
    mouseState.isPressed = true;
    console.log("🖱️ Body mouse pressed");
    updateMouse(e);
  });

  body.addEventListener("mouseup", () => {
    mouseState.isPressed = false;
    console.log("🖱️ Body mouse released");
  });

  // Window events
  window.addEventListener("mousemove", updateMouse, { passive: true });

  window.addEventListener("mousedown", (e) => {
    mouseState.isPressed = true;
    updateMouse(e);
  });

  window.addEventListener("mouseup", () => {
    mouseState.isPressed = false;
  });

  // Touch events for mobile
  if (canvas) {
    canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
          mouse.set(x * 12, y * 12, 3); // Always strong for touch
          mouseState.isPressed = true;
        }
      },
      { passive: false },
    );

    canvas.addEventListener("touchstart", () => {
      mouseState.isPressed = true;
    });

    canvas.addEventListener("touchend", () => {
      mouseState.isPressed = false;
    });
  }

  // Initialize smoothed mouse
  smoothMouse.copy(mouse);
}
