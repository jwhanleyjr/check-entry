export type CheckFields = {
  date: string;
  amountNumeric: string;
  payor: string;
};

export type DonorCandidate = {
  id: string;
  name: string;
};

export type ProcessCheckPayload = {
  fields: CheckFields;
  candidates: DonorCandidate[];
};

export function isProcessCheckPayload(value: unknown): value is ProcessCheckPayload {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;
  const fields = obj.fields as Record<string, unknown> | undefined;

  const hasValidFields =
    fields !== undefined &&
    typeof fields.date === "string" &&
    typeof fields.amountNumeric === "string" &&
    typeof fields.payor === "string";

  const candidates = obj.candidates as unknown;
  const hasValidCandidates =
    Array.isArray(candidates) &&
    candidates.every((candidate) => {
      const c = candidate as Record<string, unknown>;
      return typeof c.id === "string" && typeof c.name === "string";
    });

  return hasValidFields && hasValidCandidates;
}

export const processCheckResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        date: { type: "string", description: "Check date in YYYY-MM-DD" },
        amountNumeric: {
          type: "string",
          description: "Numeric amount written on the check (do not include currency symbols)",
        },
        payor: {
          type: "string",
          description: "Name of the payor (the person or organization writing the check)",
        },
      },
      required: ["date", "amountNumeric", "payor"],
    },
    candidates: {
      type: "array",
      description: "Possible donor matches inferred from the check; may be empty if none identified",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string", description: "Unique identifier for the donor" },
          name: { type: "string", description: "Human-readable donor name" },
        },
        required: ["id", "name"],
      },
    },
  },
  required: ["fields", "candidates"],
} as const;
