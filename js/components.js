// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
export async function includeComponent(url, selector) {
  const container = document.querySelector(selector);
  if (!container) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  container.innerHTML = await res.text();
}

export function loadHeaderAndFooter() {
  return Promise.all([
    includeComponent("/portfolio-site/components/header.html", "header"),
    includeComponent("/portfolio-site/components/footer.html", "footer"),
  ]);
}
