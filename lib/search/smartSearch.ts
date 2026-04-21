const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};

function translitToLatin(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");
}

export function normalizeSearch(input: string): string {
  return translitToLatin(
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function splitTerms(input: string): string[] {
  return normalizeSearch(input)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function trigrams(value: string): Set<string> {
  const cleaned = `  ${normalizeSearch(value)}  `;
  const out = new Set<string>();
  for (let i = 0; i < cleaned.length - 2; i += 1) {
    out.add(cleaned.slice(i, i + 3));
  }
  return out;
}

function trigramSimilarity(a: string, b: string): number {
  const aSet = trigrams(a);
  const bSet = trigrams(b);
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let intersect = 0;
  aSet.forEach((item) => {
    if (bSet.has(item)) intersect += 1;
  });
  return (2 * intersect) / (aSet.size + bSet.size);
}

export interface SearchMatchDiagnostics {
  score: number;
  reasons: Array<"exact" | "prefix" | "contains" | "fuzzy" | "trigram" | "token">;
}

export function analyzeMatch(query: string, target: string): SearchMatchDiagnostics {
  const q = normalizeSearch(query);
  const t = normalizeSearch(target);
  if (!q || !t) return { score: 0, reasons: [] };

  const reasons: SearchMatchDiagnostics["reasons"] = [];
  let score = 0;

  if (q === t) {
    return { score: 150, reasons: ["exact"] };
  }

  if (t.startsWith(q)) {
    score += 110;
    reasons.push("prefix");
  } else if (t.includes(q)) {
    score += 90;
    reasons.push("contains");
  }

  const qTerms = splitTerms(q);
  const tTerms = splitTerms(t);
  const tokenHits = qTerms.filter((term) =>
    tTerms.some((targetTerm) => targetTerm === term || targetTerm.startsWith(term))
  );
  if (tokenHits.length > 0) {
    score += 20 + tokenHits.length * 8;
    reasons.push("token");
  }

  const fuzzyDistance = levenshtein(q, t.slice(0, Math.max(2, q.length + 2)));
  if (fuzzyDistance <= 1) {
    score += 60;
    reasons.push("fuzzy");
  } else if (fuzzyDistance <= 2) {
    score += 35;
    reasons.push("fuzzy");
  } else if (fuzzyDistance <= 3) {
    score += 15;
    reasons.push("fuzzy");
  }

  const tri = trigramSimilarity(q, t);
  if (tri >= 0.3) {
    score += Math.round(tri * 40);
    reasons.push("trigram");
  }

  return {
    score,
    reasons
  };
}

export function scoreMatch(query: string, target: string): number {
  return analyzeMatch(query, target).score;
}

export function rankByQuery<T>(
  query: string,
  items: T[],
  textExtractor: (item: T) => string
): Array<{ item: T; score: number; reasons: SearchMatchDiagnostics["reasons"] }> {
  return items
    .map((item) => {
      const diagnostics = analyzeMatch(query, textExtractor(item));
      return {
        item,
        score: diagnostics.score,
        reasons: diagnostics.reasons
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
