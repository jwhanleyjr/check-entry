import OpenAI from "openai";
import { isProcessCheckPayload, processCheckResponseSchema, ProcessCheckPayload } from "@/lib";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing uploaded image" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "CheckExtraction",
          schema: processCheckResponseSchema,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You extract donation check details from an uploaded image. Return JSON matching the schema. " +
            "If a value is unclear, leave it as an empty string. Include donor candidates only when confidently inferred. " +
            "The payor is the person or organization writing the check, not the recipient (payee).",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Scan this check image and return the date (YYYY-MM-DD), numeric amount, and payor name (the check writer).",
            },
            { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
          ],
        },
      ],
    });

    const messageContent = completion.choices[0]?.message?.content;
    const parsed: ProcessCheckPayload | null = (() => {
      if (!messageContent || typeof messageContent !== "string") return null;
      try {
        const candidate = JSON.parse(messageContent) as unknown;
        return isProcessCheckPayload(candidate) ? candidate : null;
      } catch (error) {
        console.warn("process-check parse error", error);
        return null;
      }
    })();

    if (!parsed) {
      return Response.json({ error: "Unable to parse check details" }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (error) {
    console.error("process-check error", error);
    return Response.json({ error: "Failed to process check" }, { status: 500 });
  }
}
