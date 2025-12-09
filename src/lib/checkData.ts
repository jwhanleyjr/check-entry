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
        payee: { type: "string", description: "Name of the payee" },
      },
      required: ["date", "amountNumeric", "payee"],
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
