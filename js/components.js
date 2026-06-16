// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";

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
