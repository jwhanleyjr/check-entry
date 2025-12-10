import { analyzeCheckImage } from "@/lib";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file upload" }, { status: 400 });
  }

  try {
    const payload = await analyzeCheckImage(file);
    return Response.json(payload);
  } catch (error) {
    console.error("process-check failure", error);
    return Response.json({ error: "Unable to process check" }, { status: 500 });
  }
}
