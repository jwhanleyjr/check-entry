"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [donorId, setDonorId] = useState("");

  useEffect(() => {
    const p = sessionStorage.getItem("reviewPayload");
    if (p) {
      const x = JSON.parse(p);
      setData(x);
      if (x.candidates?.length) setDonorId(x.candidates[0].id);
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
        {Object.entries<any>(data.fields)
          .filter(([key]) => key !== "routingNumber")
          .map(([k, v]) => (
          <label key={k} className="block text-sm">
            {k}
            <input name={k} defaultValue={String(v ?? "")} className="border p-2 w-full" />
          </label>
        ))}
        <label className="col-span-2 block">
          Donor
          <select value={donorId} onChange={e=>setDonorId(e.target.value)} className="border p-2 w-full">
            {data.candidates.map((c:any)=>(
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="">(No match)</option>
          </select>
        </label>
        <button className="col-span-2 px-4 py-2 bg-green-600 text-white rounded">Submit</button>
      </form>
    </main>
  );
}

