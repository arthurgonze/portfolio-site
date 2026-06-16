// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

import { getProjectBySlug } from "./ProjectIndex.manual.js";
import { loadMarkdownDocument, renderMarkdown } from "./MarkdownRenderer.js";

/**
 * Handles slug-based loading and rendering for the reusable project page.
 */
export class ProjectDetailPage {
  /**
   * @param {object} [options]
   * @param {HTMLElement | null} [options.root]
   */
  constructor({ root = document.getElementById("project-detail-root") } = {}) {
    this.root = root;
  }

  /**
   * Loads the project markdown for the current slug and renders the page.
   */
  async init() {
    if (!this.root) {
      throw new Error("ProjectDetailPage requires a #project-detail-root element.");
    }

    const slug = this._getSlugFromUrl();
    if (!slug) {
      this._renderError(
        "Missing project slug.",
        "Open the page with a URL like project.html?slug=webvr-experiment.",
      );
      return;
    }

    const project = getProjectBySlug(slug);
    if (!project) {
      this._renderError(`Unknown project slug: ${slug}.`, "No markdown project is registered for this slug.");
      return;
    }

    this.root.innerHTML = '<p class="project-status">Loading project...</p>';

    try {
      const markdownUrl = new URL(project.markdownPath, window.location.href).href;
      const { frontMatter, body } = await loadMarkdownDocument(markdownUrl);
      const viewModel = this._buildViewModel(slug, frontMatter);
      this._renderProject(viewModel, body);
    } catch (error) {
      console.error(`Failed to load project "${slug}":`, error);
      this._renderError(
        `Failed to load project: ${slug}.`,
        "The markdown file could not be fetched or parsed.",
      );
    }
  }

  /**
   * Reads the slug query parameter from the current URL.
   * @returns {string}
   */
  _getSlugFromUrl() {
    return new URLSearchParams(window.location.search).get("slug") || "";
  }

  /**
   * Builds a normalized view model for the rendered project page.
   * @param {string} fallbackSlug
   * @param {Record<string, unknown>} frontMatter
   * @returns {{
   *   slug: string,
   *   title: string,
   *   summary: string,
   *   dateLabel: string,
   *   type: string,
   *   tags: string[],
   *   heroImage: string,
   *   heroAlt: string,
   * }}
   */
  _buildViewModel(fallbackSlug, frontMatter) {
    const title = typeof frontMatter.title === "string" && frontMatter.title.trim()
      ? frontMatter.title.trim()
      : formatSlug(fallbackSlug);
    const summary =
      typeof frontMatter.summary === "string" ? frontMatter.summary.trim() : "";
    const type = typeof frontMatter.type === "string" ? frontMatter.type.trim() : "";
    const tags = Array.isArray(frontMatter.tags)
      ? frontMatter.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
      : [];
    const heroImage =
      pickString(frontMatter.heroImage) || pickString(frontMatter.image) || pickString(frontMatter.thumbnail);
    const heroAlt =
      pickString(frontMatter.heroAlt) || `${title} preview`;
    const dateLabel = formatProjectDate(frontMatter.date);

    return {
      slug: fallbackSlug,
      title,
      summary,
      dateLabel,
      type,
      tags,
      heroImage,
      heroAlt,
    };
  }

  /**
   * Renders the project page shell and markdown body.
   * @param {{
   *   title: string,
   *   summary: string,
   *   dateLabel: string,
   *   type: string,
   *   tags: string[],
   *   heroImage: string,
   *   heroAlt: string,
   * }} viewModel
   * @param {string} markdownBody
   */
  _renderProject(viewModel, markdownBody) {
    const metaParts = [];
    if (viewModel.dateLabel) {
      metaParts.push(`<span>Date: ${escapeHtml(viewModel.dateLabel)}</span>`);
    }
    if (viewModel.type) {
      metaParts.push(`<span>Type: ${escapeHtml(viewModel.type)}</span>`);
    }
    if (viewModel.tags.length > 0) {
      metaParts.push(`<span>Tags: ${escapeHtml(viewModel.tags.join(", "))}</span>`);
    }

    this.root.innerHTML = `
      <article class="project-article">
        <h1>${escapeHtml(viewModel.title)}</h1>
        ${metaParts.length > 0 ? `<div class="project-meta">${metaParts.join(" | ")}</div>` : ""}
        ${viewModel.summary ? `<p class="project-summary">${escapeHtml(viewModel.summary)}</p>` : ""}
        ${viewModel.heroImage ? `<img src="${escapeAttribute(viewModel.heroImage)}" alt="${escapeAttribute(viewModel.heroAlt)}" class="project-main-image" />` : ""}
        <div class="project-body">
          ${renderMarkdown(markdownBody)}
        </div>
      </article>
    `;

    document.title = `${viewModel.title} - Arthur Gonze Machado`;
  }

  /**
   * Renders a clean error state for invalid or missing slugs.
   * @param {string} title
   * @param {string} description
   */
  _renderError(title, description) {
    this.root.innerHTML = `
      <section class="project-section project-error">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <p><a href="projects.html" class="button">Back to Projects</a></p>
      </section>
    `;
    document.title = `${title} - Arthur Gonze Machado`;
  }
}

function pickString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatProjectDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
