// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

export async function loadHTML(url, selector) {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn(`Container '${selector}' not found`);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load $P{url}: ${response.status}`);
    }
    container.innerHTML = await response.text();
  } catch (err) {
    console.error(`Error laoding ${url}:`, err);
    container.innerHTML = `<p style="color: red;">Failed to laod content.</p>`;
  }
}

export async function loadHeaderAndFooter(basePath) {
  return Promise.all([
    loadHTML(`${basePath}components/header.html`, "header"),
    loadHTML(`${basePath}components/footer.html`, "footer"),
  ]);
}
