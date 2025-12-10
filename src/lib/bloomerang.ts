export type BloomerangConstituent = {
  id: number;
  firstName?: string;
  lastName?: string;
  householdName?: string;
  displayName?: string;
};

export type BloomerangSearchResult = {
  results?: BloomerangConstituent[];
};

const BLOOMERANG_API_KEY = process.env.BLOOMERANG_API_KEY;
const BLOOMERANG_BASE_URL =
  process.env.BLOOMERANG_BASE_URL ?? "https://api.bloomerang.co/v2";

function formatDisplayName(person: BloomerangConstituent) {
  const parts = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return parts || person.householdName || person.displayName || "Unknown";
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      "X-API-KEY": BLOOMERANG_API_KEY ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Bloomerang error ${response.status}`);
  }

  return response.json();
}

export async function searchBloomerangConstituents(name: string) {
  if (!name.trim()) return [];
  if (!BLOOMERANG_API_KEY) {
    throw new Error("Missing BLOOMERANG_API_KEY");
  }

  const url = `${BLOOMERANG_BASE_URL}/constituents?searchText=${encodeURIComponent(name)}`;
  const json = (await fetchJson(url)) as BloomerangSearchResult | BloomerangConstituent[];
  const results = Array.isArray(json) ? json : json.results ?? [];

  return results
    .filter((person) => typeof person.id === "number")
    .map((person) => ({
      id: String(person.id),
      name: `${formatDisplayName(person)} (ID ${person.id})`,
    }));
}
