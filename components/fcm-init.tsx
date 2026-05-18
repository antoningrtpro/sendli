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
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js",
          { scope: "/" }
        );

        // Force update so stale SW is replaced immediately
        await registration.update();

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

        // Foreground handler — show as toast when app is open
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? "sendli";
          const body  = payload.notification?.body  ?? "";
          const url   = (payload.data?.url as string) ?? "/dashboard";

          toast(
            (t) => (
              <button
                onClick={() => { window.location.href = url; toast.dismiss(t.id); }}
                className="flex flex-col gap-0.5 text-left"
              >
                <span className="font-semibold text-sm">{title}</span>
                {body && <span className="text-xs text-gray-300">{body}</span>}
              </button>
            ),
            { duration: 6000, icon: "🔔" }
          );
        });
      } catch {
        // FCM init errors are non-critical — fail silently
      }
    }

    init();
  }, []);

  return null;
}
