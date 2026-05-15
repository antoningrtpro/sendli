/* global chrome */

const DEFAULT_APP_URL = "https://app.sendli.fr";

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  token: null,
  appUrl: DEFAULT_APP_URL,
  notifications: [],
  currentTab: "unread",
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const screens = {
  setup: $("screen-setup"),
  main: $("screen-main"),
  settings: $("screen-settings"),
};

// ── Utility ────────────────────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function showToast(msg) {
  let bar = document.querySelector(".toast-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "toast-bar";
    document.body.appendChild(bar);
  }
  bar.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), 2200);
}

function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function notifIcon(type) {
  const icons = {
    page_view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    cta_click: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>`,
    time_on_page: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  };
  const classes = { page_view: "view", cta_click: "cta", time_on_page: "time" };
  return `<div class="notif-icon ${classes[type] || "view"}">${icons[type] || icons.page_view}</div>`;
}

function notifLabel(n) {
  const who = n.visitorName || n.visitorEmail || "Un visiteur";
  if (n.type === "page_view") return `${who} a ouvert votre propale`;
  if (n.type === "cta_click") {
    const block = n.blockLabel ? ` « ${n.blockLabel} »` : "";
    return `${who} a cliqué sur${block}`;
  }
  if (n.type === "time_on_page") {
    const secs = n.durationSeconds ?? 0;
    const mins = Math.round(secs / 60);
    return `${who} a passé ${mins} min sur votre propale`;
  }
  return "Nouvelle activité";
}

// ── Render notifications ───────────────────────────────────────────────────
function renderList() {
  const list = $("notif-list");
  const filtered = state.notifications.filter((n) =>
    state.currentTab === "unread" ? !n.read : n.read
  );

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <p>${state.currentTab === "unread" ? "Aucune notification non lue" : "Aucune notification lue"}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered
    .map(
      (n) => `
      <div class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}" data-proposal="${n.proposalId}">
        ${notifIcon(n.type)}
        <div class="notif-body">
          <div class="notif-text">${notifLabel(n)}</div>
          <div class="notif-proposal">📄 ${n.proposalTitle}</div>
        </div>
        <div class="notif-meta">
          <span class="notif-time">${timeAgo(n.createdAt)}</span>
          ${!n.read ? '<span class="notif-dot"></span>' : ""}
        </div>
      </div>`
    )
    .join("");

  // Attach click handlers
  list.querySelectorAll(".notif-item").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      const proposalId = el.dataset.proposal;
      openNotification(id, proposalId);
    });
  });
}

function updateBadge() {
  const unread = state.notifications.filter((n) => !n.read).length;
  const badge = $("badge-unread");
  if (unread > 0) {
    badge.textContent = unread;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
  chrome.action.setBadgeText({ text: unread > 0 ? String(unread) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" });
}

// ── API calls ──────────────────────────────────────────────────────────────
async function fetchNotifications() {
  if (!state.token) return;
  try {
    const res = await fetch(`${state.appUrl}/api/extension`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    if (!res.ok) throw new Error("Unauthorized");
    const data = await res.json();
    state.notifications = data.notifications || [];
    renderList();
    updateBadge();
  } catch {
    $("notif-list").innerHTML = `
      <div class="empty-state">
        <p>Impossible de charger les notifications.<br/>Vérifiez votre connexion ou votre token.</p>
      </div>`;
  }
}

async function markRead(notificationId) {
  if (!state.token) return;
  await fetch(`${state.appUrl}/api/extension`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ notificationId }),
  });
  // Update local state
  const n = state.notifications.find((x) => x.id === notificationId);
  if (n) n.read = true;
  renderList();
  updateBadge();
}

async function markAllRead() {
  if (!state.token) return;
  await fetch(`${state.appUrl}/api/extension`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ all: true }),
  });
  state.notifications.forEach((n) => (n.read = true));
  renderList();
  updateBadge();
  showToast("Tout marqué comme lu");
}

function openNotification(notificationId, proposalId) {
  chrome.tabs.create({
    url: `${state.appUrl}/proposals/${proposalId}/analytics`,
  });
  markRead(notificationId);
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get(["token", "appUrl"]);
  state.token = stored.token || null;
  state.appUrl = stored.appUrl || DEFAULT_APP_URL;

  if (!state.token) {
    showScreen("setup");
    $("setup-url").value = state.appUrl;
    return;
  }

  showScreen("main");
  fetchNotifications();
}

// ── Setup screen events ────────────────────────────────────────────────────
$("link-settings").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: (state.appUrl || DEFAULT_APP_URL) + "/settings" });
});

$("btn-connect").addEventListener("click", async () => {
  const token = $("setup-token").value.trim();
  const url = $("setup-url").value.trim() || DEFAULT_APP_URL;
  if (!token) {
    showToast("Veuillez saisir votre token");
    return;
  }
  state.token = token;
  state.appUrl = url.replace(/\/$/, "");
  await chrome.storage.local.set({ token: state.token, appUrl: state.appUrl });
  showScreen("main");
  fetchNotifications();
});

// ── Tab events ─────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    state.currentTab = btn.dataset.tab;
    renderList();
  });
});

// ── Action buttons ─────────────────────────────────────────────────────────
$("btn-new-proposal").addEventListener("click", () => {
  chrome.tabs.create({ url: state.appUrl + "/proposals" });
});

$("btn-mark-all").addEventListener("click", markAllRead);

// ── Settings overlay ───────────────────────────────────────────────────────
$("btn-settings-open").addEventListener("click", () => {
  $("settings-token").value = state.token || "";
  $("settings-url").value = state.appUrl || DEFAULT_APP_URL;
  showScreen("settings");
});

$("btn-settings-back").addEventListener("click", () => {
  showScreen("main");
});

$("btn-settings-save").addEventListener("click", async () => {
  const token = $("settings-token").value.trim();
  const url = $("settings-url").value.trim() || DEFAULT_APP_URL;
  state.token = token || null;
  state.appUrl = url.replace(/\/$/, "");
  await chrome.storage.local.set({ token: state.token, appUrl: state.appUrl });
  showToast("Paramètres enregistrés");
  showScreen("main");
  fetchNotifications();
});

$("btn-disconnect").addEventListener("click", async () => {
  state.token = null;
  state.notifications = [];
  await chrome.storage.local.remove(["token"]);
  showScreen("setup");
  $("setup-url").value = state.appUrl;
  chrome.action.setBadgeText({ text: "" });
});

// ── Boot ───────────────────────────────────────────────────────────────────
init();
