# QuizPro v4.2 — harder baseline, more reasoning, explanations

15 October 2026, after the trainers' trial. QAAPF bank v4.1: 692 questions.

## What the trainers reported, and what changed

### 1. "It's very easy" → 15% easy, 25% medium, 60% hard

The mix wasn't the only cause. **The difficulty labels were generous**: of
215 questions marked hard, only 58 were. Examples: "100 ÷ (5 × 4) + 3² − 8"
and "which of these is divisible by 4 and 9" were both rated hard.

- **Every question re-rated** on one rule. Easy: one step or recall, under 30 seconds. Medium: two steps or one concept applied. Hard: three or more steps, combined ideas or a trap. 157 ratings changed.
- **59 new hard questions** across all domains, so each domain now has 15–24 genuinely hard ones to draw from.
- **New default mix, "Challenging":** a 48-question paper has 8 easy, 12 medium and 28 hard (17% / 25% / 58%). That's the closest to 15/25/60 that still keeps at least one easy question in each reporting area, so the weakest students still register. All four reporting areas get exactly the same counts, so they stay comparable.
- **Suggested time is now 45 minutes** for 48 questions: about 40 seconds per easy, 50 per medium and 60 per hard question. It's still more than one question a minute.
- **"Balanced" (equal thirds) is still available** in the generator. Compare start and end of term on the same mix; scores from the two aren't comparable. Expect much lower percentages and Q-bands on a challenging paper. That's intended.

### 2. "Some answers are wrong" → all 589 re-solved; no wrong key in the bank

Every question was solved again from scratch, and all 589 keys were correct. One item, F016 ("odd one out: Triangle, Square, Circle, Rectangle"), had two defensible answers. It now reads "Which of these is NOT a polygon?", and old answers to it still score correctly.

The likely source of the wrong answers is **old copies of questions stored in your database before v4**. The app scores against the verified key, but a stale copy could still show or print its old answer. Now:

- The **printed answer key** always uses the verified answer for built-in questions.
- The **Question Bank tab** flags any stale copy with "Out of date — QAAPF → Question bank → Repair".
- Built-in questions show their **ID (e.g. F084)** in the question bank, the item analysis and the printed key, so a trainer can report the exact question.

**Do this once after deploying:** Faculty → QAAPF → Question bank → **Repair**. If trainers still find a wrong answer, send the question ID.

### 3. More reasoning questions, with explanations

- **41 new reasoning questions** in new and existing sub-skills: coding-decoding, blood relations, direction sense, data sufficiency, linear and circular seating, ranking, syllogisms, conditional chains ("only if", contrapositive), clocks, calendars, logic grids and truth-teller puzzles.
- Circular seating uses only "next to" clues, so no left/right convention can be disputed.
- Every puzzle was checked by computer to have exactly one solution.
- **Explanations** on all 110 reasoning questions and every new question (169 in all) appear in three places:
  - the student's answer review, when the quiz shows answers;
  - the QAAPF question bank;
  - the printed answer key.

## Review by your trainers

`QAAPF-4.1-trainer-review.xlsx` lists the 103 new questions (with key and explanation) and the 157 re-rated ones, with columns for trainers to mark. Every new answer was verified by computation (75 checks), but your bank's rule is that two people solve every new item. Send back any question IDs marked wrong or mis-rated.

## Deploy

1. Upload the package to GitHub as before and let Netlify rebuild. The build now runs 31 + 14 tests.
2. QAAPF → Question bank → **Import** the new questions (optional) and **Repair** (recommended).
3. Create a **new** baseline paper. Papers created earlier keep their old composition.

No database change is needed. If STEP6 hasn't been run yet, its instructions in `QUIZPRO_V4.1_AUDIT_NOTES.md` still apply.

---

# v4.3 — review of the 103 new questions, and integration into new papers

## Second-solver review

Each of the 103 questions was solved again from the published bank text, checking: is the key right, is any other option also defensible, is the wording ambiguous, can it be done without a calculator in about a minute, and is the difficulty right?

- **Keys:** all 103 correct.
- **Replaced (new IDs; earlier answers still scored):**
  - **C079 → C083.** The answer had two people walking for 18 hours; now two cars and 5 hours.
  - **E079 → E082.** It needed 1.05⁸ worked out by hand in a no-calculator test; now a doubling-time question you can do mentally.
