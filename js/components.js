// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";
import { siteMeta } from "./siteMeta.generated.js";

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
 * Populates the footer with the current year and the latest site update date.
 * The footer stays static in markup while the dates are derived from generated
 * site metadata.
 */
export function setupFooterMetadata() {
  const yearNode = document.getElementById("footer-year");
  const updatedNode = document.getElementById("footer-last-updated");

  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  if (updatedNode) {
    updatedNode.textContent = formatLastUpdated(siteMeta.lastUpdatedIso);
  }
}

/**
 * Formats the site update timestamp for the footer.
 * @param {string} lastUpdatedIso
 * @returns {string}
 */
function formatLastUpdated(lastUpdatedIso) {
  const parsedDate = new Date(lastUpdatedIso);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date());
  }

  return `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(parsedDate)}, ${parsedDate.getFullYear()}`;
}
