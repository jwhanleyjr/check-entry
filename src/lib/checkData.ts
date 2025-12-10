export type CheckFields = {
  date: string;
  amountNumeric: string;
  payee: string;
};

export type DonorCandidate = {
  id: string;
  name: string;
};

export type ProcessCheckPayload = {
  fields: CheckFields;
  candidates: DonorCandidate[];
};

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

export function getMockProcessCheckPayload(): ProcessCheckPayload {
  return {
    fields: {
      date: "2024-09-01",
      amountNumeric: "250.00",
      payee: "Community Aid",
    },
    candidates: [
      { id: "donor-001", name: "Alex Johnson" },
      { id: "donor-002", name: "Taylor Smith" },
    ],
  };
}
