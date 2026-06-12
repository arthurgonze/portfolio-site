
# Phase 2: Project Markdown Vertical Slice

## Goal

Prove the markdown-driven project system with one project only.

This phase should not migrate every project. It should create a working vertical slice that demonstrates the final direction:

* One markdown project file.
* One reusable project detail page.
* One slug-based loading path.
* One markdown/front matter parser.
* One controlled markdown renderer.
* One clean invalid-slug error state.

The current visual style should be preserved.

## Main Problem

Projects are currently too manual. Each project requires custom HTML structure, which makes adding or editing projects slower than necessary.

The target direction is that project content lives in markdown files, while the HTML/CSS/JS infrastructure renders the project consistently.

Adding a project should eventually mean adding a markdown file, not manually creating a new HTML page.

## Hard Constraints

* Keep the site static and GitHub Pages compatible.
* Use vanilla JavaScript, HTML, CSS, and Three.js.
* Do not introduce React, Vue, Astro, Svelte, or a backend.
* Do not redesign the website.
* Preserve the current project page visual style as much as possible.
* Keep the existing project pages working during this phase.
* Do not remove old project HTML pages yet.
* Do not implement the generator script yet.
* Do not touch the Three.js background architecture unless strictly required to keep the page working.
* Keep the implementation small and reviewable.

## Scope

Implement a single-project markdown vertical slice.

This phase should add:

* One markdown project file.
* One reusable project detail HTML page.
* A markdown/front matter loader.
* A controlled markdown renderer.
* A slug-based project loading flow.
* A clean invalid-slug fallback page/state.
* Minimal metadata needed to render one project.

This phase may use a temporary manual project index or hardcoded mapping for the vertical slice.

Automatic discovery belongs to a later generator phase.

## Out of Scope

Do not migrate every project.

Do not delete old project HTML pages.

Do not replace the entire project list system yet unless required for the vertical slice.

Do not add generated project registries yet.

Do not add shader discovery.

Do not add build-time generator scripts.

Do not rewrite the whole site router.

Do not redesign the project cards or project detail layout.

## Preferred Folder Direction

The exact structure may be adjusted after inspecting the repo, but the direction should be similar to:

```txt
content/
  projects/
    example-project.md

project.html

js/
  projects/
    MarkdownRenderer.js
    ProjectDetailPage.js
    ProjectIndex.manual.js
```

If the repo already has equivalent project files, adapt the structure instead of moving files unnecessarily.

## Markdown File Format

Each project markdown file should contain front matter plus body content.

Example:

```md
---
slug: example-project
title: Example Project
summary: Short description used by project cards or metadata.
date: 2026-01-01
type: Technical Project
thumbnail: assets/projects/example-project/thumb.jpg
tags:
  - Three.js
  - JavaScript
  - WebGL
---

# Example Project

Project body content here.

## Overview

A paragraph describing the project.

## Technical Details

- Point one.
- Point two.

## Links

[GitHub](https://example.com)
```

The exact metadata fields may be adjusted after inspecting current project data, but keep the first version minimal.

Recommended metadata fields:

* `slug`
* `title`
* `summary`
* `date`
* `type`
* `thumbnail`
* `tags`

## Markdown Rendering Requirements

Implement a controlled markdown subset.

Support:

* Front matter.
* `#`, `##`, and `###` headings.
* Paragraphs.
* Links.
* Images.
* Unordered lists.
* Ordered lists if easy and safe.
* Code blocks.
* Inline code.
* Blockquotes if easy.
* Horizontal rules if easy.
* Tables.
* Highlight.
* Footnotes.

Do not support arbitrary HTML injection unless there is a clear reason.

The renderer should produce predictable HTML that fits the existing project page design.

## Reusable Project Detail Page

Add one reusable page, for example:

```txt
project.html?slug=example-project
```

The page should:

* Read the `slug` query parameter.
* Look up the project metadata/path.
* Fetch the markdown file.
* Parse front matter.
* Render the markdown body.
* Insert the result into the page.
* Show a clean error state if the slug is missing or invalid.
* Preserve the site header/footer/navigation behavior if currently used.

## Temporary Project Index

Because automatic discovery is out of scope for this phase, use a temporary manual index.

Example:

```js
export const projects = [
  {
    slug: "example-project",
    markdownPath: "content/projects/example-project.md",
  },
];
```

This temporary manual index can later be replaced by a generated registry in the generator phase.

Do not overbuild discovery in Phase 2.

## Project List Integration

For this vertical slice, project list integration should be minimal.

Acceptable options:

1. Add a single link somewhere appropriate that opens `project.html?slug=example-project`.
2. Or adapt one existing project card to point to the new reusable detail page.
3. Or keep existing project list behavior and only test the new page directly.

Do not migrate the whole project list unless the implementation is already trivial and low-risk.

## Documentation Requirements

Add useful JSDoc for public functions/modules introduced in this phase.

Focus on explaining:

* How markdown is loaded.
* How front matter is parsed.
* What markdown subset is supported.
* How slug lookup works.
* What error states exist.

Avoid excessive comments that only restate the code.

## Implementation Rules

Before editing, inspect the repo and list:

* Existing project list files.
* Existing project detail HTML files.
* Existing shared component/header/footer files.
* Exact files that will be added or changed.
* Which single project will be used for the vertical slice.

During implementation:

* Keep old project pages working.
* Keep existing visual style.
* Keep the diff focused.
* Do not migrate everything.
* Do not add a generator.
* Do not remove old files.
* Stop after the vertical slice works.

## Acceptance Criteria

The phase is complete when:

* `project.html?slug=<chosen-project>` loads one markdown-backed project.
* Missing slug shows a clean error.
* Invalid slug shows a clean error.
* Markdown front matter is parsed.
* Markdown body is rendered.
* The rendered page visually fits the current site.
* The implementation uses vanilla JavaScript.
* Existing project pages still work.
* No generator script was added.
* No old project pages were deleted.
* No full project migration was attempted.

## Test Plan

After implementation, test:

1. Open the site locally.
2. Load `project.html?slug=<chosen-project>`.
3. Confirm title, summary, tags, and body content render.
4. Load `project.html` without a slug.
5. Load `project.html?slug=invalid-project`.
6. Confirm clean error states.
7. Confirm the existing projects page still works.
8. Confirm existing project HTML pages still work.
9. Confirm the browser console has no new runtime errors.
10. Confirm the page still works as a static site.

## Stop Condition

After implementation, stop and report:

* Files added.
* Files changed.
* Chosen project for the vertical slice.
* Markdown format used.
* Markdown subset supported.
* How to test.
* Known risks.
* Git diff summary.

Do not migrate all projects.

Do not add generator scripts.

Do not delete old project pages.

Wait for approval before proceeding to full migration.
