// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

/**
 * Fetches an HTML partial and injects it into the first matching container.
 * @param {string} url
 * @param {string} selector
 */
export async function loadHTML(url, selector) {
  const container = document.querySelector(selector);
  if (!container) {
    console.warn(`Container '${selector}' not found`);
    return;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }
    container.innerHTML = await response.text();
  } catch (err) {
    console.error(`Error loading ${url}:`, err);
    container.innerHTML = `<p style="color: red;">Failed to load content.</p>`;
  }
}

/**
 * Loads the shared header and footer partials for the site shell.
 * @param {string} basePath
 * @returns {Promise<[void, void]>}
 */
export async function loadHeaderAndFooter(basePath) {
  return Promise.all([
    loadHTML(`${basePath}components/header.html`, "header"),
    loadHTML(`${basePath}components/footer.html`, "footer"),
  ]);
}
