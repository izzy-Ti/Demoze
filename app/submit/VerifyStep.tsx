"use client";

import { useId, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "application/pdf"];

/**
 * Re-encodes photos in the browser before upload: smaller (fast on slow
 * connections) and strips EXIF metadata such as GPS location.
 */
async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

type Result = { verified: boolean; message: string } | null;

export function VerifyStep({ submissionId, t, onDone }: { submissionId: string; t: Dictionary["verify"]; onDone: () => void }) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [result, setResult] = useState<Result>(null);

  function pick(f: File | undefined | null) {
    setError(null);
    if (!f) return setFile(null);
    if (!TYPES.includes(f.type)) return setError(t.badType);
    if (f.size > MAX_BYTES) return setError(t.tooBig);
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const blob = await prepareImage(file);
      const body = new FormData();
      body.set("submissionId", submissionId);
      body.set("file", blob, blob === file ? file.name : "upload.jpg");
      const res = await fetch("/api/verify", { method: "POST", body });
      setResult(((await res.json().catch(() => null)) as Result) ?? { verified: false, message: t.unavailable });
    } catch {
      setResult({ verified: false, message: t.unavailable });
    } finally {
      setFile(null);
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="card card-pad enter text-center">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${result.verified ? "bg-accent text-white" : "bg-bg-muted text-fg-muted"}`} aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-7 w-7 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
            {result.verified ? <path d="m5 10.5 3.5 3.5L15 7" /> : <path d="M10 6v5M10 14h.01" />}
          </svg>
        </span>
        <p role="status" className="mx-auto mt-5 max-w-sm font-medium">{result.message}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">{t.deleted}</p>
        <button type="button" onClick={onDone} className="btn-primary mt-7">{t.continue} →</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <ul className="space-y-2 text-sm text-fg-muted">
        <li className="flex gap-2"><span aria-hidden="true" className="text-fg-subtle">—</span>{t.mustShow}</li>
        <li className="flex gap-2"><span aria-hidden="true" className="text-fg-subtle">—</span>{t.hideNote}</li>
      </ul>

      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:border-accent ${
          drag ? "border-accent bg-accent-soft" : "border-border-strong bg-bg-subtle hover:border-fg-subtle"
        }`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-none stroke-fg-subtle stroke-[1.5]" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <span className="font-medium">{file ? file.name : t.fileLabel}</span>
        <span className="text-sm text-fg-muted">{t.fileTypes}</span>
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => pick(e.target.files?.[0])}
          className="sr-only"
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </label>
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}

      {busy && (
        <div role="status" className="space-y-2">
          <div className="h-1 overflow-hidden rounded-full bg-bg-muted" aria-hidden="true">
            <div className="h-full w-1/3 animate-[slide_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
          </div>
          <p className="text-sm text-fg-muted">{t.uploading}</p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <button type="button" onClick={onDone} disabled={busy} className="btn-ghost">{t.skip}</button>
        <button type="submit" disabled={busy || !file} className="btn-primary">{busy ? t.checking : t.upload}</button>
      </div>
    </form>
  );
}
