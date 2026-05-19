"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "@/lib/firebase-client";
import { saveFcmToken } from "@/app/actions/fcm";
import toast from "react-hot-toast";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function FcmInit() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !VAPID_KEY) return;

    async function init() {
      try {
        // Register (or retrieve existing) service worker
        await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );

        // Wait for the SW to be fully active (handles skipWaiting + claim race)
        const registration = await navigator.serviceWorker.ready;

        // Request permission if not already decided
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") return;

        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        // Get FCM token and persist it server-side
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (token) await saveFcmToken(token);

        // Foreground handler — show in-app toast + system notification
        // Payload is data-only so read from payload.data (not payload.notification).
        onMessage(messaging, (payload) => {
          const title = (payload.data?.title as string) ?? "sendli";
          const body  = (payload.data?.body  as string) ?? "";
          const url   = (payload.data?.url   as string) ?? "/dashboard";

          // Also show a system (browser) notification via the service worker,
          // because FCM suppresses the SW notification when the app is in foreground
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon:     "/favicon.png",
              tag:      (payload.data?.notifId as string) || "sendli",
              data:     { url },
            } as NotificationOptions);
          }).catch(() => {});

          toast.custom(
            (t) => (
              <button
                onClick={() => { window.location.href = url; toast.dismiss(t.id); }}
                className={`flex items-center gap-3 w-full max-w-sm pr-4 pl-3 py-3 rounded-2xl border border-gray-100 bg-white shadow-lg transition-all duration-300 text-left ${t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--primary-light, #ede9fe)" }}>
                  <span className="text-base leading-none" style={{ color: "var(--primary)" }}>●</span>
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{title}</p>
                  {body && <p className="text-xs text-gray-500 truncate mt-0.5 leading-tight">{body}</p>}
                </div>
                {/* Dismiss */}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={e => { e.stopPropagation(); toast.dismiss(t.id); }}
                  className="ml-1 flex-shrink-0 text-gray-300 hover:text-gray-500 transition text-lg leading-none"
                >×</span>
              </button>
            ),
            { duration: 6000, position: "bottom-right" }
          );
        });
      } catch (e) {
        console.error("[FCM init]", e);
      }
    }

    init();
  }, []);

  return null;
}
