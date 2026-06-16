// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
/**
 * Base path for local development and GitHub Pages deployments.
 *
 * Derives the site root from the current page URL so the same code works on
 * localhost and on GitHub Pages without hardcoding the deployment hostname or
 * repo name.
 */
export const BASE_PATH = new URL(".", window.location.href).pathname;
