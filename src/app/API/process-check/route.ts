export async function POST() {
  // Placeholder: returns empty fields/candidates so UI works
  return Response.json({ fields: { date: "", amountNumeric: "", payee: "" }, candidates: [] });
}
