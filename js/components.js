// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";
import { projects } from "./projects/ProjectIndex.generated.js";

/**
 * Wires the shared header navigation to the current base path.
 */
export function setupHeaderLinks() {
  const homeLink = document.getElementById("home-link");
  const navHome = document.getElementById("nav-home");
  const navProjects = document.getElementById("nav-projects");

  if (homeLink) homeLink.href = `${BASE_PATH}index.html`;
  if (navHome) navHome.href = `${BASE_PATH}index.html`;
  if (navProjects) navProjects.href = `${BASE_PATH}projects.html`;
}

/**
 * Populates the footer with the current year and latest project update date.
 * The footer stays static in markup while the dates are derived at runtime from
 * the generated project registry.
 */
export function setupFooterMetadata() {
  const yearNode = document.getElementById("footer-year");
  const updatedNode = document.getElementById("footer-last-updated");

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  if (updatedNode) {
    updatedNode.textContent = formatLatestProjectDate(projects);
  }
}

/**
 * Formats the most recent project date for the footer.
 * @param {Array<{date?: string}>} projectList
 * @returns {string}
 */
function formatLatestProjectDate(projectList) {
  const latestDate = projectList
    .map((project) => parseProjectDate(project.date))
    .filter((date) => date !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0];

  if (!latestDate) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date());
  }

  return `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(latestDate)}, ${latestDate.getFullYear()}`;
}

/**
 * Parses a project date string into a Date instance.
 * @param {string | undefined} value
 * @returns {Date | null}
 */
function parseProjectDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
