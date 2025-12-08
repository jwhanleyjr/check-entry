"use client";
import { useState } from "react";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/process-check", { method: "POST", body: fd });
    const data = await res.json();
    sessionStorage.setItem("reviewPayload", JSON.stringify(data));
    window.location.href = "/review";
  }

  return (
    <main className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Upload Check</h1>
      <form onSubmit={go}>
        <input
          type="file"
          accept="image/*"
          onChange={(e)=>{ const f=e.target.files?.[0]||null; setFile(f); if(f) setPreview(URL.createObjectURL(f)); }}
        />
        {preview && <img src={preview} className="mt-3 rounded" />}
        <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Process</button>
      </form>
    </main>
  );
}
