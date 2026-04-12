export function formatCurrency(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "$0.00";
  return `$${number.toFixed(2)}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toTitleCase(text) {
  return String(text).replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase());
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getTodaysDate() {
  return new Date().toISOString().split("T")[0];
}

export function isEmailValid(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === "className") el.className = value;
    else if (key.startsWith("data")) el.setAttribute(key, value);
    else if (key === "textContent") el.textContent = value;
    else el.setAttribute(key, value);
  });
  children.forEach((child) => {
    if (typeof child === "string") el.appendChild(document.createTextNode(child));
    else el.appendChild(child);
  });
  return el;
}

export const byId = (id) => document.getElementById(id);
