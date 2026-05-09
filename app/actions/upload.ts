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

// ─── In-process flag so CORS is only set once per serverless instance ─────────
let corsConfigured = false;

async function ensureCors() {
  if (corsConfigured) return;
  try {
    const bucket = adminStorage.bucket();
    await bucket.setCorsConfiguration([
      {
        // GCS does not support port wildcards — list explicit dev ports
        origin: [
          "https://app.sendli.fr",
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3002",
          "http://localhost:3003",
        ],
        method: ["PUT", "POST", "GET", "HEAD", "DELETE"],
        responseHeader: [
          "Content-Type",
          "x-goog-meta-firebasestoragedownloadtokens",
          "x-goog-resumable",
          "Authorization",
        ],
        maxAgeSeconds: 3600,
      },
    ]);
    corsConfigured = true;
    console.log("[ensureCors] ✓ CORS configured on bucket");
  } catch (err) {
    // Non-fatal: log and continue; the upload may still work if CORS was
    // previously configured via gcloud / Firebase console.
    console.warn("[ensureCors] Could not set CORS:", (err as Error).message);
  }
}

/**
 * Step 1 — Request a direct-upload slot for a large file (up to 15 MB).
 *
 * The browser uploads the file directly to Firebase Storage via a signed PUT
 * URL, completely bypassing the Vercel serverless function size limit.
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
    // Ensure bucket accepts browser PUT requests (idempotent, cached per instance)
    await ensureCors();

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
        "x-goog-meta-firebasestoragedownloadtokens": token,
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
 * Step 2 — After the browser PUT, ensure the download token is in metadata.
 * This is a belt-and-suspenders call; the signed-URL extension header should
 * have already stored it during the upload.
 */
export async function finalizeUpload(filePath: string, token: string): Promise<void> {
  try {
    const bucket = adminStorage.bucket();
    await bucket.file(filePath).setMetadata({
      metadata: { firebaseStorageDownloadTokens: token },
    });
    console.log("[finalizeUpload] ✓", filePath);
  } catch (err) {
    console.warn("[finalizeUpload] ✗", (err as Error).message);
  }
}

/**
 * Delete a file from Firebase Storage given its public download URL.
 * Supports both firebasestorage.googleapis.com/v0/b/… and storage.googleapis.com/… formats.
 * Silently no-ops if the URL is not a Firebase Storage URL.
 */
export async function deleteStorageFile(url: string): Promise<void> {
  if (!url) return;

  try {
    let filePath: string | null = null;

    // Format 1: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?…
    const fbMatch = url.match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
    if (fbMatch) {
      filePath = decodeURIComponent(fbMatch[1]);
    }

    // Format 2: https://storage.googleapis.com/{bucket}/{path}?…  (signed URLs)
    if (!filePath) {
      const gcsMatch = url.match(/storage\.googleapis\.com\/[^/]+\/(.+?)(\?|$)/);
      if (gcsMatch) filePath = decodeURIComponent(gcsMatch[1]);
    }

    if (!filePath) return; // not a known Storage URL

    const bucket = adminStorage.bucket();
    await bucket.file(filePath).delete({ ignoreNotFound: true });
    console.log("[deleteStorageFile] ✓", filePath);
  } catch (err) {
    // Non-fatal — log and continue
    console.warn("[deleteStorageFile] ✗", (err as Error).message);
  }
}
