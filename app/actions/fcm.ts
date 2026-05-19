"use server";

import { getSession } from "@/lib/session";
import { adminDb, adminMessaging } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { PushPayload } from "@/lib/fcm-payload";
import { isPremium } from "@/lib/plan";

// ── Token management ──────────────────────────────────────────────────────────

/** Save an FCM token for the current user (called from the client on permission grant). */
export async function saveFcmToken(token: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;
  // set+merge instead of update() — works even if the document doesn't have fcmTokens yet
  await adminDb.collection("users").doc(session.user.id).set(
    { fcmTokens: FieldValue.arrayUnion(token) },
    { merge: true }
  );
}

/** Remove a stale FCM token (called when FCM reports it as invalid). */
export async function removeFcmToken(token: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;
  await adminDb.collection("users").doc(session.user.id).update({
    fcmTokens: FieldValue.arrayRemove(token),
  });
}

// ── Send helper ───────────────────────────────────────────────────────────────

/**
 * Send a push notification to all FCM tokens registered for a user.
 * Silently removes any stale/invalid tokens.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const userSnap = await adminDb.collection("users").doc(userId).get();

  // Push notifications are a premium feature only
  if (!isPremium((userSnap.data()?.plan as string) ?? "free")) return;

  const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return;

  const staleTokens: string[] = [];

  await Promise.allSettled(
    tokens.map(async (token) => {
      try {
        await adminMessaging!.send({
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          webpush: {
            // No fcmOptions.link — keeping it absent lets the SW's
            // onBackgroundMessage handler run and call showNotification().
            // When fcmOptions.link is set, Firebase handles display itself
            // and bypasses onBackgroundMessage entirely.
            notification: {
              icon: "/favicon.png",
            },
          },
          data: {
            url: payload.url ?? "/dashboard",
            notifId: payload.notifId ?? "",
          },
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokens.push(token);
        } else {
          console.error("[FCM] send error:", code, err);
        }
      }
    })
  );

  if (staleTokens.length > 0) {
    await adminDb.collection("users").doc(userId).update({
      fcmTokens: FieldValue.arrayRemove(...staleTokens),
    });
  }
}
