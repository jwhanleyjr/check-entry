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

function normalizeName(name: string) {
  return name.replace(/[.]/g, " ").replace(/\s+/g, " ").trim();
}

function loosenNameQuery(name: string) {
  const normalized = normalizeName(name);
  const parts = normalized.split(" ");
  if (parts.length < 3) return normalized;

  const filtered = parts.filter((part, index) => {
    const isFirstOrLast = index === 0 || index === parts.length - 1;
    if (isFirstOrLast) return true;
    return part.length > 1; // drop middle initials like "A"
  });

  return filtered.join(" ");
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      "X-API-KEY": BLOOMERANG_API_KEY ?? "",
    },
    cache: "no-store",
  });

  const status = response.status;
  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Bloomerang error ${status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`,
    );
  }

  try {
    return { data: JSON.parse(bodyText), status };
  } catch (error) {
    throw new Error(
      `Bloomerang parse error ${status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ""}`,
    );
  }
}

export type BloomerangQueryAttempt = {
  searchText: string;
  resultCount: number;
  status?: number;
  error?: string;
};

export type BloomerangSearchOutcome = {
  matches: { id: string; name: string }[];
  attempts: BloomerangQueryAttempt[];
  apiBaseUrl: string;
  apiKeyPresent: boolean;
};

export async function searchBloomerangConstituents(
  name: string,
): Promise<BloomerangSearchOutcome> {
  if (!name.trim())
    return {
      matches: [],
      attempts: [
        { searchText: "", resultCount: 0, error: "Empty name skipped" },
      ],
      apiBaseUrl: BLOOMERANG_BASE_URL,
      apiKeyPresent: Boolean(BLOOMERANG_API_KEY?.trim()),
    };
  if (!BLOOMERANG_API_KEY) {
    throw new Error("Missing BLOOMERANG_API_KEY");
  }

  const queries = Array.from(
    new Set(
      [normalizeName(name), loosenNameQuery(name)]
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  const aggregatedResults: BloomerangConstituent[] = [];
  const seenIds = new Set<number>();
  const attempts: BloomerangQueryAttempt[] = [];

  for (const query of queries) {
    const url = `${BLOOMERANG_BASE_URL}/constituents?searchText=${encodeURIComponent(query)}`;
    try {
      const { data, status } = await fetchJson(url);
      const results = Array.isArray(data)
        ? data
        : (data as BloomerangSearchResult).results ?? [];

      for (const person of results) {
        if (typeof person.id !== "number") continue;
        if (seenIds.has(person.id)) continue;
        seenIds.add(person.id);
        aggregatedResults.push(person);
      }

      attempts.push({
        searchText: query,
        resultCount: results.length,
        status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ searchText: query, resultCount: 0, error: message });
    }
  }

  return {
    matches: aggregatedResults.map((person) => ({
      id: String(person.id),
      name: `${formatDisplayName(person)} (ID ${person.id})`,
    })),
    attempts,
    apiBaseUrl: BLOOMERANG_BASE_URL,
    apiKeyPresent: Boolean(BLOOMERANG_API_KEY?.trim()),
  };
}
