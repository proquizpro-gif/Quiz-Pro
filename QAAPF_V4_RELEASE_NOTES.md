# QAAPF v4 — release notes (13 Oct 2026)

QAAPF v4 makes the aptitude baseline safe to run: every question has one verified answer, every score is computed against that answer, and the baseline paper follows a fixed blueprint.

## Before tomorrow's baseline

1. **Deploy this version.** Netlify builds from `src/`. Every build now runs `scripts/verify-bank.mjs` and `scripts/test-qaapf.mjs` first, and stops if either fails.
2. **Faculty → QAAPF → Question bank → Repair.** Old copies of built-in questions in the bank are brought up to the verified version, so every quiz that uses them is corrected.
3. **Create the baseline paper after deploying.** Use QAAPF → Baseline test. A paper created before this update may contain faulty v3 questions. Close it and create a new one.
4. **Same paper for every section.** After creating the first paper, choose *Same paper for another section* for each further section, so the cohort's results are comparable. The form code at the end of the quiz title confirms they match.
5. **Optional:** run `STEP5_optional_qaapf_v4.sql` in Supabase. It adds a `purpose` column so baselines are recognised even if renamed. Without it, keep the "Aptitude Baseline" prefix in the title.

## Decisions built in — change them if your policy differs

- **Calculators:** the baseline instructions say calculators and phones are not allowed. The items use 22/7, estimation and mental arithmetic. The text is in `src/App.jsx` (`Rules`).
- **Answers:** baseline papers default to *never show answers*, so the paper stays usable for other sections and the end-of-term comparison. There is a checkbox in the generator to change this.
- **Cut-points:** Q1–Q6 cut-points are unchanged from v3 and labelled provisional until a faculty standard-setting panel confirms them.
- **Timed race:** the baseline runs faster than one question a minute (48 questions in 40 minutes by default), so speed is part of what it measures. To keep the result readable, every profile separates speed from accuracy (see *Timed race* below). Allow 45 minutes, or 30 minutes for the 32-question paper, if you want less time pressure.

## What changed

### Question bank (`src/lib/qaapf-bank.js`, 589 items)

- The 39 faulty v3 items are listed in the appendix: wrong keys, no correct option, two correct options, self-contradictory, ambiguous, or dependent on another question. All are corrected or retired.
- Stable item IDs (A001…H077). Answer keys are spread evenly across A–D (151/146/146/146). In v3, 96% of keys were option A.
- 24 new items closing the PIAAC gaps:
  - Measurement & Geometry (Domain H)
  - Probability & Chance (Domain G)
- Solution hints in stems were removed. Raw markup (`^`, `overline`) was replaced with proper symbols.
- 12 easy items per domain (16 in G and H), so the floor of weak cohorts is measured.

### Scoring (`src/lib/qaapf-core.js`)

- **Verified keys.** Built-in questions are scored against the verified bank by answer text, never against the key stored in a bank row or an attempt. Stale database copies, past attempts and tampered submissions cannot move a QAAPF score.
- **Faulty items are void.** Faulty v3 versions are withdrawn from every score in which they appear (`QAAPF_LEGACY`). No student gains or loses from them.
- **Headline score.** It is the percentage correct on the baseline paper, with a 95% likely range. Difficulty weighting was removed: the hand-set weights had no empirical basis. Difficulty is reported as its own axis (profile and ceiling).
- **Four reporting areas**, each combining two domains: 12 items each on the default 48-question paper, 8 on the 32-question paper. Group decisions use these; the 8 single domains are indicative.
  - Number & Commercial Arithmetic
  - Patterns & Algebra
  - Data & Applied Reasoning
  - Reasoning & Problem Solving
- **Confidence signals:**
  - A binomial test against guessing.
  - Answers given in under 5 seconds, from per-question timing.
  - Proctoring flags and auto-submits.

### Baseline paper

