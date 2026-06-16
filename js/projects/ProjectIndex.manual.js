// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

/**
 * Temporary manual project registry for the markdown-backed project flow.
 *
 * Each entry mirrors the metadata stored in the project's markdown front matter
 * so the projects list and project detail page can use the same source during
 * the migration phase.
 *
 * @type {Array<{
 *   slug: string,
 *   title: string,
 *   summary: string,
 *   date: string,
 *   type: string,
 *   thumbnail: string,
 *   heroImage: string,
 *   heroAlt: string,
 *   tags: string[],
 *   markdownPath: string,
 * }>}
 */
export const projectIndex = [
  {
    slug: "cool-shader-effect",
    title: "Cool Shader Effect",
    summary: "A short description of this amazing shader project goes here.",
    date: "2025-03-20",
    type: "Shader / WebGL",
    thumbnail: "https://placehold.co/300x200/00aaff/white?text=Shader+FX",
    heroImage: "https://placehold.co/800x400/00aaff/white?text=Cool+Shader+Visual",
    heroAlt: "Visual of the cool shader effect",
    tags: ["GLSL", "Three.js"],
    markdownPath: "content/projects/cool-shader-effect.md",
  },
  {
    slug: "interactive-unreal-scene",
    title: "Interactive Unreal Scene",
    summary: "Brief overview of the Unreal Engine project and its features.",
    date: "2025-02-10",
    type: "Unreal Engine Project",
    thumbnail: "https://placehold.co/300x200/7700ff/white?text=Unreal+Scene",
    heroImage: "https://placehold.co/800x400/7700ff/white?text=Unreal+Environment+Shot",
    heroAlt: "Screenshot of the Unreal Engine scene",
    tags: ["Unreal Engine 5", "Blueprints", "C++"],
    markdownPath: "content/projects/interactive-unreal-scene.md",
  },
  {
    slug: "webvr-experiment",
    title: "WebVR Experiment",
    summary: "Exploring virtual reality interactions directly in the web browser.",
    date: "2026-01-05",
    type: "WebXR / VR",
    thumbnail: "https://placehold.co/300x200/ff9900/white?text=WebVR+Exp",
    heroImage: "https://placehold.co/800x400/ff9900/white?text=WebVR+Interaction",
    heroAlt: "Concept image for WebVR interaction",
    tags: ["Three.js", "WebXR API", "Virtual Reality", "Interaction"],
    markdownPath: "content/projects/webvr-experiment.md",
  },
];

/**
 * Returns the manual project entry for a slug.
 * @param {string} slug
 * @returns {(typeof projectIndex)[number] | null}
 */
export function getProjectBySlug(slug) {
  return projectIndex.find((project) => project.slug === slug) || null;
}
