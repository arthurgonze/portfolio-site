# Portfolio Site

Static GitHub Pages portfolio built with vanilla HTML, CSS, JavaScript, and Three.js.

## Requirements

- Node.js and npm
- `live-server` on your PATH if you want to run the site from the terminal directly
- Optional: Neovim with the repo's `.nvim.lua` helper

## Local Development

1. `npm install`
2. `npm run generate`
3. Start a static server:
   - `live-server --port=8080 --browser=chrome`
   - or, in Neovim, press `<leader>Ls` to start the same server
4. Open `http://localhost:8080`

## Content Generation

- `npm run generate` scans `content/projects/*.md` and `js/themes/*.js`
- It writes `js/projects/ProjectIndex.generated.js` and `js/background/ThemeRegistry.generated.js`
- `npm run build` runs the same generator
- Do not edit the generated files by hand

## Adding a Project

1. Add a markdown file under `content/projects/`
2. Include front matter with required `slug`, `title`, and `summary` fields; `date`, `type`, `thumbnail`, `heroImage`, `heroAlt`, and `tags` are optional
3. Write the project body in the supported markdown subset
4. Run `npm run generate`
5. Open `project.html?slug=<slug>`

Example:

```md
---
slug: example-project
title: Example Project
summary: Short description.
date: 2026-01-01
type: Technical Project
thumbnail: assets/projects/example-project/thumb.jpg
heroImage: assets/projects/example-project/hero.jpg
heroAlt: Example Project preview
tags:
  - Three.js
  - JavaScript
---

# Example Project

Short body copy goes here.
```

## Markdown Format

The renderer supports:

- Front matter
- Headings
- Paragraphs
- Links
- Images
- Ordered and unordered lists
- Code blocks
- Inline code, emphasis, strong text, highlight, and footnote references
- Blockquotes
- Tables
- Horizontal rules

## Adding a Shader Theme

1. Create a module under `js/themes/`
2. Export `themeMeta`
3. Export `createTheme(context)`
4. Use the shared `canvas`, `renderer`, `scene`, `camera`, and `viewport` from the context
5. Implement `update()`, `resize()`, and `dispose()`
6. Run `npm run generate`
7. Test the theme selector and refresh persistence

Example:

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

## Folder Structure

- `content/projects/` project markdown
- `js/background/` background system and generated theme registry
- `js/projects/` project detail rendering and generated project registry
- `js/themes/` shader and theme modules
- `projects.html` project list page
- `project.html` reusable project detail page
- `scripts/generate-content-index.mjs` generator script

## Deployment / GitHub Pages

- The site is static and has no backend
- Generated registries are committed so GitHub Pages can serve the site directly
- The repo includes a root `.nojekyll` marker so GitHub Pages serves `content/projects/*.md` as raw files
- The app derives its base path from the current page URL, so local Live Server and GitHub Pages both work without changing code
- If the repo is published under a different GitHub Pages path later, the code follows that path automatically

