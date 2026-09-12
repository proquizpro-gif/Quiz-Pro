import * as XLSX from "xlsx";

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
      const correct    = parseInt(r.correct ?? r.Correct ?? r.CORRECT ?? 0, 10) || 0;
      const points     = parseInt(r.points  ?? r.Points  ?? r.POINTS  ?? 1, 10)  || 1;
      let difficulty   = (r.difficulty || r.Difficulty || r.DIFFICULTY || "medium").toString().trim().toLowerCase();
      if (!["easy","medium","hard"].includes(difficulty)) { notes.push(`difficulty "${difficulty}" defaulted to medium`); difficulty = "medium"; }
      if (!question)  errors.push("Question text is empty");
      if (!optA || !optB || !optC || !optD) errors.push("All 4 options (A–D) required");
      if (correct < 0 || correct > 3) errors.push("Correct must be 0–3");
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
  const example = ["Marketing Management", "Unit 1", "Introduction", "What is 2+2?", "3", "4", "5", "6", "1", "medium", "1"];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  XLSX.writeFile(wb, "QuizPro_Question_Template.xlsx");
}
