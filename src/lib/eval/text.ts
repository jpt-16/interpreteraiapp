/**
 * Language-aware text utilities for the heuristic evaluator:
 * normalisation, tokenisation, spelled-out number parsing (EN/ES) and
 * concept-cue matching. Pure functions, usable on client and server.
 */

export function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface Token {
  text: string;
  /** Numeric interpretations, if the token is (or stands for) a number. */
  nums?: number[];
}

const RAW_TOKEN = /[a-zñ]+\d*|\d+(?:[.,:]\d+)*|%/g;

const EN_SMALL: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const EN_ORDINAL: Record<string, number> = {
  first: 1, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
  seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};
const ES_SMALL: Record<string, number> = {
  cero: 0, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
  noventa: 90, primero: 1,
};
const ES_HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600,
  seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};
const SCALES: Record<string, number> = {
  thousand: 1e3, mil: 1e3, million: 1e6, millions: 1e6, millon: 1e6, millones: 1e6,
  billion: 1e9, k: 1e3,
};
const ARTICLE_ONES = new Set(["a", "an", "un", "una"]);
const CONNECTORS = new Set(["and", "y"]);
const DECIMAL_WORDS = new Set(["point", "coma", "punto"]);

type L = "en" | "es" | undefined;

function smallValue(w: string, lang?: L): number | undefined {
  if (lang !== "es") {
    if (w in EN_SMALL) return EN_SMALL[w];
    if (w in EN_ORDINAL) return EN_ORDINAL[w];
  }
  if (lang !== "en" && w in ES_SMALL) return ES_SMALL[w];
  return undefined;
}

function isNumberWord(w: string, lang?: L) {
  return (
    smallValue(w, lang) !== undefined ||
    (lang !== "en" && w in ES_HUNDREDS) ||
    (lang !== "es" && (w === "hundred" || w === "hundreds")) ||
    w in SCALES
  );
}

/** Interpret a digit token with optional separators, returning plausible values. */
export function digitCandidates(raw: string): number[] {
  if (raw.includes(":")) {
    const [h, m] = raw.split(":");
    return [Number(h) + Number(m.slice(0, 2)) / 100];
  }
  const seps = raw.match(/[.,]/g);
  if (!seps) return [Number(raw)];
  const out = new Set<number>();
  // all separators as thousands separators
  out.add(Number(raw.replace(/[.,]/g, "")));
  // last separator as decimal point
  const idx = Math.max(raw.lastIndexOf("."), raw.lastIndexOf(","));
  const intPart = raw.slice(0, idx).replace(/[.,]/g, "");
  out.add(Number(`${intPart}.${raw.slice(idx + 1)}`));
  return [...out].filter((n) => Number.isFinite(n));
}

/**
 * Tokenise and normalise a text. Spelled-out numbers (EN/ES) are merged into
 * numeric tokens, digit tokens are interpreted, and scale words multiply.
 */
export function tokenize(input: string, lang?: L): Token[] {
  const s = stripAccents(input.toLowerCase());
  const raw = s.match(RAW_TOKEN) ?? [];
  const out: Token[] = [];
  let i = 0;
  while (i < raw.length) {
    const w = raw[i];
    // digit token
    if (/^\d/.test(w)) {
      let nums = digitCandidates(w);
      const next = raw[i + 1];
      if (next && next in SCALES) {
        nums = nums.flatMap((n) => [n, n * SCALES[next]]);
        out.push({ text: w, nums });
        i += 2;
        continue;
      }
      out.push({ text: w, nums });
      i++;
      continue;
    }
    // article used as "one" before a scale word: "a hundred", "un millón"
    // "por ciento" / "cien por cien" are percentage markers, not numbers
    if ((w === "ciento" || w === "cien") && raw[i - 1] === "por") {
      out.push({ text: w });
      i++;
      continue;
    }
    const startsNumber =
      isNumberWord(w, lang) || (ARTICLE_ONES.has(w) && raw[i + 1] !== undefined && (raw[i + 1] === "hundred" || raw[i + 1] in SCALES));
    if (!startsNumber || (w in SCALES && w !== "mil")) {
      out.push({ text: w });
      i++;
      continue;
    }
    // parse a spelled number
    let total = 0;
    let current = 0;
    let consumed = 0;
    let j = i;
    let lastSmall = -1;
    while (j < raw.length) {
      const t = raw[j];
      if (ARTICLE_ONES.has(t) && j === i) {
        current = 1;
        j++;
        consumed++;
        continue;
      }
      if (CONNECTORS.has(t) && j > i && raw[j + 1] && isNumberWord(raw[j + 1], lang)) {
        j++;
        consumed++;
        continue;
      }
      const sv = smallValue(t, lang);
      if (sv !== undefined) {
        // two adjacent unit words ("dos tres") are separate numbers
        if (lastSmall >= 0 && !(lastSmall >= 20 && lastSmall % 10 === 0 && sv < 10)) break;
        current += sv;
        lastSmall = sv;
        j++;
        consumed++;
        continue;
      }
      if (t in ES_HUNDREDS) {
        current += ES_HUNDREDS[t];
        lastSmall = -1;
        j++;
        consumed++;
        continue;
      }
      if (t === "hundred" || t === "hundreds") {
        current = (current || 1) * 100;
        lastSmall = -1;
        j++;
        consumed++;
        continue;
      }
      if (t in SCALES) {
        total += (current || 1) * SCALES[t];
        current = 0;
        lastSmall = -1;
        j++;
        consumed++;
        continue;
      }
      break;
    }
    let value = total + current;
    // decimals: "three point one two five", "cuarenta y ocho coma seis millones"
    if (raw[j] && DECIMAL_WORDS.has(raw[j])) {
      let digits = "";
      let k = j + 1;
      while (k < raw.length) {
        const dv = smallValue(raw[k], lang);
        if (dv !== undefined) {
          digits += String(dv);
          k++;
        } else if (/^\d+$/.test(raw[k])) {
          digits += raw[k];
          k++;
        } else break;
      }
      if (digits) {
        value = Number(`${value}.${digits}`);
        consumed += k - j;
        j = k;
        if (raw[j] && raw[j] in SCALES) {
          value *= SCALES[raw[j]];
          consumed++;
          j++;
        }
      }
    }
    if (consumed === 0) {
      out.push({ text: w });
      i++;
      continue;
    }
    out.push({ text: raw.slice(i, i + consumed).join(" "), nums: [value] });
    i += consumed;
  }
  return out;
}

