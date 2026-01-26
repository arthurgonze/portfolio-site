// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";

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
  document.getElementById("shader-20250320").href =
    `${BASE_PATH}projects/cool-shader-effect.html`;
  document.getElementById("unreal-20250210").href =
    `${BASE_PATH}projects/interactive-unreal-scene.html`;
  document.getElementById("vr-20260105").href =
    `${BASE_PATH}projects/webvr-experiment.html`;
}
