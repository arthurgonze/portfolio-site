
# Phase 3: Project Markdown Migration

## Goal

Migrate the remaining manually maintained project pages into the markdown-driven project system created in Phase 2.

This phase should finish the project-content migration, but it should not introduce automatic discovery yet. Automatic discovery belongs to the generator phase.

The current visual style should remain materially the same.

## Main Problem

Phase 2 proved that one project can be rendered from markdown through a reusable detail page.

The remaining issue is that the site still has project content split between the new markdown system and older manual HTML pages or hardcoded data. This phase should move the rest of the project content into markdown and make the project list/detail flow consistently use markdown-backed metadata.

## Hard Constraints

* Keep the site static and GitHub Pages compatible.
* Use vanilla JavaScript, HTML, CSS, and Three.js.
* Do not introduce React, Vue, Astro, Svelte, or a backend.
* Do not redesign the website.
* Preserve the current project list and project detail visual style.
* Keep changes reviewable.
* Do not add the build-time generator yet.
* Do not delete old project HTML pages until the new markdown versions are verified.
* Do not touch the Three.js background system unless required to keep pages working.

## Scope

Migrate all remaining project content into markdown files under the project-content folder established in Phase 2.

Update the manual project index created in Phase 2 so all migrated projects can be reached through the reusable project detail page.

Update the project list page so project cards link to the reusable markdown-backed detail page instead of individual project HTML pages.

## Out of Scope

Do not add automatic folder scanning.

Do not add generated registry files.

Do not add the build-time generator script.

Do not remove old project HTML pages yet unless explicitly approved after testing.

Do not redesign project cards.

Do not redesign project detail pages.

Do not migrate shader/theme discovery.

## Expected Input From Phase 2

Phase 2 should already have some equivalent of:

```txt
content/projects/
  one-project.md

project.html

js/projects/
  MarkdownRenderer.js
  ProjectDetailPage.js
  ProjectIndex.manual.js
```

The actual filenames may differ. Inspect the repo and adapt to the existing Phase 2 implementation.

## Markdown Migration Rules

For each existing project, create one markdown file.

Each markdown file should include front matter and body content.

Recommended front matter fields:

```md
---
slug: project-slug
title: Project Title
summary: Short project summary.
date: 2026-01-01
type: Technical Project
thumbnail: assets/projects/project-slug/thumb.jpg
tags:
  - JavaScript
  - Three.js
  - Unreal Engine
---
```

Use the metadata fields already established in Phase 2 where possible. Do not invent unnecessary new fields unless the current project content requires them.

## Content Preservation

When migrating an existing project page:

* Preserve the project title.
* Preserve the project description.
* Preserve links.
* Preserve images and media references.
* Preserve project tags/technology labels if they exist.
* Preserve the general content order.
* Preserve visual intent, but express it through markdown and the reusable renderer.

Do not rewrite project text unless needed to make it fit the markdown structure.

## Project List Integration

Update the project list/cards so they use markdown-backed metadata.

Cards should link to:

```txt
project.html?slug=<project-slug>
```

The project list should not require per-project HTML links after this phase.

If the project list still needs a manual index for now, update that manual index. The generated index will replace it in Phase 4.

## Old Project Pages

Old project HTML pages should become obsolete after migration, but do not delete them yet.

Instead:

* Leave old pages in place during this phase.
* Stop linking to old pages from the main project list.
* Document which old pages are now replaced.
* Confirm each migrated markdown page works before considering deletion in Phase 5.

## Documentation Requirements

Add or update JSDoc where needed for public functions touched in this phase.

Focus on:

* Project metadata loading.
* Project card rendering.
* Project detail loading.
* Slug lookup.
* Error state behavior.

Do not add noisy comments that only repeat implementation details.

## Implementation Rules

Before editing, inspect the repo and list:

* Existing old project HTML files.
* Existing markdown project files.
* Current manual project index.
* Current project list rendering file.
* Exact projects to migrate.
* Exact files that will be added or changed.

During implementation:

* Migrate projects one by one.
* Keep the old project pages available.
* Keep the visual style stable.
* Keep links and media paths valid.
* Update only project-related files.
* Do not implement the generator yet.
* Stop after all project content is migrated and testable.

## Acceptance Criteria

The phase is complete when:

* All existing projects have markdown files.
* The reusable project detail page can load every migrated project by slug.
* The project list links to markdown-backed detail pages.
* Missing slug shows a clean error.
* Invalid slug shows a clean error.
* Existing old project HTML pages still exist.
* Old project pages are no longer linked from the main project list.
* No generator script was added.
* No generated project index was added.
* The site remains static and GitHub Pages compatible.
* The visual layout remains materially the same.

## Test Plan

After implementation, test:

1. Start the local dev server.
2. Open the home page.
3. Open the projects list page.
4. Click every project card.
5. Confirm every project opens through `project.html?slug=<slug>`.
6. Confirm each project title, summary, body, links, tags, and images render correctly.
7. Open `project.html` without a slug.
8. Open `project.html?slug=invalid-project`.
9. Confirm clean error states.
10. Confirm old project HTML pages still load if opened directly.
11. Confirm the browser console has no new runtime errors.

## Stop Condition

After implementation, stop and report:

* Files added.
* Files changed.
* Projects migrated.
* Old project pages replaced but not deleted.
* How to test each project.
* Known risks.
* Git diff summary.

Do not add the generator script.

Do not delete old project pages.

Do not proceed to cleanup documentation without approval.