- **Reworded:**
  - **A084:** "divided by 12, 15 or 20" → "each of".
  - **E072:** savings were called "spending".
  - **F072:** "my grandfather's only son" could be the mother's father, which makes *cousin* defensible. It now reads "my father's father". The old wording is withdrawn from scoring, so nobody who answered it loses or gains a mark.
- **Re-rated hard → medium:** E071, G080, G087, H082, F094 (two-step questions).
- **Clearer explanations:** A084, C081 (now a no-calculator method), G081 (quick check first).

Every domain still has at least 15 hard questions, and answer positions are still exactly even (173 each).

## Integration into baseline papers

New papers already draw on the whole bank. The generator now also **takes questions not used on any of your earlier baseline papers first** (exposure control). Students who sat an earlier paper, or heard about it, don't meet the same questions again, and the reviewed new questions fill the gaps.

- After one earlier paper, a new paper repeats **0 questions on average** (7.7 at random).
- Three successive papers can be fully fresh.
- The spread across sub-skills is kept: at most 2 questions from any one sub-skill per domain.
- The confirmation screen reports how many questions on the new paper were not on any earlier one.

"Same paper for another section" is unchanged and still reuses the exact form, which is what start-versus-end-of-term comparison needs.

## Deploy

Upload the package as before. Then use QAAPF → Question bank → **Repair**, which applies the rewordings to any copies already in your database, and create a new baseline paper.

---

# v4.4 — a real hard tier (bank 4.3)

Trainer feedback: even the questions marked hard were easy. That was true. Many "hard" items were long, but each still used only one standard method.

## New standard

- **Hard** means placement-advanced: TCS NQT Advanced, AMCAT or eLitmus level. A hard question needs an insight, or two ideas combined, and can't be solved with one memorised formula.
- **CAT-level** means CAT/XAT standard. These are the hardest questions in the bank.

## Bank changes

- **81 existing "hard" items re-rated to medium** because they don't meet the new standard.
- **94 new questions**, every answer checked by computation:
  - 32 CAT-level (4 per domain)
  - 59 hard
  - 3 medium
  - Puzzles were brute-forced to confirm a single solution. Syllogisms were model-checked.
- The bank now holds 786 items: 121 easy, 522 medium, 111 hard and 32 CAT-level.

## Default baseline paper

- **40 questions in 45 minutes**:
  - 6 easy (15%)
  - 10 medium (25%)
  - 24 hard (60%), including 4 CAT-level questions
- Questions run from easy to hard, and the 4 CAT-level questions come last (one per reporting area). Very few students should finish them, and the student rules now say so.
- 32- and 48-question papers keep the same proportions. The "balanced" mix never includes CAT-level items.

## What to expect

Scores will be noticeably lower than on earlier papers, and that is intended. Don't compare v4.4 baseline scores directly with earlier papers.

## Deploy

1. Upload the package as before.
2. Go to QAAPF → Question bank and click **Repair**, which updates levels on copies already in your database.
3. Create a **new** baseline paper. Papers you created earlier keep their old questions.

---

# v4.5 — full question-bank audit (bank 4.4)

Problem reported: the bank as a whole held far more easy questions than medium or hard ones, and the labels did not show it.

## Findings

Each of the 786 questions was re-rated against one written rubric (see the `lv` notes at the top of `qaapf-bank.js`).

| | Easy | Medium | Hard | CAT-level |
|---|---|---|---|---|
| As labelled (v4.4) | 121 (15%) | 522 (66%) | 111 (14%) | 32 (4%) |
| Re-rated honestly | 474 (60%) | 249 (32%) | 31 (4%) | 32 (4%) |
| Now, questions in use | 237 (31%) | 273 (36%) | 192 (25%) | 64 (8%) |

## Changes

- **433 labels corrected.** 353 questions moved from medium to easy and 80 from hard to medium. No answer key changed.
- **237 easy questions retired** (`r: 1`). These were below placement level or near-duplicates. They are never put on new papers and are hidden from the bank screen, but attempts that used them still score.
- **217 new questions:** 24 medium, 161 hard and 32 CAT-level. Each answer is recomputed by code, and each puzzle was brute-forced to confirm a single solution.
- **Every domain now has 24 hard and 8 CAT-level questions.** New tests check:
  - the balance in every domain;
  - that retired questions never appear on a paper;
  - that 6 successive papers share no hard question.

## Deploy

1. Upload the package.
2. Go to QAAPF → Question bank and click **Repair**, which updates the difficulty labels on questions already in your database.
3. Create a new baseline paper.

The review workbook is `QAAPF-bank-audit-v4.5.xlsx`.
