/* global chrome */

const APP_URL = "https://app.sendli.fr";
const ALARM   = "sendli-poll";

// ── Setup ─────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: 2 });
  poll();
});

chrome.alarms.onAlarm.addListener(({ name }) => {
  if (name === ALARM) poll();
});

// ── Poll ──────────────────────────────────────────────────────────────────────

async function poll() {
  const { token } = await chrome.storage.local.get(["token"]);
  if (!token) { setBadge(0); return; }

  try {
    const res = await fetch(`${APP_URL}/api/extension`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setBadge(0); return; }
    const { unreadCount } = await res.json();
    setBadge(unreadCount || 0);
  } catch {
    setBadge(0);
  }
}

function setBadge(count) {
  const text = count > 0 ? (count > 99 ? "99+" : String(count)) : "";
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: "#111184" });
}
