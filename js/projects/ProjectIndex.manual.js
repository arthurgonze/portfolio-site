// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

/**
 * Temporary project index used by the Phase 2 markdown vertical slice.
 */
export const projectIndex = [
  {
    slug: "webvr-experiment",
    markdownPath: "content/projects/webvr-experiment.md",
  },
];

/**
 * Returns the manual project entry for a slug.
 * @param {string} slug
 * @returns {{slug: string, markdownPath: string} | null}
 */
export function getProjectBySlug(slug) {
  return projectIndex.find((project) => project.slug === slug) || null;
}
