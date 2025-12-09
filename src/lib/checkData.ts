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
