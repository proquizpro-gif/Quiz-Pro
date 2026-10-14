/* Tests for exam-day logic outside QAAPF: the exam clock, quiz settings,
   the lockdown checks and the spreadsheet import.  Run: npm test */
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { examClock, remainingAt, quizSettingsProblem } from "../src/lib/exam-logic.js";
import { isSuspiciousShrink, devtoolsLikelyOpen } from "../src/lib/lockdown.js";
import { parseWorkbook, parseCorrectAnswer } from "../src/lib/xlsx-import.js";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; }
  catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
};

const NOW = Date.parse("2026-10-14T10:00:00Z");
const MIN = 60 * 1000;
const quiz = { id: "q1", duration_sec: 40 * 60 };

/* ── Exam clock ─────────────────────────────────────────────────── */
test("a fresh sitting gets the full time", () => {
  const c = examClock({ draft: null, anchor: null, quiz, now: NOW });
  assert.equal(c.fresh, true);
  assert.equal(remainingAt(c.deadline, NOW), 2400);
});

test("closing the tab does not stop the clock (draft keeps its deadline)", () => {
  const draft = { deadline: NOW + 10 * MIN };
  const c = examClock({ draft, anchor: null, quiz, now: NOW + 5 * MIN });   // reopened 5 min later
  assert.equal(c.fresh, false);
  assert.equal(remainingAt(c.deadline, NOW + 5 * MIN), 300);
});

test("drafts saved by the old version keep counting from when they were saved", () => {
  const draft = { remaining: 600, savedAt: NOW };
  const c = examClock({ draft, anchor: null, quiz, now: NOW + 4 * MIN });
  assert.equal(remainingAt(c.deadline, NOW + 4 * MIN), 360);
});

test("another browser picks up the server's clock, not a fresh one", () => {
  const anchor = { status: "abandoned", started_at: new Date(NOW - 15 * MIN).toISOString() };
  const c = examClock({ draft: null, anchor, quiz, now: NOW, attempts: [], userId: "u" });
  assert.equal(c.source, "server");
  assert.equal(remainingAt(c.deadline, NOW), 25 * 60);
});

test("an unfinished sitting that ran out restarts, and says so", () => {
  const anchor = { status: "active", started_at: new Date(NOW - 90 * MIN).toISOString() };
  const c = examClock({ draft: null, anchor, quiz, now: NOW, attempts: [], userId: "u" });
  assert.equal(c.source, "restart");
  assert.equal(c.fresh, true);
});

test("a retake after a submitted attempt starts fresh", () => {
  const anchor = { status: "submitted", started_at: new Date(NOW - 10 * MIN).toISOString() };
  assert.equal(examClock({ draft: null, anchor, quiz, now: NOW }).source, "new");
  // …even if the 'submitted' status never reached the server
  const active = { status: "active", started_at: new Date(NOW - 10 * MIN).toISOString() };
  const attempts = [{ quiz_id: "q1", user_id: "u", submitted_at: new Date(NOW - 2 * MIN).toISOString() }];
  assert.equal(examClock({ draft: null, anchor: active, quiz, attempts, userId: "u", now: NOW }).source, "new");
});

test("remaining time never goes below zero", () => {
  assert.equal(remainingAt(NOW - 5000, NOW), 0);
  assert.equal(remainingAt(NOW + 1500, NOW), 2);
});

/* ── Quiz settings ──────────────────────────────────────────────── */
test("quiz settings that would make a quiz unusable are refused", () => {
  assert.match(quizSettingsProblem({ minutes: 0, maxAttempts: 1 }), /minute/);
  assert.match(quizSettingsProblem({ minutes: "", maxAttempts: 1 }), /minute/);
  assert.match(quizSettingsProblem({ minutes: 20, maxAttempts: 0 }), /attempt/);
  assert.match(quizSettingsProblem({ minutes: 20, maxAttempts: 1, openAt: "2026-10-14T10:00", closeAt: "2026-10-14T09:00" }), /after/);
  assert.equal(quizSettingsProblem({ minutes: 40, maxAttempts: 1, openAt: "2026-10-14T09:00", closeAt: "2026-10-14T11:00" }), null);
});

/* ── Lockdown checks ────────────────────────────────────────────── */
test("entering fullscreen on a 1366×768 laptop is not a violation", () => {
  // windowed page 1366×657 → fullscreen 1366×768 is growth, not shrinkage
  assert.equal(isSuspiciousShrink({ w: 1366, h: 657 }, 1366, 768), false);
});

test("split-screen is a violation; a phone's address bar is not", () => {
  assert.equal(isSuspiciousShrink({ w: 1366, h: 768 }, 683, 768), true);
  assert.equal(isSuspiciousShrink({ w: 390, h: 760 }, 390, 700), false);   // 8% shorter
});

test("developer-tools check measures growth from the settled gap", () => {
  assert.equal(devtoolsLikelyOpen({ w: 0, h: 0 }, 400, 0), true);
  // a zoomed page or a browser side panel starts with a large gap
  assert.equal(devtoolsLikelyOpen({ w: 250, h: 80 }, 260, 80), false);
  assert.equal(devtoolsLikelyOpen({ w: 250, h: 80 }, 250, 400), true);
});

/* ── Spreadsheet import ─────────────────────────────────────────── */
const workbook = rows => {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Q");
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
};
const H = ["subject", "unit", "topic", "question", "optionA", "optionB", "optionC", "optionD", "correct", "difficulty", "points"];

test("an option that is the number 0 is accepted", () => {
  const { rows } = parseWorkbook(workbook([H, ["Apt", "Numbers", "Sub", "What is 5 - 5?", 0, 5, 10, 25, "A", "easy", 1]]), []);
  assert.deepEqual(rows[0].errors, []);
  assert.deepEqual(rows[0].parsed.options, ["0", "5", "10", "25"]);
  assert.equal(rows[0].parsed.correct, 0);
});

test("the same question twice in one file is caught", () => {
  const r = ["Apt", "U", "T", "What is 2+2?", 3, 4, 5, 6, "B", "easy", 1];
  const { rows } = parseWorkbook(workbook([H, r, r]), []);
  assert.deepEqual(rows[0].errors, []);
  assert.match(rows[1].errors.join(), /row 2/);
});

test("identical options and 1-indexed keys are refused, letters accepted", () => {
  const { rows } = parseWorkbook(workbook([H, ["Apt", "U", "T", "Pick one", "x", "x", "y", "z", "A", "easy", 1]]), []);
  assert.match(rows[0].errors.join(), /identical/);
  assert.equal(parseCorrectAnswer("4").value, null);
  assert.equal(parseCorrectAnswer("c").value, 2);
  assert.equal(parseCorrectAnswer("D)").value, 3);
});

console.log(`${passed} app tests passed${process.exitCode ? ", some failed" : ""}.`);
