export const ALPHABET = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
export function cleanText(text) { return String(text ?? "").toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, ""); }

export function buildMatrix(key = "") {
  const cleanedKey = cleanText(key);
  const chars = [...new Set(cleanedKey + ALPHABET)];
  const keyLetters = new Set(cleanedKey);
  return chars.map((ch, i) => ({ ch, row: Math.floor(i / 5), col: i % 5, fromKey: keyLetters.has(ch) }));
}

export function preparePairs(text, mode) {
  const s = cleanText(text), pairs = [];
  if (mode === "decrypt") {
    for (let i = 0; i < s.length; i += 2) {
      const odd = i + 1 >= s.length;
      pairs.push({ a: s[i], b: odd ? "X" : s[i + 1], inserted: odd ? ["b"] : [], reason: odd ? "missing ciphertext partner; X shown for the walkthrough" : "", invalid: odd });
    }
    return pairs;
  }
  let i = 0;
  while (i < s.length) {
    const a = s[i], b = s[i + 1];
    if (b === undefined) { pairs.push({ a, b: "X", inserted: ["b"], reason: "padding" }); i += 1; }
    else if (a === b) {
      const filler = a === "X" ? "Q" : "X";
      pairs.push({ a, b: filler, inserted: ["b"], reason: a === "X" ? "XX pair — Q used to separate" : "repeated letter" }); i += 1;
    } else { pairs.push({ a, b, inserted: [], reason: "" }); i += 2; }
  }
  return pairs;
}

export function processPair(pair, matrix, mode) {
  const pos = ch => matrix.find(c => c.ch === ch), at = (r, c) => matrix.find(x => x.row === r && x.col === c);
  const A = pos(pair.a), B = pos(pair.b), d = mode === "encrypt" ? 1 : -1, wrap = n => (n + 5) % 5;
  let rule, outA, outB;
  if (A.row === B.row) { rule = "row"; outA = at(A.row, wrap(A.col + d)); outB = at(B.row, wrap(B.col + d)); }
  else if (A.col === B.col) { rule = "column"; outA = at(wrap(A.row + d), A.col); outB = at(wrap(B.row + d), B.col); }
  else { rule = "rectangle"; outA = at(A.row, B.col); outB = at(B.row, A.col); }
  return { ...pair, rule, A, B, outA, outB, result: outA.ch + outB.ch };
}

export function run(key, message, mode, maxPairs = 40) {
  const matrix = buildMatrix(key), pairs = preparePairs(message, mode), allSteps = pairs.map(p => processPair(p, matrix, mode));
  return { matrix, pairs, steps: allSteps.slice(0, maxPairs), output: allSteps.map(s => s.result).join(""), truncated: pairs.length > maxPairs };
}
