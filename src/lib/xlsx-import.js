import * as XLSX from "xlsx";

/* ── Answer-key parsing ───────────────────────────────────────────
   The previous version read the "correct" cell with
     parseInt(cell, 10) || 0
   Any cell that wasn't a plain digit — a letter answer key ("A"/"B"/
   "C"/"D"), a blank cell, "A)" , trailing whitespace — parses to NaN,
   and NaN || 0 is 0. The row imported cleanly with no error, silently
   marked option A correct, and nothing in the UI distinguished it from
   a question whose real answer was A. A bank built from a letter-based
   answer key — the ordinary way anyone writes one by hand — comes in
   with most of its keys wrong and no visible sign of it.

   This parser accepts 0–3, the plainly-meant 1–4, and A–D in either
   case, and refuses anything it can't place with confidence rather
   than guessing. Ambiguous or missing input becomes a visible import
   error instead of a silent default. */
export function parseCorrectAnswer(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { value: null, error: "Correct answer is blank" };

  const letter = s.match(/^([A-Da-d])[).:]?$/);
  if (letter) return { value: "ABCD".indexOf(letter[1].toUpperCase()), error: null };

  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    if (n >= 0 && n <= 3) return { value: n, error: null };
    if (n >= 1 && n <= 4) {
      // The single most common real-world mistake: "1" meant to mean
      // "option A" (1-indexed) landing in a 0-indexed column. Refuse
      // and say exactly what to change it to, rather than silently
      // reinterpreting — a silent reinterpretation here is the same
      // class of bug this parser exists to remove.
      return { value: null, error: `"${s}" looks 1-indexed (A=1,B=2…) — this column is 0-indexed (A=0,B=1…). Change it to ${n - 1}, or use the letter "${"ABCD"[n - 1]}".` };
    }
    return { value: null, error: `"${s}" is out of range — use 0-3 or A-D` };
  }
  return { value: null, error: `"${s}" isn't a recognised answer — use 0, 1, 2, 3 or A, B, C, D` };
}

export function parseWorkbook(data, existing = []) {
  try {
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const existingTexts = new Set((existing || []).map(q => q.question?.trim().toLowerCase()));
    const rows = rawRows.map((r, idx) => {
      const errors = [], notes = [];
      const question   = (r.question   || r.Question   || r.QUESTION   || "").toString().trim();
      const subject    = (r.subject    || r.Subject    || r.SUBJECT    || "").toString().trim();
      const unit       = (r.unit       || r.Unit       || r.UNIT       || "General").toString().trim();
      const topic      = (r.topic      || r.Topic      || r.TOPIC      || "General").toString().trim();
      const optA       = (r.optionA    || r.OptionA    || r.option_a   || r.A || "").toString().trim();
      const optB       = (r.optionB    || r.OptionB    || r.option_b   || r.B || "").toString().trim();
      const optC       = (r.optionC    || r.OptionC    || r.option_c   || r.C || "").toString().trim();
      const optD       = (r.optionD    || r.OptionD    || r.option_d   || r.D || "").toString().trim();
      const { value: correct, error: correctErr } = parseCorrectAnswer(r.correct ?? r.Correct ?? r.CORRECT);
      const points     = parseInt(r.points  ?? r.Points  ?? r.POINTS  ?? 1, 10)  || 1;
      let difficulty   = (r.difficulty || r.Difficulty || r.DIFFICULTY || "medium").toString().trim().toLowerCase();
      if (!["easy","medium","hard"].includes(difficulty)) { notes.push(`difficulty "${difficulty}" defaulted to medium`); difficulty = "medium"; }
      if (!question)  errors.push("Question text is empty");
      if (!optA || !optB || !optC || !optD) errors.push("All 4 options (A–D) required");
      if (correctErr) errors.push(correctErr);
      if (!subject)   notes.push("No subject — recommended");
      const dup = existingTexts.has(question.toLowerCase());
      if (dup)        notes.push("already in bank");
      const parsed = errors.length || dup ? null : { question, subject, unit, topic, difficulty, options: [optA, optB, optC, optD], correct, points };
      return { rowNum: idx + 2, question, parsed, dup, errors, notes };
    }).filter(r => r.question || r.errors.length);
    return { rows };
  } catch (err) { return { error: `Could not parse file: ${err.message}` }; }
}

export function downloadTemplate() {
  const headers = ["subject", "unit", "topic", "question", "optionA", "optionB", "optionC", "optionD", "correct", "difficulty", "points"];
  const examples = [
    ["Marketing Management", "Unit 1", "Introduction", "What is 2+2?", "3", "4", "5", "6", "B", "medium", "1"],
    ["Marketing Management", "Unit 1", "Introduction", "What is 3+3?", "5", "6", "7", "8", "1", "easy",  "1"],
  ];
  const note = ["'correct' accepts a letter (A-D) or a 0-indexed number (A=0,B=1,C=2,D=3). Delete these two example rows before uploading."];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples, [], note]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  XLSX.writeFile(wb, "QuizPro_Question_Template.xlsx");
}
