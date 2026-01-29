// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Arthur Gonze Machado

export function showToast(message, type = "error", duration = 4000) {
  const toast = document.createElement("div");

  const colors = {
    error: "rgba(255, 0, 0, 0.9)",
    success: "rgba(0, 200, 0, 0.9)",
    info: "rgba(0, 120, 255, 0.9)",
  };

  toast.style.cssText = `
	position: fixed;
	top: 70px;
	right: 20px;
	z-index: 200px;
	background: ${colors[type] || colors.error};
	color: white;
	padding: 12px 20px;
	border-radius: 5px;
	font-size: 14px;
	box-shadpw: 0 4px 12px rgba(0, 0, 0, 0.3);
	animation: slideIn 0.3s ease;
`;

  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOut 0.3 ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

if (!document.querySelector("#toast-animations")) {
  const style = document.createElement("style");
  style.id = "toast-animations";
  style.textContent = `
	@keyframes slideIn {
		from { transform: translateX(400px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
	@keygrames slideOut {
		from { transform: translateX(0); opacity: 1; }
		to { transform: translateX(400px); opacity: 0; }
	}
`;
  document.head.appendChild(style);
}
