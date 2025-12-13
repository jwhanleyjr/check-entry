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

function expandNameQueries(name: string) {
  const normalized = normalizeName(name);
  if (!normalized) return [] as string[];

  const parts = normalized.split(" ").filter(Boolean);
  const first = parts[0];
  const last = parts.at(-1);
  const hasMultiPartName = parts.length > 1;

  const queries = [normalized];

  const loosened = loosenNameQuery(name);
  if (loosened && loosened !== normalized) queries.push(loosened);

  if (hasMultiPartName && first && last) {
    const commaVariant = `${last}, ${first}`;
    if (commaVariant !== normalized && commaVariant !== loosened) {
      queries.push(commaVariant);
    }

    if (last !== normalized && last !== loosened) {
      queries.push(last);
    }

    if (first !== normalized && first !== loosened && first !== last) {
      queries.push(first);
    }
  }

  return queries;
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
  url?: string;
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

type BloomerangQuery = {
  label: string;
  url: string;
};

function buildBaseSearchUrl() {
  const trimmedBase = BLOOMERANG_BASE_URL.replace(/\/$/, "");
  return new URL(`${trimmedBase}/constituents/search`);
}

function buildSearchUrl(params: Record<string, string>) {
  const url = buildBaseSearchUrl();
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildSearchQueries(name: string): BloomerangQuery[] {
  const queries: BloomerangQuery[] = [];

  for (const query of Array.from(
    new Set(
      expandNameQueries(name)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )) {
    queries.push({
      label: query,
      url: buildSearchUrl({ searchText: query }),
    });
  }

  const parts = normalizeName(name)
    .split(" ")
    .filter(Boolean);
  if (parts.length >= 2) {
    const firstName = parts[0];
    const lastName = parts.at(-1);
    if (firstName && lastName) {
      queries.push({
        label: `firstName=${firstName} lastName=${lastName}`,
        url: buildSearchUrl({
          searchFirstName: firstName,
          searchLastName: lastName,
        }),
      });
    }
  }

  const seenUrls = new Set<string>();
  const deduped: BloomerangQuery[] = [];
  for (const query of queries) {
    if (seenUrls.has(query.url)) continue;
    seenUrls.add(query.url);
    deduped.push(query);
  }

  return deduped;
}

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

  const aggregatedResults: BloomerangConstituent[] = [];
  const seenIds = new Set<number>();
  const attempts: BloomerangQueryAttempt[] = [];

  const queries = buildSearchQueries(name);

  for (const { label, url } of queries) {
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
        searchText: label,
        url,
        resultCount: results.length,
        status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      attempts.push({ searchText: label, url, resultCount: 0, error: message });
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
