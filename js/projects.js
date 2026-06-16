// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado
import { setupProjectLinks } from "./components.js";
import { projects } from "./projects/ProjectIndex.generated.js";

const searchInput = document.getElementById("project-search");
const dateFilter = document.getElementById("project-filter-date");
const projectGrid = document.querySelector(".project-grid");
let projectItems = projectGrid
  ? Array.from(projectGrid.querySelectorAll(".project-item"))
  : [];

// Function to filter and display projects
function filterProjects() {
  if (!projectGrid) return;

  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const selectedDate = dateFilter ? dateFilter.value : "all";

  projectItems.forEach((item) => {
    const projectName = item.dataset.projectName
      ? item.dataset.projectName.toLowerCase()
      : "";
    const projectDate = item.dataset.projectDate || "";

    // --- Filtering Logic ---
    // 1. Name Match
    const nameMatch = projectName.includes(searchTerm);

    // 2. Date Match
    let dateMatch = false;
    if (selectedDate === "all") {
      dateMatch = true;
    } else if (projectDate) {
      const projectYear = projectDate.substring(0, 4);
      if (projectYear === selectedDate) {
        dateMatch = true;
      }
    }

    // --- Show/Hide Item ---
    if (nameMatch && dateMatch) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

function renderProjectCards() {
  const grid = document.querySelector(".project-grid");
  if (!grid) return;

  grid.innerHTML = projects
    .map(
      (project) => `
	<div class="project-item" data-project-name="${project.title}" data-project-date="${project.date}">
		<a id="project-${project.slug}">
			<img src="${project.thumbnail}" alt="${project.title} Thumbnail" />
			<h3>${project.title}</h3>
			<p>${project.summary}</p>
		</a>
	</div>
	`,
    )
    .join("");

  setupProjectLinks();
  projectItems = projectGrid
    ? Array.from(projectGrid.querySelectorAll(".project-item"))
    : [];
}

// --- Event Listeners ---
if (searchInput) {
  searchInput.addEventListener("input", filterProjects);
}
if (dateFilter) {
  dateFilter.addEventListener("change", filterProjects);
}

// --- Safety Check ---
if (projectItems.length === 0) {
  console.warn("No project items found for filtering.");
}
if (!searchInput) {
  console.warn("Search input #project-search not found.");
}
if (!dateFilter) {
  console.warn("Date filter #project-filter-date not found.");
}

renderProjectCards();
