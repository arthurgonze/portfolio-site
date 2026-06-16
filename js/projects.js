// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { BASE_PATH } from "./config.js";
import { projects } from "./projects/ProjectIndex.generated.js";

const searchInput = document.getElementById("project-search");
const dateFilter = document.getElementById("project-filter-date");
const projectGrid = document.querySelector(".project-grid");
let projectItems = [];

populateDateFilter();
renderProjectCards();

if (searchInput) {
  searchInput.addEventListener("input", filterProjects);
}
if (dateFilter) {
  dateFilter.addEventListener("change", filterProjects);
}

function populateDateFilter() {
  if (!dateFilter) {
    return;
  }

  const years = Array.from(
    new Set(
      projects
        .map((project) => getProjectYear(project.date))
        .filter((year) => year !== ""),
    ),
  ).sort((left, right) => Number(right) - Number(left));

  dateFilter.innerHTML = [
    '<option value="all">All Dates</option>',
    ...years.map((year) => `<option value="${year}">${year}</option>`),
  ].join("");
}

function filterProjects() {
  if (!projectGrid) return;

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const selectedDate = dateFilter ? dateFilter.value : "all";

  projectItems.forEach((item) => {
    const projectName = item.dataset.projectName
      ? item.dataset.projectName.toLowerCase()
      : "";
    const projectDate = item.dataset.projectDate || "";

    const nameMatch = projectName.includes(searchTerm);

    let dateMatch = false;
    if (selectedDate === "all") {
      dateMatch = true;
    } else if (projectDate) {
      const projectYear = projectDate.substring(0, 4);
      if (projectYear === selectedDate) {
        dateMatch = true;
      }
    }

    item.hidden = !(nameMatch && dateMatch);
  });
}

function renderProjectCards() {
  if (!projectGrid) return;

  projectGrid.innerHTML = projects
    .map(
      (project) => `
      <article class="project-item" data-project-name="${escapeAttribute(project.title)}" data-project-date="${escapeAttribute(project.date || "")}">
        <a href="${escapeAttribute(
          `${BASE_PATH}project.html?slug=${encodeURIComponent(project.slug)}`,
        )}">
          <img src="${escapeAttribute(project.thumbnail || "")}" alt="${escapeAttribute(
            `${project.title} Thumbnail`,
          )}" />
          <h3>${escapeHtml(project.title)}</h3>
          <p>${escapeHtml(project.summary)}</p>
        </a>
      </article>
      `,
    )
    .join("");

  projectItems = Array.from(projectGrid.querySelectorAll(".project-item"));
  filterProjects();
}

function getProjectYear(dateValue) {
  if (typeof dateValue !== "string" || dateValue.length < 4) {
    return "";
  }

  return dateValue.slice(0, 4);
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
