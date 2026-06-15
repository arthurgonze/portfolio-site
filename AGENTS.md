
# Agent Instructions

This repository is a static GitHub Pages portfolio site.

## Core Constraints

* Use vanilla HTML, CSS, JavaScript, and Three.js.
* Do not introduce React, Vue, Astro, Svelte, Next.js, or a backend.
* Keep the site static and GitHub Pages compatible.
* Preserve the current visual design unless the task explicitly asks for visual changes.
* Prefer small, reviewable changes.
* Do not rewrite unrelated code.
* Do not delete files unless they are proven obsolete and no longer referenced.
* Do not edit generated files manually. Update the source files or generator instead.

## Architecture Principles

Separate infrastructure from content and creative work.

Infrastructure includes:

* HTML shell.
* CSS layout and styling.
* Shared components.
* Markdown loading and rendering.
* Project list/detail rendering.
* Three.js background setup.
* Theme/shader management.
* Build-time content generation.

Content and creative work includes:

* Project markdown files.
* Images and media.
* Shader/theme modules.

Adding a project should not require editing HTML or CSS.

Adding a shader/theme should not require editing HTML or CSS.

## Three.js Background Rules

The background system should own:

* One persistent canvas.
* One persistent renderer.
* One persistent scene.
* One orthographic camera.
* One resize path.
* One animation loop.
* One active theme at a time.

Shader/theme modules should only own their own visual logic and resources.

Each shader/theme should expose a consistent contract:

```js
export const themeMeta = {
  id: "theme-id",
  label: "Theme Label",
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

Shader/theme modules must clean up their own geometries, materials, textures, render targets, scene objects, and event listeners in `dispose()`.

## Project Content Rules

Project content should be markdown-driven.

Project markdown files should use front matter for metadata and markdown body content for the page body.

A reusable project detail page should load projects by slug.

Do not create one custom HTML page per project unless explicitly asked.

## Generator Rules

Use build-time generation for static discovery.

The browser should not scan folders at runtime.

Generated registries should be deterministic and safe to commit.

Running the generator twice without source changes should produce identical output.

Generated files should include a clear header:

```js
// This file is generated.
// Do not edit manually.
```

## Documentation Rules

Use useful JSDoc for public modules, classes, and functions.

Good comments should explain ownership, lifecycle, contracts, and non-obvious behavior.

Avoid comments that only repeat what the code already says.

## Implementation Workflow

Before editing:

* Inspect the repo.
* Identify the relevant files.
* State which files will be added or changed.
* State the intended implementation approach.
* Wait for approval if the task asks for planning first.

During editing:

* Keep the change scoped to the requested phase/task.
* Preserve existing behavior unless the task explicitly changes it.
* Avoid unrelated cleanup.
* Stop after the requested phase.

After editing:

* Summarize files changed.
* Explain how to test.
* List known risks.
* Show or summarize the git diff.

## Refactor Phase Files

Task-specific implementation plans live under:

```txt
docs/refactor/
```

When asked to implement a phase, read the matching phase file first and follow its scope, acceptance criteria, and stop condition. 
During a multi-phase refactor, a phase file may temporarily allow manual registries or transitional files. 
Those are acceptable only within that phase’s scope and should be removed or replaced in later phases when the phase plan says so.
