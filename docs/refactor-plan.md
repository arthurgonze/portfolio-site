
# Portfolio Site Refactor Plan

## Goal

Refactor the portfolio site infrastructure without redesigning the visual look.

The current layout, visual identity, and general organization are acceptable. The goal is to make the site easier to maintain, especially for adding new Three.js shader backgrounds and new project pages.

This site must remain a static GitHub Pages site using vanilla HTML, CSS, JavaScript, and Three.js.

## Hard Constraints

* Do not introduce React, Vue, Astro, Svelte, or a backend.
* Keep the site GitHub Pages compatible.
* Preserve the current visual design unless a change is required for maintainability.
* Prefer small, reviewable changes.
* Do not rewrite unrelated code.
* Keep infrastructure code separate from content/creative code.
* Adding a project should not require manually creating a new HTML page.
* Adding a shader should not require editing HTML or CSS.
* Use clear, professional JSDoc comments for public functions, classes, and modules.

## Current Problems

### Three.js Background

The current Three.js background works visually, but creating and maintaining shaders is too coupled to the general website setup.

The desired direction is to have one persistent background system that owns:

* The canvas.
* The renderer.
* The scene.
* A fixed orthographic camera.
* The resize behavior.
* The animation loop.
* Theme/shader switching.
* Theme persistence.

Individual shaders should only define their own visual logic. They should not recreate global setup code.

### Project Pages

Projects are currently too manual. Each project requires its own HTML structure.

The desired direction is to write project content as markdown files and let JavaScript render those files into a consistent project page layout.

## Target Architecture

Separate the site into two categories:

### Infrastructure

Infrastructure is the reusable website system.

Examples:

* HTML shell.
* CSS layout and styling.
* Project list rendering.
* Project detail rendering.
* Markdown parsing/rendering.
* Three.js canvas setup.
* Theme/shader manager.
* Generated project/shader registries.

### Content and Creative Work

Content and creative work are things I should be able to add without changing the infrastructure.

Examples:

* Project markdown files.
* Shader modules.
* Images and media used by projects.
* Optional project-specific metadata.

## Proposed Folder Direction

The exact structure may be adjusted after inspecting the repo, but the target separation should be similar to:

```txt
content/
  projects/
    project-one.md
    project-two.md

js/
  app/
    main.js

  background/
    BackgroundApp.js
    CameraRig.js
    ThemeManager.js
    ShaderThemeBase.js
    ThemeRegistry.generated.js

  shaders/
    oldTvNoise.js
    fluid2dGas.js
    anotherShader.js

  projects/
    ProjectIndex.generated.js
    ProjectListPage.js
    ProjectDetailPage.js
    MarkdownRenderer.js

  utils/
    dom.js
    paths.js
    errors.js

scripts/
  generate-content-index.mjs

css/
  base.css
  home.css
  projects-list.css
  project-detail.css
```

## Three.js Background Requirements

Create a persistent background system.

The background system should own:

* One canvas.
* One WebGL renderer.
* One scene.
* One orthographic camera.
* One animation loop.
* One resize handler.
* One active theme at a time.
* Theme switching through the existing UI.
* Persisting the selected theme if that behavior already exists.

The camera should be fixed and predictable.

Preferred camera model:

* Orthographic camera.
* Fixed camera position.
* Fixed design-space height.
* Width derived from current viewport aspect ratio.
* No per-shader camera setup unless explicitly required later.

Conceptually:

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

## Shader Module Contract

Each shader/theme module should follow a consistent contract.

Example:

```js
export const themeMeta = {
  id: "old-tv-noise",
  label: "Old TV Noise",
  order: 20,
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

Rules:

* A shader module may create meshes, materials, uniforms, render targets, and helper objects.
* A shader module must clean up GPU resources in `dispose()`.
* A shader module must not create the main renderer.
* A shader module must not create the main canvas.
* A shader module must not own the global animation loop.
* A shader module must not directly own the website theme selector UI.
* A shader module should document its public behavior with JSDoc.

## Shader Discovery

Because this is a static GitHub Pages site, the browser cannot scan folders at runtime.

Automatic discovery should be handled by a build-time generator script.

The generator should scan shader modules and write a generated registry file, for example:

```txt
js/background/ThemeRegistry.generated.js
```

Adding a shader should require:

1. Creating a new file under `js/shaders/`.
2. Exporting `themeMeta`.
3. Exporting `createTheme(context)`.
4. Running the generator script.

No HTML or CSS should need to change.

## Project Markdown Requirements

Replace manually maintained project HTML pages with markdown-driven content.

Each project should be represented by one markdown file under:

```txt
content/projects/
```

Example:

```md
---
slug: shotbuilder
title: ShotBuilder
summary: Unreal/USD tooling for shot assembly and pipeline automation.
date: 2026-01-01
type: Production Tool
thumbnail: assets/projects/shotbuilder/thumb.jpg
tags:
  - Unreal Engine
  - Python
  - USD
  - Pipeline