- Fixed blueprint with two paper lengths, both timed as a race against the clock:

  | Paper | Per domain | Suggested time | Pace | Likely range at 50% |
  |---|---|---|---|---|
  | **48 questions (default)** | 2 easy · 2 medium · 2 hard | 40 min | 1.2 a minute (50 s each) | ±14 points |
  | 32 questions | 1 easy · 2 medium · 1 hard | 30 min | 1.07 a minute (56 s each) | ±17 points |

  - The generator offers 30 / 35 / 40 / 45-minute presets and shows the pace. It warns when the pace is below 45 seconds a question (for example 48 questions in 30 minutes), and when it falls below one question a minute (no longer a race).
  - Sub-skills are spread within each domain.
- Questions run easy → medium → hard, shuffled within each block. Options are shuffled per student with an unbiased shuffle.
- One baseline definition across Results, Student profiles, Heatmap, Accreditation and the student's own view: attempts on baseline papers. A toggle shows all quizzes instead.

### Timed race

- **Instructions.** Students are told the pace up front ("about 50 seconds each"). They are told to mark a question for review and move on if it takes more than a minute. With no negative marking, they should answer any remaining questions rather than leave them blank when time is short.
- **Pace marker.** During a baseline paper, students see whether they are on pace, ahead or behind.
- **Not reached vs skipped.** A question left blank and never looked at (under 3 seconds on screen) is *not reached*. It still scores zero, because the paper is timed. It does not count as a skipped question in the confidence rating, and it is left out of the difficulty profile, so a slow but able student is not read as unable to do hard questions.
- **Speed and accuracy.** Each profile reports how much of the paper was reached and the accuracy on questions attempted, with an indicative label and a teaching suggestion:
  - Quick and accurate
  - Accurate but slow
  - Quick but error-prone
  - Slow and error-prone
- **End-of-time guesses.** Quick answers given after a student's last worked answer are reported but do not lower confidence. Rapid answers scattered through the paper still do.

### Exam

- The saved draft holds question IDs and option orders only, never question text or answer keys.
- Time per question, display position and option order are recorded with each answer.
- Baseline instructions:
  - No negative marking — attempt everything.
  - Rough work allowed; no calculators.
  - Diagnostic, not graded.
- The result screen says *Baseline recorded* (no pass/fail, no rank). Old attempts are shown re-keyed, with faulty items marked as withdrawn.

### Accreditation module

- Attempts are re-keyed before any statistic is computed. The scope defaults to *All baseline papers*.
- **Bands:** intervention bands are aligned to the Q-level cut-points. They were misaligned in v3: "Proficient" meant 60–74 in one view and 61–75 in the other.
- **Item analysis:**
  - Corrected item–rest correlation.
  - A *Check key* flag when the top group prefers a distractor.
  - Items are analysed by bank ID across sections.
- **Reliability** states whether the sample size makes α stable, indicative or very unstable.
- **Progress** counts a change only when it exceeds measurement error.

## Still to do after the first cohort

1. **Rasch calibration.** Calibrate items once each has about 200 responses. This gives scores comparable across papers, with their own standard errors.
2. **Standard setting.** Hold a faculty panel (modified Angoff or Bookmark) to confirm the Q1–Q6 cut-points, and write can-do descriptors from the item map.
3. **Server-side scoring.** Move scoring to a Supabase function, and stop sending the `correct` column to student browsers.
4. **Secure baseline pool.** Keep baseline items separate from items used for practice.
5. **Fairness check.** Run a DIF check by gender and medium of instruction.

## Testing

- `npm test` runs 28 tests of the scoring core, including the timed-race rules.
- `npm run verify:bank` runs the structural checks on the bank.
- All 1,093 earlier published item versions (528 deployed + 565 uploaded at the repo root) were replayed through the v4 scorer with 0 failures:
  - 1,063 scored against the verified answer.
  - 30 withdrawn.
- A browser-level harness (jsdom) exercised 68 checks with no console errors. These cover the generator, the Results, Profiles, Heatmap, Question bank, Accreditation and Framework tabs, the exam, the result screen and the student dashboard.

