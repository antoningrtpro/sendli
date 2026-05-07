"use server";

import { getSession } from "@/lib/session";
import { adminStorage } from "@/lib/firebase-admin";

/**
 * Uploads a base64 data-URL image to Firebase Storage.
 * Returns a permanent public HTTPS URL (firebasestorage.googleapis.com).
 *
 * Requires Firebase Storage to be enabled in the Firebase Console:
 * https://console.firebase.google.com → Storage → Get Started
 */
export async function uploadImage(
  base64DataUrl: string,
  folder: "banners" | "logos",
  filename: string,
): Promise<{ url: string } | { error: string }> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Non authentifié" };

  // Parse   data:<mime>;base64,<data>
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { error: "Format d'image invalide" };

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  const ext = mimeType.split("/")[1] ?? "jpg";
  const filePath = `${folder}/${session.user.id}/${filename}.${ext}`;

  try {
    const { randomUUID } = await import("crypto");
    const token = randomUUID(); // permanent download token — works on UBLA buckets

    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
        metadata: {
          // Firebase Storage download token: makes the URL publicly accessible
          // without needing makePublic() (which fails on firebasestorage.app UBLA buckets)
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    const bucketName = bucket.name;
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("%2F");
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

    console.log("[uploadImage] ✓", url);
    return { url };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[uploadImage] ✗", msg);
    return { error: msg };
  }
}