---

# ShotBuilder

Project body here.
```

The markdown renderer should support a controlled subset:

* Front matter.
* Headings.
* Paragraphs.
* Links.
* Images.
* Lists.
* Code blocks.
* Blockquotes or callouts.
* Horizontal rules.

Avoid arbitrary HTML injection unless there is a clear reason.

## Project Page Requirements

Use one reusable project detail page, for example:

```txt
project.html?slug=shotbuilder
```

The project page should:

* Read the slug from the URL.
* Find the project metadata from the generated project index.
* Load the markdown file.
* Render the markdown into the project page layout.
* Show a clean error state if the project does not exist.

The project list page should render cards from project metadata instead of hardcoded project objects.

## Project Discovery

Use a build-time generator script to scan:

```txt
content/projects/*.md
```

and generate:

```txt
js/projects/ProjectIndex.generated.js
```

The generated project index should include:

* Slug.
* Title.
* Summary.
* Date.
* Type.
* Tags.
* Thumbnail path.
* Markdown file path.

Generated files should be deterministic and safe to commit.

## Build-Time Generator

Add a script such as:

```txt
scripts/generate-content-index.mjs
```

It should generate both:

```txt
js/projects/ProjectIndex.generated.js
js/background/ThemeRegistry.generated.js
```

The script should be simple Node.js. It should not require a backend.

If package scripts exist, add something like:

```json
{
  "scripts": {
    "generate": "node scripts/generate-content-index.mjs",
    "dev": "npm run generate && vite --host 127.0.0.1 --port 5173",
    "build": "npm run generate"
  }
}
```

Do not introduce a heavy framework.

## Phased Implementation

### Phase 0: Audit

Do not edit files.

Inspect the repo and report:

* Current entry points.
* Current Three.js setup files.
* Current theme/shader files.
* Current project page/data files.
* Current local dev workflow.
* Files that would be touched.
* Risks.
* Recommended implementation order.

Wait for approval before editing.

### Phase 1: Three.js Background Refactor

Refactor only the Three.js background system.

Acceptance criteria:

* Existing visual look remains substantially the same.
* Existing shader/theme selector still works.
* Selected shader/theme persistence still works if currently supported.
* There is one persistent canvas.
* There is one persistent renderer.
* There is one persistent orthographic camera.
* There is one animation loop.
* Existing shaders are migrated to the new module contract.
* Each shader has `update()`, `resize()`, and `dispose()`.
* No project markdown work in this phase.

### Phase 2: Project Markdown Renderer

Add the markdown-driven project system.

Acceptance criteria:

* Project metadata can be read from markdown front matter.
* A reusable project detail page can render a project from a slug.
* Existing project pages are migrated to markdown.
* Project cards can be generated from metadata.
* The current visual organization is preserved.
* No shader architecture changes in this phase.

### Phase 3: Generator Script

Add automatic discovery through a build-time generator.

Acceptance criteria:

* Generator scans project markdown files.
* Generator scans shader modules.
* Generator writes deterministic generated registry files.
* Adding a markdown project and rerunning the generator makes the project available.
* Adding a shader module and rerunning the generator makes the shader available.
* No HTML/CSS edits are required for normal new projects or shaders.

### Phase 4: Cleanup and Documentation

Add final documentation and cleanup.

Acceptance criteria:

* README explains how to run locally.
* README explains how to add a project.
* README explains how to add a shader.
* Public modules/functions have useful JSDoc.
* Dead code from old project pages or old shader setup is removed only after replacements are verified.
* The site remains static and GitHub Pages compatible.

## Agent Rules

Before editing:

* Read this plan.
* Inspect the repository.
* Do not assume the current implementation details.
* Produce a concise implementation plan.
* List exact files to touch.
* Wait for approval.

During editing:

* Keep changes small.
* Do not redesign the site.
* Do not introduce a frontend framework.
* Do not touch unrelated files.
* Preserve current behavior unless the phase explicitly requires changing it.
* Stop after each phase and show the diff.

After editing:

* Explain what changed.
* Explain how to test it.
* List remaining risks.
* Do not continue to the next phase without approval.
