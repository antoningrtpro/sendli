/* global chrome */

const APP_URL = "https://app.sendli.fr";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)  return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function notifLabel(n) {
  const who = n.visitorName || n.visitorEmail || "Quelqu'un";
  if (n.type === "page_view")    return `<strong>${who}</strong> a ouvert votre propale`;
  if (n.type === "cta_click") {
    const what = n.blockLabel ? `"${n.blockLabel}"` : "un bouton";
    return `<strong>${who}</strong> a cliqué sur ${what}`;
  }
  if (n.type === "time_on_page") {
    const min = n.durationSeconds ? Math.round(n.durationSeconds / 60) : "?";
    return `<strong>${who}</strong> a passé ${min} min sur votre propale`;
  }
  if (n.type === "comment") {
    const preview = n.commentContent ? ` : "${n.commentContent.slice(0, 50)}${n.commentContent.length > 50 ? "…" : ""}"` : "";
    return `<strong>${who}</strong> a laissé un commentaire${preview}`;
  }
  if (n.type === "premium_request") {
    const who2 = n.requestUserName || n.requestUserEmail || "Un utilisateur";
    return `<strong>${who2}</strong> demande un accès Premium`;
  }
  if (n.type === "premium_approved") {
    return "Votre accès Premium a été activé !";
  }
  if (n.type === "feedback_received") {
    const title = n.proposalTitle ? ` sur <strong>${n.proposalTitle}</strong>` : "";
    return `Nouveau feedback reçu${title}`;
  }
  return "Nouvelle notification";
}

/** Returns true for notification types that have no associated proposal link */
function hasNoProposalLink(n) {
  return n.type === "premium_request" || n.type === "premium_approved" || !n.proposalId || !n.proposalTitle;
}

