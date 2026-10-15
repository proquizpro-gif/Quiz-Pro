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
