import { getMockProcessCheckPayload } from "@/lib";

export async function POST() {
  // Placeholder: returns mock fields/candidates so UI works
  return Response.json(getMockProcessCheckPayload());
}