export function numbersIn(tokens: Token[]): number[] {
  return tokens.flatMap((t) => t.nums ?? []);
}

/** Numbers as they occur, one entry per numeric token. */
export function numberMentions(tokens: Token[]) {
  const mentions: { text: string; nums: number[] }[] = [];
  tokens.forEach((t, idx) => {
    if (!t.nums) return;
    // "10 30" spoken time → also offer 10.30
    const next = tokens[idx + 1];
    const nums = [...t.nums];
    if (next?.nums && t.nums[0] <= 24 && next.nums[0] < 60 && Number.isInteger(t.nums[0]) && Number.isInteger(next.nums[0])) {
      nums.push(t.nums[0] + next.nums[0] / 100);
    }
    mentions.push({ text: t.text, nums });
  });
  return mentions;
}

export function approxEqual(a: number, b: number) {
  if (a === b) return true;
  const tol = Math.max(Math.abs(b) * 1e-6, 1e-9);
  return Math.abs(a - b) <= tol;
}

function stemMatches(stem: string, tokens: Token[]): boolean {
  if (/^\d/.test(stem)) {
    const v = Number(stem);
    return tokens.some((t) => t.nums?.some((n) => approxEqual(n, v)) || t.text === stem);
  }
  if (stem.length <= 2 || stem === "%") return tokens.some((t) => t.text === stem);
  return tokens.some((t) => t.text.split(" ").some((part) => part.startsWith(stem)));
}

/**
 * Score how well a cue expression is satisfied by the tokens.
 * Returns the best fraction of stems matched among alternatives (0..1),
 * or null if the cue expression is empty.
 */
export function cueScore(cues: string, tokens: Token[]): number | null {
  const alts = cues
    .split("|")
    .map((a) => stripAccents(a.toLowerCase()).trim())
    .filter(Boolean);
  if (!alts.length) return null;
  let best = 0;
  for (const alt of alts) {
    const stems = alt.split(/\s+/).filter(Boolean);
    const hit = stems.filter((st) => stemMatches(st, tokens)).length;
    best = Math.max(best, hit / stems.length);
    if (best === 1) break;
  }
  return best;
}

export function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

const FILLERS = new Set(["um", "umm", "uh", "uhm", "er", "erm", "ah", "hmm", "mm", "mmm", "eh", "em", "ehm", "ehh"]);
const MULTI_FILLERS = ["you know", "o sea", "es decir que", "like like"];
const CORRECTIONS = ["i mean", "sorry", "correction", "rather", "perdon", "digo", "mejor dicho", "quiero decir"];

export function fluencyStats(transcript: string, durationSec: number | null) {
  const lower = stripAccents(transcript.toLowerCase());
  const words = lower.match(/[a-zñ']+|\d+/g) ?? [];
  let fillers = words.filter((w) => FILLERS.has(w)).length;
  for (const f of MULTI_FILLERS) fillers += lower.split(f).length - 1;
  let restarts = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 2 && !/^\d+$/.test(words[i])) restarts++;
  }
  for (const c of CORRECTIONS) restarts += (lower.match(new RegExp(`\\b${c}\\b`, "g")) ?? []).length;
  const wpm = durationSec && durationSec > 3 ? Math.round(words.length / (durationSec / 60)) : null;
  return { words: words.length, fillers, restarts, wpm };
}
