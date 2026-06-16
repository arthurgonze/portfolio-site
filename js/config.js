// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
/**
 * Base path for local development and GitHub Pages deployments.
 */
export const BASE_PATH =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio-site/";
