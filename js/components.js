// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";
import { projects } from "./projectsData.js";

export async function includeComponent(url, selector) {
  const container = document.querySelector(selector);
  if (!container) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  container.innerHTML = await res.text();
}

export function loadHeaderAndFooter() {
  return Promise.all([
    includeComponent(`${BASE_PATH}components/header.html`, "header"),
    includeComponent(`${BASE_PATH}components/footer.html`, "footer"),
  ]);
}

export function setupHeaderLinks() {
  document.getElementById("home-link").href = `${BASE_PATH}index.html`;
  document.getElementById("nav-home").href = `${BASE_PATH}index.html`;
  document.getElementById("nav-projects").href = `${BASE_PATH}projects.html`;
}

export function setupProjectLinks() {
  projects.forEach((project) => {
    const link = document.getElementById(project.id);
    if (link) {
      link.href = `${BASE_PATH}projects/${project.slug}.html`;
    }
  });
}
