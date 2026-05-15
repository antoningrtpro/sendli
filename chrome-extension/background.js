/* global chrome */

const DEFAULT_APP_URL = "https://app.sendli.fr";
const ALARM_NAME = "sendli-poll";
const POLL_INTERVAL_MINUTES = 2;

// ── Install / update ───────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: POLL_INTERVAL_MINUTES,
    periodInMinutes: POLL_INTERVAL_MINUTES,
  });
});

// ── Poll on alarm ──────────────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  await poll();
});

async function poll() {
  const stored = await chrome.storage.local.get(["token", "appUrl"]);
  const token = stored.token;
  const appUrl = (stored.appUrl || DEFAULT_APP_URL).replace(/\/$/, "");

  if (!token) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  try {
    const res = await fetch(`${appUrl}/api/extension`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      await chrome.action.setBadgeText({ text: "" });
      return;
    }

    const data = await res.json();
    const unreadCount = data.unreadCount ?? 0;

    await chrome.action.setBadgeText({ text: unreadCount > 0 ? String(unreadCount) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#4f46e5" });

    // Show a Chrome notification if there are new unread items
    const prevCount = (await chrome.storage.local.get("lastUnreadCount")).lastUnreadCount ?? 0;
    if (unreadCount > prevCount && unreadCount > 0) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: "Sendli",
        message: `Vous avez ${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`,
      });
    }

    await chrome.storage.local.set({ lastUnreadCount: unreadCount });
  } catch {
    // Silently fail — network may be unavailable
  }
}

// ── Notification click → open app ──────────────────────────────────────────
chrome.notifications.onClicked.addListener(async () => {
  const stored = await chrome.storage.local.get("appUrl");
  const appUrl = (stored.appUrl || DEFAULT_APP_URL).replace(/\/$/, "");
  chrome.tabs.create({ url: appUrl });
});
