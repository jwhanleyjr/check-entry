import OpenAI from "openai";

import {
  searchBloomerangConstituents,
  type BloomerangQueryAttempt,
} from "./bloomerang";

export type RawCheckFields = {
  date?: string;
  amountNumeric?: string;
  amountWritten?: string;
  payor?: string;
  payee?: string;
  memo?: string;
  routingNumber?: string;
  accountNumber?: string;
  checkNumber?: string;
};

export type CheckFields = {
  date?: string;
  checkNumber?: string;
  amount?: string;
  donorName?: string;
  payee?: string;
  memo?: string;
};

export type DonorCandidate = {
  id: string;
  name: string;
};

export type DonorSearchAttempt = {
  query: string;
  resultCount: number;
  error?: string;
  apiBaseUrl?: string;
  apiKeyPresent?: boolean;
  queryAttempts?: BloomerangQueryAttempt[];
};

export type ProcessCheckPayload = {
  fields: CheckFields;
  candidates: DonorCandidate[];
  searchLog: DonorSearchAttempt[];
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const KNOWN_PAYEE = "three trees";

const HONORIFICS = [
  "mr",
  "mrs",
  "ms",
  "dr",
  "miss",
  "sir",
  "madam",
  "rev",
  "mister",
  "madame",
  "mr and mrs",
  "mr & mrs",
  "mr/mrs",
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isKnownPayeeName(value: string | undefined) {
  if (!value) return false;
  const cleaned = normalizeWhitespace(value).replace(/[^a-zA-Z\s'-]/g, "").toLowerCase();
  return cleaned === KNOWN_PAYEE;
}

function stripHonorifics(value: string) {
  const lowered = value.toLowerCase();
  const matchedHonorific = HONORIFICS.find((h) => lowered.startsWith(`${h} `));
  if (matchedHonorific) {
    return normalizeWhitespace(value.slice(matchedHonorific.length));
  }
  return normalizeWhitespace(value);
}

function extractNameWords(value: string) {
  const words = value.match(/[a-zA-Z][a-zA-Z'-]*/g);
  return words ? words.join(" ") : "";
}

function attachSharedLastName(parts: string[]) {
  if (parts.length !== 2) return parts;

  const [first, second] = parts;
  if (!second.includes(" ")) {
    const lastName = first.split(" ").at(-1) ?? "";
    if (lastName && second.toLowerCase() !== lastName.toLowerCase()) {
      return [first, `${second} ${lastName}`];
    }
  }

  return parts;
}

export function extractPayorNames(payorText: string): string[] {
  const cleaned = payorText
    .replace(/[:,]/g, " ")
    .replace(/\b(payor|payer|from|by|for)\b/gi, " ")
    .replace(/&amp;/gi, "&");

  const segments = cleaned
    .split(/\b(?:and|&|\+|\/)\b/i)
    .map(stripHonorifics)
    .map(extractNameWords)
    .map(normalizeWhitespace)
    .filter(Boolean);

  if (!segments.length) return [];

  const limitedSegments = segments.slice(0, 2); // single name or husband & wife
  return attachSharedLastName(limitedSegments);
}

function normalizeFieldMap(raw: Record<string, unknown>): RawCheckFields {
  const normalized: RawCheckFields = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (typeof value === "string") {
      const cleaned = normalizeWhitespace(value);
      if (cleaned) (normalized as Record<string, string>)[key] = cleaned;
    }
  }
  return normalized;
}

function resolvePayorCandidates(rawPayorNames: unknown, payorField?: string) {
  const explicitNames = Array.isArray(rawPayorNames)
    ? rawPayorNames
        .filter((v): v is string => typeof v === "string")
        .flatMap(extractPayorNames)
    : [];

  const sanitizedPayorField = payorField && !isKnownPayeeName(payorField)
    ? payorField
    : undefined;

  const inferredNames = sanitizedPayorField ? extractPayorNames(sanitizedPayorField) : [];
  const combined = [...explicitNames, ...inferredNames];

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const name of combined) {
    if (isKnownPayeeName(name)) continue;
    const normalized = name.toLowerCase();
    if (!seen.has(normalized) && name.trim()) {
      seen.add(normalized);
      deduped.push(normalizeWhitespace(name));
    }
  }

  return deduped.slice(0, 2);
}

function buildReviewFields(raw: RawCheckFields): CheckFields {
  const cleaned: CheckFields = {};

  if (raw.date) cleaned.date = raw.date;
  if (raw.checkNumber) cleaned.checkNumber = raw.checkNumber;
  if (raw.payee) cleaned.payee = raw.payee;
  const payor = raw.payor && !isKnownPayeeName(raw.payor) ? raw.payor : undefined;
  if (payor) {
    cleaned.donorName = payor;
  }
  if (raw.memo) cleaned.memo = raw.memo;

  const amount = raw.amountNumeric ?? raw.amountWritten;
  if (amount) cleaned.amount = amount;

  return cleaned;
}

async function fetchDonorCandidates(payorNames: string[]) {
  const searchLog: DonorSearchAttempt[] = [];

  const bloomerangMatches = (
    await Promise.all(
      payorNames.map(async (name) => {
        if (!name.trim()) {
          searchLog.push({ query: name, resultCount: 0, error: "Empty name skipped" });
          return [];
        }

        try {
          const { matches, attempts, apiBaseUrl, apiKeyPresent } =
            await searchBloomerangConstituents(name);
          searchLog.push({
            query: name,
            resultCount: matches.length,
            apiBaseUrl,
            apiKeyPresent,
            queryAttempts: attempts,
          });
          return matches;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          searchLog.push({ query: name, resultCount: 0, error: message });
          return [];
        }
      }),
    )
  )
    .flat()
    .filter(Boolean);

  const seen = new Set<string>();
  const combined: DonorCandidate[] = [];

  for (const candidate of bloomerangMatches) {
    if (candidate.id && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      combined.push(candidate);
    }
  }

  return { candidates: combined, searchLog };
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function analyzeCheckImage(
  file: File,
  { model = DEFAULT_MODEL } = {}
): Promise<ProcessCheckPayload> {
  const imageDataUrl = await fileToDataUrl(file);
  const client = new OpenAI();

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an assistant that extracts bank check details. Return JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Read the check image and return {\"fields\":{...},\"payorNames\":[...]} where fields may include date (YYYY-MM-DD), amountNumeric, amountWritten, payor, memo, and checkNumber. The payee on every check is Three Trees; do not list the payee as the payor. Payor is the person or people writing the check. If you cannot confidently read the payor name, leave it blank. Leave out unknown keys.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const messageContent = completion.choices[0]?.message?.content ?? "{}";

  let parsed: any = {};
  try {
    parsed = JSON.parse(messageContent);
  } catch (error) {
    parsed = {};
  }

  const rawFields = normalizeFieldMap(parsed.fields ?? parsed ?? {});
  const payorNames = resolvePayorCandidates(parsed.payorNames, rawFields.payor);
  const { candidates, searchLog } = await fetchDonorCandidates(payorNames);

  const fields = buildReviewFields(rawFields);

  if (!fields.donorName && payorNames.length) {
    fields.donorName = payorNames[0];
  }

  return {
    fields,
    candidates,
    searchLog,
  };
}
