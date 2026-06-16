// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import { projects as projectIndex } from "./projects/ProjectIndex.generated.js";

/**
 * Legacy project list adapter used by the current list page.
 *
 * The list still expects `name`, `description`, and `detailUrl` fields, so this
 * module reshapes the generated project registry without duplicating content.
 */
export const projects = projectIndex.map((project) => ({
  id: `project-${project.slug}`,
  slug: project.slug,
  name: project.title,
  date: project.date,
  year: typeof project.date === "string" && project.date ? project.date.slice(0, 4) : "",
  type: project.type,
  description: project.summary,
  thumbnail: project.thumbnail,
  detailUrl: `project.html?slug=${project.slug}`,
}));
