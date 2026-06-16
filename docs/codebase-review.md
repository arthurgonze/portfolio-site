# Portfolio Site Web-Side Review

## Overview

This started as a small maintenance review, and the codebase now reflects the cleanup pass. The site still stays simple: static HTML, CSS, JavaScript, Three.js, generated registries, and markdown-backed project content.

The remaining job for the web layer is to stay out of the way so project markdown and shader/theme modules can keep growing without extra HTML/CSS work.

## What Was Kept

- `js/background/BackgroundApp.js`, `js/background/CameraRig.js`, `js/background/ThemeManager.js`, and `js/background/ShaderThemeBase.js` still provide a clean background lifecycle.
- `js/projects/ProjectDetailPage.js`, `js/projects/MarkdownRenderer.js`, and `js/projects/ProjectIndex.generated.js` still provide the reusable project-detail flow.
- `scripts/generate-content-index.mjs` still keeps project and theme registries deterministic and static-site friendly.
- `js/themes/` remains the right place for shader growth while the site shell stays stable.

## Cleanup Applied

- Shared CSS tokens now live in `css/base.css`, and the page-specific styles consume those tokens instead of repeating the same color and surface values everywhere.
- The Three.js version is aligned across `package.json`, `package-lock.json`, and the HTML import maps.
- The projects page now renders direct project links when it builds the cards, so the extra link-patching step is gone.
- The projects date filter now derives its options from the generated project metadata instead of hardcoded year entries in HTML.
- The footer now fills its year and "last updated" label from generated project metadata instead of hardcoded text.
- Theme persistence now uses the configured storage key instead of a hardcoded value, and `ThemeManager` now uses its injected registry directly.
- The retro wave theme’s perspective camera is documented as intentional, so it reads as a theme-owned exception instead of accidental drift.

## Bottom Line

The web side is effectively closed. I would not add a framework, router, component system, or extra build complexity.

If anything grows from here, it should be only:

- new shader/theme modules in `js/themes/`
- new project markdown files in `content/projects/`

That keeps the site easy to maintain and preserves the current scope.
