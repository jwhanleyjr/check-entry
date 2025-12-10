"use client";
import { isProcessCheckPayload, ProcessCheckPayload } from "@/lib";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a check image to process.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    setIsLoading(true);
    try {
      const res = await fetch("/api/process-check", { method: "POST", body: fd });
      const body = await res.json();

      if (!res.ok) {
        setError(body?.error || "Unable to process the check right now.");
        return;
      }

      const payload: ProcessCheckPayload | null = isProcessCheckPayload(body) ? body : null;
      if (!payload) {
        setError("Received an unexpected response while processing the check.");
        return;
      }

      sessionStorage.setItem("reviewPayload", JSON.stringify(payload));
      window.location.href = "/review";
    } catch (err) {
      console.error("process-check request failed", err);
      setError("Something went wrong while processing the check.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Upload Check</h1>
      <form onSubmit={go} className="space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={(e)=>{ const f=e.target.files?.[0]||null; setFile(f); if(f) setPreview(URL.createObjectURL(f)); }}
        />
        {preview && <img src={preview} alt="Check preview" className="rounded" />}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Process"}
        </button>
      </form>
    </main>
  );
}
