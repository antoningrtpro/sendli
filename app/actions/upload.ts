"use server";

import { getSession } from "@/lib/session";
import { adminStorage } from "@/lib/firebase-admin";

/**
 * Uploads a base64 data-URL image to Firebase Storage via a server action.
 * Used for small assets (logos, banners) where the canvas already resized the
 * image to ≤ 400 px, keeping the payload well under Vercel's 4.5 MB limit.
 */
export async function uploadImage(
  base64DataUrl: string,
  folder: "banners" | "logos" | "documents",
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
    const token = randomUUID();

    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
        metadata: { firebaseStorageDownloadTokens: token },
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

/**
 * Step 1 — Request a direct-upload slot for a large file (up to 15 MB).
 *
 * Returns a Firebase Storage signed PUT URL valid for 15 minutes. The
 * browser uploads the file directly to Firebase Storage, completely
 * bypassing the Vercel serverless function size limit (4.5 MB on Hobby).
 *
 * Also returns the pre-computed public download URL and the metadata
 * token that the client must set as the `x-goog-meta-firebasestorageDOwNloadtokens`
 * header during the PUT so that Firebase Storage exposes the file.
 */
export async function requestDirectUpload(
  originalName: string,
  mimeType: string,
  folder: "banners" | "logos" | "documents",
): Promise<{
  uploadUrl: string;
  downloadUrl: string;
  filePath: string;
  token: string;
} | { error: string }> {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Non authentifié" };

  try {
    const { randomUUID } = await import("crypto");
    const token = randomUUID();
    const ext = (originalName.split(".").pop() ?? "bin").toLowerCase();
    const filePath = `${folder}/${session.user.id}/${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    const [uploadUrl] = await file.getSignedUrl({
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: mimeType,
      extensionHeaders: {
        // Include the download token in the signed headers so Firebase
        // Storage stores it as custom metadata and the file becomes
        // accessible via the pre-computed download URL.
        "x-goog-meta-firebasestorageDOwNloadtokens": token,
      },
    });

    const bucketName = bucket.name;
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("%2F");
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

    console.log("[requestDirectUpload] ✓", filePath);
    return { uploadUrl, downloadUrl, filePath, token };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[requestDirectUpload] ✗", msg);
    return { error: msg };
  }
}

/**
 * Step 2 — After the browser PUT to the signed URL, call this to ensure
 * the Firebase Storage download token is properly stored in the file's
 * custom metadata (in case the signed-URL header didn't persist it).
 */
export async function finalizeUpload(filePath: string, token: string): Promise<void> {
  try {
    const bucket = adminStorage.bucket();
    await bucket.file(filePath).setMetadata({
      metadata: { firebaseStorageDownloadTokens: token },
    });
    console.log("[finalizeUpload] ✓", filePath);
  } catch (err) {
    // Non-fatal — the download URL still works if the header was set during PUT
    console.warn("[finalizeUpload] ✗", (err as Error).message);
  }
}
