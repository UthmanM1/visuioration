"use client";

import { supabaseConfig } from "@/lib/supabase/config";

/**
 * Uploads a file to a Supabase Storage signed upload URL with progress events.
 * Same request shape as storage-js uploadToSignedUrl; XMLHttpRequest is used because fetch has no upload progress.
 */
export function uploadToSignedUrl(url: string, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("x-upsert", "false");
    if (supabaseConfig.publicKey) xhr.setRequestHeader("apikey", supabaseConfig.publicKey);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("The connection was interrupted during upload."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}
