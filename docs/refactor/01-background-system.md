
# Phase 1: Three.js Background System Refactor

## Goal

Refactor the Three.js background infrastructure so the site has one persistent background system and each shader/theme is isolated behind a clean module contract.

This phase is not a visual redesign. The current look, layout, theme selector behavior, and general background behavior should remain materially the same.

## Main Problem

The current Three.js background works, but shader/theme creation is too coupled to the website setup. Adding or modifying a shader requires understanding too much global setup code.

The target is to separate:

* Persistent background infrastructure.
* Individual shader/theme visual logic.

The infrastructure should own the canvas, renderer, camera, resize handling, theme switching, and animation loop.

Each shader/theme should only own its own scene objects, materials, uniforms, render targets, animation behavior, resize behavior, and cleanup.

## Hard Constraints

* Keep the site static and GitHub Pages compatible.
* Use vanilla JavaScript, HTML, CSS, and Three.js.
* Do not introduce React, Vue, Astro, Svelte, or a backend.
* Do not redesign the website.
* Preserve the current visual identity.
* Preserve the existing theme selector behavior.
* Preserve selected-theme persistence if currently implemented.
* Keep changes reviewable.
* Do not touch project markdown, project pages, generator scripts, README, or package scripts unless strictly required for this phase.

## Scope

Implement a persistent Three.js background system that owns:

* One canvas.
* One WebGL renderer.
* One scene.
* One orthographic camera.
* One resize path.
* One animation loop.
* One theme manager.
* One active theme instance at a time.
* Theme switching from the existing UI.
* Selected theme persistence, if already supported.

Migrate existing shader/theme modules to a consistent contract.

## Out of Scope

Do not implement project markdown rendering.

Do not add a build-time content generator.

Do not add generated registry files yet.

Do not migrate project pages.

Do not remove old project HTML pages.

Do not redesign the site.

Do not change the content model.

Do not introduce a framework or bundler change unless the current code already requires it.

## Preferred Folder Direction

The exact file structure may be adjusted after inspecting the repo, but the target direction is:

```txt
js/
  background/
    BackgroundApp.js
    CameraRig.js
    ThemeManager.js
    ShaderThemeBase.js

  shaders/
    existing-theme-one.js
    existing-theme-two.js
    existing-theme-three.js
```

If the repo already has an equivalent theme folder, prefer adapting the current structure instead of moving files unnecessarily.

## BackgroundApp Responsibility

`BackgroundApp` should be the high-level owner of the Three.js background lifecycle.

It should:

* Initialize the canvas.
* Initialize the renderer.
* Initialize the scene.
* Initialize the orthographic camera through `CameraRig`.
* Initialize `ThemeManager`.
* Start and stop the animation loop.
* Handle viewport resize.
* Forward `update()` calls to the active theme.
* Forward `resize()` calls to the active theme.
* Dispose of the active theme when switching.
* Avoid leaking GPU resources.

It should not contain shader-specific visual logic.

## CameraRig Responsibility

`CameraRig` should own the orthographic camera and viewport calculations.

The camera should be predictable and fixed.

Preferred camera behavior:

* Orthographic camera.
* Fixed camera position.
* Fixed design-space height.
* Width derived from viewport aspect ratio.
* Stable composition across monitor resolutions.
* No per-shader camera creation.

Conceptual model:

```js
const designHeight = 10;
const aspect = width / height;

camera.left = (-designHeight * aspect) / 2;
camera.right = (designHeight * aspect) / 2;
camera.top = designHeight / 2;
camera.bottom = -designHeight / 2;
camera.near = 0.1;
camera.far = 100;
camera.position.z = 10;
camera.updateProjectionMatrix();
```

The exact values can be adjusted to preserve the current visual result.

## ThemeManager Responsibility

`ThemeManager` should manage theme registration, theme switching, and active theme lifecycle.

It should:

* Know which themes are available.
* Populate or connect with the existing theme selector UI.
* Create a theme by id.
* Dispose of the previous theme before activating a new one.
* Store the selected theme if the current site already persists this behavior.
* Restore the selected theme on load if currently supported.
* Keep shader-specific code out of global app setup.

For Phase 1, theme registration can remain manual or adapt the existing registry/config file.

Do not add generated registries in this phase. Generated registries belong to a later generator phase.

## Shader/Theme Module Contract

Each shader/theme module should export metadata and a factory function.

Preferred shape:

```js
export const themeMeta = {
  id: "example-theme",
  label: "Example Theme",
  order: 10,
};

export function createTheme(context) {
  return {
    update(time, deltaTime) {},
    resize(viewport) {},
    dispose() {},
  };
}
```

The `context` object should provide shared infrastructure:

```js
{
  THREE,
  canvas,
  renderer,
  scene,
  camera,
  viewport
}
```

## Theme Module Rules

A theme module may:

* Create meshes.
* Create geometries.
* Create materials.
* Create uniforms.
* Create render targets.
* Create textures.
* Create helper objects.
* Update its own animation state.
* React to viewport resize.
* Dispose of its own resources.

A theme module must not:

* Create the main canvas.
* Create the main renderer.
* Create the main camera.
* Own the global animation loop.
* Directly own the website theme selector UI.
* Leave old meshes, materials, geometries, textures, or render targets alive after `dispose()`.

## Resource Cleanup

Each theme must clean up resources it creates.

At minimum, dispose of:

* Geometries.
* Materials.
* Textures.
* Render targets.
* Custom event listeners.
* Any animation-specific state that can leak across theme switches.

If a theme adds objects to the shared scene, it must remove them during `dispose()`.

## Documentation Requirements

Add useful JSDoc for public classes/functions/modules introduced in this phase.

Focus on explaining:

* What the class/function owns.
* What lifecycle methods do.
* What `context` contains.
* What a shader/theme is allowed to create.
* What must be cleaned up.

Avoid obvious comments that only repeat the code.

## Implementation Rules

Before editing, inspect the repo and list:

* Existing Three.js entry points.
* Existing theme/shader files.
* Existing theme selector code.
* Existing persistence behavior.
* Exact files that will be added or changed.

During implementation:

* Preserve visual behavior.
* Keep the diff focused on background infrastructure.
* Avoid unrelated cleanup.
* Avoid project-page work.
* Avoid markdown work.
* Avoid generator work.
* Stop after this phase.

## Acceptance Criteria

The phase is complete when:

* The home page still loads.
* The projects page still loads.
* The current background still appears.
* The theme selector still works.
* Existing themes still look materially the same.
* Selected theme persistence still works if it existed before.
* Resize behavior works on desktop and narrow viewport.
* There is one persistent canvas.
* There is one persistent renderer.
* There is one persistent scene.
* There is one persistent orthographic camera.
* There is one animation loop.
* Theme modules use the agreed module contract.
* Theme modules clean up their own resources.
* No project markdown work was added.
* No generator work was added.

## Test Plan

After implementation, test:

1. Load the home page.
2. Load the projects page.
3. Switch through every available theme.
4. Refresh the page and verify selected-theme persistence if supported.
5. Resize the browser window.
6. Test a narrow/mobile-like viewport.
7. Switch themes repeatedly and check for obvious stale objects or broken rendering.
8. Confirm the console has no new runtime errors.
9. Confirm the visual result is materially the same as before.

## Stop Condition

After implementation, stop and report:

* Files added.
* Files changed.
* Architecture summary.
* How to test.
* Known risks.
* Any behavior that changed intentionally.
* Git diff summary.

Do not proceed to project markdown, generator scripts, or cleanup documentation without approval.