## Appendix — v3 faults and their v4 treatment

| Dom. | v3 question | v3 key | Correct answer / problem | Fault | v4 treatment |
|---|---|---|---|---|---|
| A | What is the place value of 7 in 4,72,893? | Thousands | Ten-thousands (7 is in the ten-thousands place of 4,72,893) | Wrong key | Re-keyed → A001 |
| A | Solve: 18 ÷ 3 + 4 × 2 − 5 | 11 | 9 | Wrong key | Re-keyed → A007 |
| C | If x = 3² + 4 and y = 2³ + 5, which is greater? | x | Equal (both are 13) | Wrong key | Re-keyed → C009 |
| D | The cost of 2 pens and 3 books is ₹340; 3 pens and 2 books cost ₹310.… | ₹100 | ₹80 (pen ₹50, book ₹80) | Wrong key | Re-keyed → D016 |
| E | Population grew from 5 lakh to 6.05 lakh in 2 years. Annual growth ra… | 5% | 10% (1.1² = 1.21) | Wrong key | Re-keyed → E007 |
| F | 3 boxes contain only apples, only oranges, or both. All labels are wr… | Apples=both, Oranges=apples | Box labelled Apples holds oranges; box labelled Oranges holds both | Wrong key | Old version withdrawn; replaced by F009 |
| G | Test scores: 45,60,55,70,65,80,50. The median score: | 65 | 60 | Wrong key | Re-keyed → G005 |
| B | A trader mixes 26 kg rice at ₹20 with 30 kg at ₹36 and sells at ₹30/k… | ~4.2% | 5% (cost ₹1,600, revenue ₹1,680) | Wrong key | Re-keyed → B063 |
| B | A sum of ₹2,600 is split so SI at 10% on one part for 5 years equals … | ₹1,400 | ₹1,350 (parts ₹1,350 and ₹1,250) | Wrong key | Re-keyed → B066 |
| D | How many integers satisfy -3 < 2x + 1 ≤ 7? | 3 | 5 (x = −1, 0, 1, 2, 3) | Wrong key | Re-keyed → D041 |
| G | Plan A: ₹200 flat. Plan B: ₹50 + ₹3/unit. At 40 units, cheaper plan: | Plan A | Plan B (₹170 vs ₹200) | Wrong key | Re-keyed → G033 |
| G | Option A yields ₹8,000 certain. Option B yields ₹20,000 with 40% chan… | A | Equal (both have expected value ₹8,000) | Wrong key | Re-keyed → G053 |
| A | What is the smallest number that must be added to 4,321 to make it di… | 5 | 8 (4,321 + 8 = 4,329) | No correct option | Old version withdrawn; fixed as A018 |
| H | A cistern is filled by pipe A in 6 hrs and B in 9 hrs. Pipe C empties… | 36/5 hrs | 36/7 hrs ≈ 5.14 hrs | No correct option | Old version withdrawn; fixed as H001 |
| H | Two trains 150m and 200m long run in opposite directions at 60 and 90… | 10 sec | 8.4 s | No correct option | Old version withdrawn; replaced by H003 |
| A | The sum of digits of the smallest 4-digit number divisible by 88 is: | 9 | 12 (1,056) | No correct option | Old version withdrawn; fixed as A072 |
| A | How many numbers between 100 and 400 are divisible by 7 but not 3? | 29 | 28 | No correct option | Old version withdrawn; fixed as A073 |
| B | ₹782 is divided among A, B, C such that A:B = 2:3 and B:C = 4:5. B's … | ₹276 | ₹268.11 — total isn't divisible by 35 | No correct option | Old version withdrawn; replaced by B071 |
| F | If in a code TABLE = 20+1+2+12+5 = 40, then CHAIR equals: | 44 | 39 | No correct option | Old version withdrawn; fixed as F054 |
| H | 40 L of a 3:2 milk:water mix. How much mixture to remove and replace … | 10 L | 20 L | No correct option | Old version withdrawn; fixed as H043 |
| H | 5 men or 8 women finish a job in 12 days. Time for 3 men and 4 women … | 120/17 days | 120/11 days ≈ 10.9 | No correct option | Old version withdrawn; fixed as H053 |
| B | Two numbers are in ratio 5:7. If 9 is added to each, the ratio become… | 45 | Only solution is negative (−45, −63); 'subtracted' was intended | Inconsistent stem | Old version withdrawn; replaced by B031 |
| C | If 6 * 2 = 40 and 8 * 3 = 55, then 9 * 4 = ? (a*b = a²+b×2) | 89 | Stated rule gives 8*3 = 70, not 55; rule printed in the stem | Inconsistent stem | Old version withdrawn; replaced by C058 |
| C | If FACE = 21 (letter positions summed) then HEAD = ? | 22 | FACE sums to 15, not 21; HEAD = 18 | Inconsistent stem | Old version withdrawn; replaced by C069 |
| D | x + y + z = 6, x + 2y + 3z = 14, x + 3y + 5z = 22. Find z. | 4 | Equations are dependent — every option satisfies them | Inconsistent stem | Old version withdrawn; replaced by D051 |
| A | 0.125 × 0.04 = ? | 0.005 | '0.0050' and '0.005' are equal | Two right options | Old version withdrawn; fixed as A014 |
| A | If a number is divisible by both 6 and 8, it must be divisible by: | 24 | 24 and 12 both must divide | Two right options | Old version withdrawn; fixed as A021 |
| E | Using the same data, which quarter contributed closest to 25% of annu… | Q3 | Q2 and Q3 tie (both 1.5 from 16.5); also refers to 'the same data' | Two right options | Old version withdrawn; replaced by E011 |
| E | Four outlets report revenue 500/600/450/700 and costs 300/420/270/560… | Outlet 3 | Outlet 1 and Outlet 3 both have 40% margin | Two right options | Old version withdrawn; replaced by E023 |
| A | If 1.5x = 0.04y, then x/y equals: | 4/150 | 4/150 = 2/75 | Two right options | Old version withdrawn; fixed as A067 |
| A | 0.overline{3} + 0.overline{6} (recurring) equals: | 1 | 1 = 0.999…; stem shows raw 'overline' markup | Two right options | Old version withdrawn; replaced by A076 |
| B | If A:B = 3:4 and B:C = 6:5, then A:B:C is: | 9:12:10 | 9:12:10 = 18:24:20 | Two right options | Old version withdrawn; fixed as B050 |
| D | Factorise 2x² - 8: | 2(x-2)(x+2) | All four options equal 2x² − 8 | Two right options | Old version withdrawn; replaced by D043 |
| G | An investment returns 15% while inflation is 6%. Approx real return: | 9% | 9% (rule of thumb) and 8.5% (exact) both defensible | Two right options | Old version withdrawn; fixed as G047 |
| G | Scores 40,50,60,70,80. The variance is: | 200 | 200 (population) and 250 (sample) variance | Two right options | Old version withdrawn; replaced by G056 |
| F | Five books are stacked. A is above B, C is below B, D is at the top. … | 2nd | Five books but four named — A can be 2nd or 3rd | Ambiguous | Old version withdrawn; replaced by F014 |
| F | Odd one out: 2, 3, 6, 7, 8, 14 | 7 | No rule makes 7 the unique odd one; 8 breaks +1/×2 series | Ambiguous | Old version withdrawn; item retired |
| E | In the same table, which day had below-average sales? | Tuesday and Thursday | 'In the same table…' — parent item may not be drawn; order is shuffled | Depends on another item | Old version withdrawn; replaced by E002 |
| E | Using the same output data, the percentage rise from March to April is: | 100% | 'Using the same output data…' | Depends on another item | Old version withdrawn; replaced by E014 |
