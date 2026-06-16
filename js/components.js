// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";
import { projects } from "./projectsData.js";

export function setupHeaderLinks() {
  const homeLink = document.getElementById("home-link");
  const navHome = document.getElementById("nav-home");
  const navProjects = document.getElementById("nav-projects");

  if (homeLink) homeLink.href = `${BASE_PATH}index.html`;
  if (navHome) navHome.href = `${BASE_PATH}index.html`;
  if (navProjects) navProjects.href = `${BASE_PATH}projects.html`;
}

/**
 * Wires project cards to the reusable slug-based project detail page.
 */
export function setupProjectLinks() {
  projects.forEach((project) => {
    const link = document.getElementById(project.id);
    if (link) {
      link.href = project.detailUrl
        ? `${BASE_PATH}${project.detailUrl}`
        : `${BASE_PATH}project.html?slug=${project.slug}`;
    }
  });
}
