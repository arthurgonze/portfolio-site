// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import { projectIndex } from "./projects/ProjectIndex.manual.js";

/**
 * Legacy project list adapter used by the current list page.
 *
 * The list still expects `name`, `description`, and `detailUrl` fields, so this
 * module reshapes the manual project registry without duplicating the content.
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