const ICON_SVG = {
  page_view:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  cta_click:        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  time_on_page:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  comment:          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  premium_request:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  premium_approved: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  feedback_received: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`,
};
const ICON_COLOR = {
  page_view: "blue", cta_click: "green", time_on_page: "amber",
  comment: "purple", premium_request: "gold", premium_approved: "green",
  feedback_received: "indigo",
};

const BELL_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

// ── State ────────────────────────────────────────────────────────────────────

let allNotifs = [];
let currentTab = "unread";
let currentToken = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────

const screenSetup    = document.getElementById("screen-setup");
const screenMain     = document.getElementById("screen-main");
const screenSettings = document.getElementById("screen-settings");
const notifList      = document.getElementById("notif-list");
const badgeUnread    = document.getElementById("badge-unread");

// ── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(["token"], ({ token }) => {
  if (token) {
    currentToken = token;
    showMain();
    loadNotifications();
  } else {
    showSetup();
  }
});

function showSetup()    { screenSetup.classList.remove("hidden"); screenMain.classList.add("hidden"); screenSettings.classList.add("hidden"); }
function showMain()     { screenMain.classList.remove("hidden"); screenSetup.classList.add("hidden"); screenSettings.classList.add("hidden"); }
function showSettings() { screenSettings.classList.remove("hidden"); screenMain.classList.add("hidden"); screenSetup.classList.add("hidden"); }

// ── Load notifications ────────────────────────────────────────────────────────

async function loadNotifications() {
  try {
    const res = await fetch(`${APP_URL}/api/extension`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!res.ok) { if (res.status === 401) { showSetup(); return; } throw new Error(); }
    const data = await res.json();
    allNotifs = data.notifications || [];
    renderList();
    // Mark all as read immediately. keepalive ensures the request survives
    // popup close (Chrome destroys the extension page before fetch completes).
    if (allNotifs.some(n => !n.read)) {
      allNotifs.forEach(n => { n.read = true; });
      renderList();
      fetch(`${APP_URL}/api/extension`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    notifList.innerHTML = `<div class="state-empty"><p>Impossible de charger les notifications.<br>Vérifiez votre connexion.</p></div>`;
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderList() {
  const filtered = allNotifs.filter(n => currentTab === "unread" ? !n.read : n.read);
  const unreadCount = allNotifs.filter(n => !n.read).length;

  // Badge tab
  if (unreadCount > 0) {
    badgeUnread.textContent = unreadCount > 99 ? "99+" : unreadCount;
    badgeUnread.classList.remove("hidden");
  } else {
    badgeUnread.classList.add("hidden");
  }

  if (filtered.length === 0) {
    notifList.innerHTML = `
      <div class="state-empty">
        ${BELL_SVG}
        <p>${currentTab === "unread" ? "Aucune notification non lue" : "Aucune notification lue"}</p>
      </div>`;
    return;
  }

  notifList.innerHTML = filtered.map(n => {
    const color  = ICON_COLOR[n.type] || "blue";
    const icon   = ICON_SVG[n.type]  || ICON_SVG.page_view;
    const time   = timeAgo(n.createdAt);
    const label  = notifLabel(n);
    const unread = !n.read;

    const proposalLink = !hasNoProposalLink(n) ? `
      <a class="notif-proposal" href="${APP_URL}/proposals/${n.proposalId}/analytics" target="_blank">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><path d="M10 14 21 3"/><path d="M21 13v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8"/></svg>
        <span class="notif-proposal-text">${n.proposalTitle}</span>
      </a>` : "";

    return `
      <div class="notif-item ${unread ? "unread" : ""}" data-id="${n.id}" data-proposal="${n.proposalId || ""}">
        <div class="notif-icon ${color}">${icon}</div>
        <div class="notif-body">
          <p class="notif-text">${label}</p>
          ${proposalLink}
          <span class="notif-time">${time}</span>
        </div>
      </div>`;
  }).join("");

  // Auto-shrink proposal name font-size to fit on one line (for non-premium types)
  notifList.querySelectorAll(".notif-proposal").forEach(link => {
    const span = link.querySelector(".notif-proposal-text");
    if (!span) return;
    let size = 11;
    span.style.fontSize = size + "px";
    while (link.scrollWidth > link.clientWidth + 1 && size > 8) {
      size -= 0.5;
      span.style.fontSize = size + "px";
    }
  });

  // Click to mark as read
  notifList.querySelectorAll(".notif-item.unread").forEach(el => {
    el.addEventListener("click", async (e) => {
      if (e.target.closest("a")) return; // let link open normally
      const id = el.dataset.id;
      markRead(id);
    });
  });

  // Link clicks: mark read + open
  notifList.querySelectorAll(".notif-proposal").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const item = link.closest(".notif-item");
      if (item) markRead(item.dataset.id);
      chrome.tabs.create({ url: link.href });
    });
  });
}

async function markRead(id) {
  const n = allNotifs.find(x => x.id === id);
  if (!n || n.read) return;
  n.read = true;
  renderList();
  await fetch(`${APP_URL}/api/extension`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ notificationId: id }),
    keepalive: true, // survives popup close (e.g. when a tab is opened)
  });
}

async function markAllRead() {
  allNotifs.forEach(n => { n.read = true; });
  renderList();
  await fetch(`${APP_URL}/api/extension`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".tab[data-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.tab;
    document.querySelectorAll(".tab[data-tab]").forEach(t => t.classList.remove("active"));
    btn.classList.add("active");
    renderList();
  });
});

// ── Buttons ───────────────────────────────────────────────────────────────────

document.getElementById("btn-connect").addEventListener("click", () => {
  const token = document.getElementById("setup-token").value.trim();
  if (!token) return;
  chrome.storage.local.set({ token }, () => {
    currentToken = token;
    showMain();
    loadNotifications();
  });
});

document.getElementById("setup-token").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-connect").click();
});

document.getElementById("link-settings").addEventListener("click", e => {
  e.preventDefault();
  chrome.tabs.create({ url: `${APP_URL}/settings` });
});

document.getElementById("btn-new-proposal").addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_URL}/proposals` });
});

document.getElementById("btn-mark-all").addEventListener("click", markAllRead);

// Settings open/back/save/disconnect
document.getElementById("btn-settings-open").addEventListener("click", () => {
  document.getElementById("settings-token").value = currentToken || "";
  showSettings();
});
document.getElementById("btn-settings-back").addEventListener("click", showMain);

document.getElementById("btn-settings-save").addEventListener("click", () => {
  const token = document.getElementById("settings-token").value.trim();
  if (!token) return;
  chrome.storage.local.set({ token }, () => {
    currentToken = token;
    showMain();
    loadNotifications();
  });
});

document.getElementById("btn-disconnect").addEventListener("click", () => {
  chrome.storage.local.remove(["token"], () => {
    currentToken = null;
    allNotifs = [];
    showSetup();
  });
});
