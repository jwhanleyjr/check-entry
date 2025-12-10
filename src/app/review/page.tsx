"use client";
import { isProcessCheckPayload, ProcessCheckPayload } from "@/lib";
import { useEffect, useState } from "react";

export default function Page() {
  const [data, setData] = useState<ProcessCheckPayload | null>(null);
  const [donorId, setDonorId] = useState("");

  useEffect(() => {
    const p = sessionStorage.getItem("reviewPayload");
    if (!p) return;

    try {
      const parsed = JSON.parse(p) as unknown;
      if (isProcessCheckPayload(parsed)) {
        setData(parsed);
        if (parsed.candidates.length) setDonorId(parsed.candidates[0].id);
      }
    } catch (error) {
      console.warn("Unable to load review payload", error);
    }
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.append("donorId", donorId);
    await fetch("/api/approve", { method: "POST", body: fd });
    alert("Submitted!");
  }

  if (!data) return <main className="p-6">No data</main>;

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Review</h1>
      <form onSubmit={submit} className="grid grid-cols-2 gap-4">
        {Object.entries(data.fields).map(([key, value]) => (
          <label key={key} className="block text-sm">
            {key}
            <input name={key} defaultValue={value} className="border p-2 w-full" />
          </label>
        ))}
        <label className="col-span-2 block">
          Donor
          <select value={donorId} onChange={(e) => setDonorId(e.target.value)} className="border p-2 w-full">
            {data.candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
            <option value="">(No match)</option>
          </select>
        </label>
        <button className="col-span-2 px-4 py-2 bg-green-600 text-white rounded">Submit</button>
      </form>
    </main>
  );
}

