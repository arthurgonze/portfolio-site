
# Phase 5: Cleanup and Documentation

## Goal

Remove obsolete manual paths only after the markdown project system and generated registries are working, then document the new workflow clearly.

This phase should make the repo understandable and maintainable.

## Main Problem

After Phases 1 through 4, the new architecture should be working, but old files, obsolete manual indexes, old project pages, and outdated README instructions may still exist.

This phase should remove confirmed dead code and document how to work with the new system.

## Hard Constraints

* Keep the site static and GitHub Pages compatible.
* Use vanilla JavaScript, HTML, CSS, Three.js, and simple Node.js tooling only.
* Do not redesign the website.
* Do not change behavior unless removing confirmed obsolete paths.
* Do not remove a file unless no live page imports or links to it.
* Do not remove old project pages unless their markdown replacements are verified.
* Keep cleanup reviewable.
* Prefer conservative deletion over risky deletion.

## Scope

Clean up obsolete code and documentation after verifying the new architecture.

Expected cleanup areas:

* Old manual project HTML pages.
* Old manual project data files.
* Old manual theme registry/config files.
* Obsolete code paths from the old Three.js setup.
* Obsolete project-loading code.
* README instructions that no longer match the repo.
* Any temporary manual index from Phase 2 if replaced by generated files.

Update documentation for:

* Running the site locally.
* Regenerating content indexes.
* Adding a new project.
* Adding a new shader/theme.
* Project markdown format.
* Shader module contract.
* Folder structure.
* GitHub Pages/static-site constraints.

## Out of Scope

Do not redesign the site.

Do not add new features.

Do not refactor unrelated files.

Do not rewrite all documentation into excessive detail.

Do not introduce new tooling beyond what Phase 4 already added.

## Cleanup Rules

Before deleting anything:

* Search for references.
* Confirm no imports use the file.
* Confirm no HTML links point to the file.
* Confirm no generated registry depends on the file.
* Confirm the replacement path works.
* List the file as safe to delete before deleting.

If uncertain, leave the file and document it as a follow-up risk.

## Old Project Pages

Old project HTML pages may be deleted only if:

* Every project has a markdown replacement.
* The project list links to `project.html?slug=<slug>`.
* Direct testing confirms every markdown project page works.
* There are no internal links still pointing to old HTML pages.
* The user has approved deleting old pages.

If deletion is risky, do not delete. Instead, mark them as obsolete in the report.

## Manual Registries

Old manual registries may be removed only if:

* Generated registries are used at runtime.
* Runtime imports point to generated files.
* The generator can regenerate the files deterministically.
* Home page and project pages still work.
* Theme switching still works.

If a manual registry still provides behavior not represented in generated files, do not delete it yet.

## Documentation Requirements

Update `README.md` or equivalent docs with concise sections.

Recommended sections:

```md
# Portfolio Site

## Requirements

## Local Development

## Content Generation

## Adding a Project

## Adding a Shader Theme

## Folder Structure

## Deployment / GitHub Pages

## Notes for Agents
```

Keep documentation practical and short.

## Local Development Documentation

Document the actual command used by the repo.

Example:

```md
npm install
npm run generate
npm run dev
```

If the user also uses a project-local Neovim `.nvim.lua` workflow, mention it briefly but do not make it the only documented path.

## Adding a Project Documentation

Explain:

1. Create a markdown file under the project content folder.
2. Add required front matter.
3. Write the project body in the supported markdown subset.
4. Run the generator.
5. Start the local server.
6. Open the projects page and test the project detail page.

Include a small markdown example.

## Adding a Shader Documentation

Explain:

1. Create a shader/theme module in the shader folder.
2. Export `themeMeta`.
3. Export `createTheme(context)`.
4. Use the shared renderer/scene/camera from context.
5. Implement `update()`, `resize()`, and `dispose()`.
6. Run the generator.
7. Test the theme selector.

Include a small shader module skeleton.

## Supported Markdown Documentation

Document the supported subset:

* Front matter.
* Headings.
* Paragraphs.
* Links.
* Images.
* Lists.
* Code blocks.
* Inline code.
* Blockquotes if supported.
* Horizontal rules if supported.

Do not claim support for arbitrary Markdown features unless implemented.

## JSDoc Cleanup

Review public functions/classes/modules introduced during the refactor.

Add useful JSDoc where missing.

Prioritize:

* `BackgroundApp`
* `CameraRig`
* `ThemeManager`
* Shader module contract helpers
* `MarkdownRenderer`
* Project loading functions
* Generator functions

Do not add low-value comments to obvious private logic.

## Implementation Rules

Before editing, inspect the repo and list:

* Candidate obsolete files.
* Candidate obsolete imports.
* README sections that are stale.
* Public functions missing useful JSDoc.
* Exact files to change/delete.

During implementation:

* Delete only confirmed dead files.
* Update documentation to match actual commands and actual folder names.
* Keep cleanup separate from feature work.
* Do not redesign the site.
* Do not modify visuals unless required by removing dead code.
* Stop after cleanup and documentation.

## Acceptance Criteria

The phase is complete when:

* README reflects the current workflow.
* Local development instructions are accurate.
* Content generation instructions are accurate.
* Adding a project is documented.
* Adding a shader/theme is documented.
* Obsolete files are removed or explicitly left with a reason.
* No live imports point to deleted files.
* No project cards link to deleted pages.
* Home page works.
* Projects page works.
* Every project detail page works.
* Theme selector works.
* Generator works.
* Browser console has no new runtime errors.
* The site remains GitHub Pages compatible.

## Test Plan

After implementation, test:

1. Run the generator.
2. Start the local dev server.
3. Open the home page.
4. Open the projects page.
5. Open every project detail page.
6. Switch through every shader/theme.
7. Refresh after selecting a theme.
8. Test a narrow/mobile-like viewport.
9. Search the repo for deleted filenames.
10. Search the repo for old project page links.
11. Confirm README commands work.
12. Confirm the browser console has no new runtime errors.

## Stop Condition

After implementation, stop and report:

* Files deleted.
* Files changed.
* Documentation updated.
* Obsolete files intentionally kept, if any.
* How to test the final workflow.
* Known risks.
* Git diff summary.

Do not begin new feature work after cleanup.
