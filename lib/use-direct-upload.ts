"use client";

import { useState } from "react";
import { requestDirectUpload, finalizeUpload } from "@/app/actions/upload";
import toast from "react-hot-toast";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Hook for uploading files directly from the browser to Firebase Storage,
 * bypassing the Vercel serverless function size limit entirely.
 *
 * Usage:
 *   const { uploading, uploadFile } = useDirectUpload();
 *   const url = await uploadFile(file, "documents");
 */
export function useDirectUpload() {
  const [uploading, setUploading] = useState(false);

  async function uploadFile(
    file: File,
    folder: "banners" | "logos" | "documents",
  ): Promise<string | null> {
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Fichier trop volumineux — limite 15 Mo");
      return null;
    }

    setUploading(true);
    try {
      // 1. Ask the server for a signed PUT URL + pre-computed download URL
      const slot = await requestDirectUpload(file.name, file.type, folder);
      if ("error" in slot) {
        toast.error("Impossible d'initier l'upload : " + slot.error);
        return null;
      }

      // 2. PUT the file directly to Firebase Storage (no Vercel in the path)
      const res = await fetch(slot.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          // Set the Firebase download token so the file is publicly readable
          "x-goog-meta-firebasestorageDOwNloadtokens": slot.token,
        },
        body: file,
      });

      if (!res.ok) {
        toast.error(`Upload échoué (${res.status})`);
        return null;
      }

      // 3. Ensure the token is stored as metadata (belt-and-suspenders)
      await finalizeUpload(slot.filePath, slot.token);

      return slot.downloadUrl;
    } catch (err) {
      toast.error("Erreur upload : " + (err as Error).message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { uploading, uploadFile };
}
